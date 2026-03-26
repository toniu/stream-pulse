"""
pyAux - Spotify Playlist Analyser
Enterprise-grade Flask web application with proper architecture

Author: pyAux Team
Version: 2.0.0
"""

import os
import requests
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from flask_cors import CORS

from config import get_config
from logger import setup_logging, get_logger
from error_handlers import register_error_handlers
from middleware import setup_security, rate_limit
from services import SpotifyService, AnalysisService, FlowService

# Initialize logger
logger = get_logger(__name__)

# Flask application factory
def create_app(config_name=None):
    app = Flask(__name__)
    
    # Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)
    
    # Setup logging
    setup_logging(app)
    logger.info(f"Starting pyAux in {config_name or 'development'} mode")
    
    # Setup CORS
    CORS(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}})
    
    # Setup security middleware
    setup_security(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Initialize services
    spotify_service = SpotifyService(
        app.config['SPOTIFY_CLIENT_ID'],
        app.config['SPOTIFY_CLIENT_SECRET']
    )
    
    # Register routes
    register_routes(app, spotify_service)

    # Ensure session secret
    app.secret_key = app.config.get('SECRET_KEY')
    
    # Disable caching in development mode for live reload
    if app.config['DEBUG']:
        @app.after_request
        def disable_cache(response):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'pyAux',
            'version': '2.0.0'
        }), 200
    
    logger.info("Application initialized successfully")
    return app


def register_routes(app, spotify_service):
    """Register all application routes"""

    @app.route('/static/images/<path:filename>')
    def static_images_legacy(filename):
        import os
        images_dir = os.path.join(app.static_folder, 'images')
        target_path = os.path.join(images_dir, filename)
        if os.path.exists(target_path):
            return send_from_directory(images_dir, filename)
        return redirect(url_for('static', filename='favicon.ico'))
    
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/demo/timeline')
    def demo_timeline():
        return render_template('demo_timeline.html')
    
    @app.route('/results')
    def results():
        return render_template('results.html')
    
    # -----------------------
    # ANALYZE FLOW ENDPOINT
    # -----------------------
    @app.route('/api/v1/analyze-flow', methods=['POST'])
    @rate_limit
    def analyze_flow():
        try:
            data = request.get_json()
            if not data:
                raise ValueError("Request body must be JSON")

            playlist_url = data.get('playlist_url', '').strip()
            if not playlist_url:
                raise ValueError("Playlist URL is required")
            if not spotify_service.validate_playlist_url(playlist_url):
                raise ValueError("Invalid Spotify playlist URL format")

            logger.info(f"Flow analysis: {playlist_url}")

            playlist_name, playlist_image, track_info, artist_ids = spotify_service.fetch_playlist_data(playlist_url)

            if not track_info:
                raise ValueError("No tracks found in playlist")

            max_size = app.config.get('MAX_PLAYLIST_SIZE', 1000)
            if len(track_info) > max_size:
                track_info = track_info[:max_size]

            audio_features = spotify_service.batch_fetch_audio_features(track_info)
            logger.info(f"Audio features fetched for {len(audio_features)} tracks")

            for track in track_info:
                url = track.get('spotify_url')
                if url and url in audio_features:
                    track['audio_features'] = audio_features[url]

            transitions = FlowService.analyse_transitions(track_info)
            flow_score = FlowService.playlist_flow_score(transitions)
            summary = FlowService.flow_summary(transitions)
            timeline = FlowService.flow_timeline(track_info, transitions)

            bridge_data = []
            for t in summary['roughest']:
                if t['verdict'] == 'rough':
                    targets = FlowService.bridge_targets(track_info[t['from_idx']], track_info[t['to_idx']])
                    bridge_data.append({
                        'from_idx': t['from_idx'],
                        'to_idx': t['to_idx'],
                        'from_track': t['from_track'],
                        'to_track': t['to_track'],
                        'score': t['score'],
                        'targets': targets,
                    })

            response = {
                'success': True,
                'playlist_name': playlist_name,
                'playlist_image': playlist_image,
                'track_count': len(track_info),
                'tracks': track_info,
                'flow_score': flow_score,
                'transitions': transitions,
                'summary': summary,
                'timeline': timeline,
                'bridge_data': bridge_data,
            }

            return jsonify(response), 200

        except ValueError as e:
            return jsonify({'success': False, 'error': 'Invalid input', 'message': str(e)}), 400
        except PermissionError as e:
            return jsonify({'success': False, 'error': 'Permission denied', 'message': str(e)}), 403
        except Exception as e:
            logger.error(f"Flow analysis error: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'error': 'Analysis failed', 'message': 'An error occurred while analyzing the playlist'}), 500

    # -----------------------
    # SPOTIFY AUTH ENDPOINTS
    # -----------------------
    @app.route('/auth/login')
    def auth_login():
        client_id = app.config.get('SPOTIFY_CLIENT_ID')
        redirect_uri = app.config.get('SPOTIFY_REDIRECT_URI')
        scope = 'user-read-private playlist-read-private playlist-read-collaborative'
        
        next_path = request.args.get('next')  # e.g., '/debug/test-playlist'
        if next_path:
            session['next_after_login'] = next_path

        from urllib.parse import urlencode
        params = {
            'client_id': client_id,
            'response_type': 'code',
            'redirect_uri': redirect_uri,
            'scope': scope,
            'show_dialog': 'true'
        }
        return redirect(f"https://accounts.spotify.com/authorize?{urlencode(params)}")

    @app.route('/auth/callback')
    def auth_callback():
        code = request.args.get('code')
        error = request.args.get('error')
        if error:
            return jsonify({'success': False, 'error': error}), 400
        if not code:
            return jsonify({'success': False, 'error': 'missing_code'}), 400

        token_url = 'https://accounts.spotify.com/api/token'
        redirect_uri = app.config.get('SPOTIFY_REDIRECT_URI')
        client_id = app.config.get('SPOTIFY_CLIENT_ID')
        client_secret = app.config.get('SPOTIFY_CLIENT_SECRET')

        try:
            resp = requests.post(token_url, data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': redirect_uri,
                'client_id': client_id,
                'client_secret': client_secret,
            }, timeout=10)
            resp.raise_for_status()
            body = resp.json()
        except Exception as e:
            return jsonify({'success': False, 'error': 'token_exchange_failed', 'message': str(e)}), 502

        session['user_access_token'] = body.get('access_token')
        session['user_refresh_token'] = body.get('refresh_token')
        session.permanent = True

        # Redirect to the path stored before login (or home if none)
        next_path = session.pop('next_after_login', '/')
        return redirect(next_path)

    # -----------------------
    # DEBUG AUDIO FEATURES (FIXED)
    # -----------------------
    @app.route('/debug/audio-features-raw', methods=['POST', 'GET'])
    def debug_audio_features_raw():
        """
        Requires user token from session to fetch playlist audio features.
        """
        try:
            data = request.get_json() or {}
            track_ids = data.get('track_ids') or []
            playlist_url = data.get('playlist_url')

            if playlist_url:
                if not spotify_service.validate_playlist_url(playlist_url):
                    return jsonify({'success': False, 'error': 'invalid playlist url'}), 400
                _, _, track_info, _ = spotify_service.fetch_playlist_data(playlist_url)
                for t in track_info:
                    if len(track_ids) >= 50:
                        break
                    url = t.get('spotify_url')
                    if url:
                        tid = url.split('/')[-1].split('?')[0]
                        track_ids.append(tid)

            if not track_ids:
                return jsonify({'success': False, 'error': 'no track_ids provided or found'}), 400

            access_token = session.get('user_access_token')
            if not access_token:
                return jsonify({'success': False, 'error': 'user token required'}), 403

            headers = {'Authorization': f'Bearer {access_token}'}
            ids_param = ','.join(track_ids[:50])
            af_url = f'https://api.spotify.com/v1/audio-features?ids={ids_param}'
            af_resp = requests.get(af_url, headers=headers, timeout=15)

            af_body = None
            try:
                af_body = af_resp.json()
            except Exception:
                af_body = af_resp.text

            resp_headers = {k: v for k, v in af_resp.headers.items() if k.lower() in ('content-type', 'cache-control', 'pragma')}

            return jsonify({
                'success': True,
                'audio_features_status': af_resp.status_code,
                'audio_features_headers': resp_headers,
                'audio_features_body': af_body
            }), 200

        except Exception as e:
            logger.error(f"debug audio-features-raw error: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'error': str(e)}), 500


    @app.route('/debug/whoami')
    def debug_whoami():
        """Call Spotify /v1/me using the session user token."""
        access_token = session.get('user_access_token')
        if not access_token:
            return jsonify({'success': False, 'error': 'no user token in session'}), 400
        headers = {'Authorization': f'Bearer {access_token}'}
        resp = requests.get('https://api.spotify.com/v1/me', headers=headers, timeout=10)
        try:
            body = resp.json()
        except Exception:
            body = resp.text
        return jsonify({'success': True, 'status': resp.status_code, 'body': body}), 200

    @app.route('/debug/test-playlist')
    def debug_test_playlist_safe():
        """Safe debug endpoint for your playlist analysis."""
        test_playlist_url = "https://open.spotify.com/playlist/2vDDGf5Y4TnCoTezuNGuai?si=b260de8b5bb64879"
        
        try:
            # Validate playlist URL first
            if not spotify_service.validate_playlist_url(test_playlist_url):
                return jsonify({'success': False, 'error': 'Invalid playlist URL'}), 400

            # Fetch all tracks, handling paging automatically
            playlist_name, playlist_image, track_info, _ = spotify_service.fetch_playlist_data(test_playlist_url)

            if not track_info:
                return jsonify({'success': False, 'error': 'No tracks found'}), 400

            # Limit track IDs to first 100 for safety in debug (adjust as needed)
            track_ids = []
            for t in track_info:
                url = t.get('spotify_url')
                if url:
                    tid = url.split('/')[-1].split('?')[0]
                    track_ids.append(tid)
            track_ids = track_ids[:100]

            # Use session token if available
            access_token = session.get('user_access_token')
            headers = {'Authorization': f'Bearer {access_token}'} if access_token else {}

            # Fetch audio features safely
            af_url = f'https://api.spotify.com/v1/audio-features?ids={",".join(track_ids)}'
            af_resp = requests.get(af_url, headers=headers, timeout=15)
            af_body = af_resp.json() if af_resp.status_code == 200 else {}

            return jsonify({
                'success': True,
                'playlist_name': playlist_name,
                'playlist_image': playlist_image,
                'track_count': len(track_info),
                'audio_features_status': af_resp.status_code,
                'audio_features_body': af_body
            }), 200

        except requests.HTTPError as http_err:
            logger.error(f"Spotify HTTP error: {http_err}", exc_info=True)
            return jsonify({'success': False, 'error': f"Spotify API HTTP error: {http_err}"}), 500
        except Exception as e:
            logger.error(f"Debug test playlist error: {e}", exc_info=True)
            return jsonify({'success': False, 'error': 'Internal server error occurred'}), 500
    # -----------------------
    # OTHER ROUTES
    # -----------------------
    # You can copy all your existing endpoints like /analyze, /auto-smooth, /bridge-recommendations, /youtube-search
    # Exactly as they were in your original app.py
    # For brevity, I'm omitting them here since they remain unchanged.

    # Example:
    # @app.route('/api/v1/analyze', methods=['POST'])
    # @rate_limit
    # def analyze():
    #     ...

# Create application instance
app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    app.run(
        host=app.config['HOST'],
        port=app.config['PORT'],
        debug=app.config['DEBUG']
    )