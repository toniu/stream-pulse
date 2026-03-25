"""
pyAux - Spotify Playlist Analyser
Enterprise-grade Flask web application with proper architecture

Author: pyAux Team
Version: 2.0.0
"""

import os
import requests
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
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
    """
    Application factory pattern
    
    Args:
        config_name: Configuration name ('development', 'production', 'testing')
        
    Returns:
        Configured Flask application
    """
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
        """Health check endpoint for monitoring"""
        return jsonify({
            'status': 'healthy',
            'service': 'pyAux',
            'version': '2.0.0'
        }), 200
    
    logger.info("Application initialized successfully")
    return app


def register_routes(app, spotify_service):
    """Register all application routes"""
    
    @app.route('/')
    def index():
        """Render landing page"""
        return render_template('index.html')

    @app.route('/demo/timeline')
    def demo_timeline():
        """Render the demo energy timeline (static React+D3)"""
        return render_template('demo_timeline.html')
    
    @app.route('/results')
    def results():
        """Render results page"""
        return render_template('results.html')
    
    @app.route('/api/v1/analyze-flow', methods=['POST'])
    @rate_limit
    def analyze_flow():
        """
        Playlist Flow Doctor endpoint.
        Analyses every track-to-track transition, scores flow,
        flags rough spots, and returns bridge-track targets.
        """
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

            # Fetch playlist data
            playlist_name, playlist_image, track_info, artist_ids = \
                spotify_service.fetch_playlist_data(playlist_url)

            if not track_info:
                raise ValueError("No tracks found in playlist")

            max_size = app.config.get('MAX_PLAYLIST_SIZE', 1000)
            if len(track_info) > max_size:
                track_info = track_info[:max_size]

            # Batch fetch audio features (includes key/mode now)
            audio_features = spotify_service.batch_fetch_audio_features(track_info)
            logger.info(f"Audio features fetched for {len(audio_features)} tracks")
            # If fetching audio features failed entirely, proceed with neutral defaults
            if not audio_features:
                logger.warning("No audio features returned; proceeding with neutral defaults")
            for track in track_info:
                url = track.get('spotify_url')
                if url and url in audio_features:
                    track['audio_features'] = audio_features[url]
                else:
                    logger.debug(f"No audio features for track '{track.get('name')}' (url={url})")

            # Log a small sample for debugging
            sample_with = [t for t in track_info if t.get('audio_features')]
            sample_without = [t for t in track_info if not t.get('audio_features')]
            logger.info(f"Tracks with features: {len(sample_with)}; without: {len(sample_without)}")
            if sample_with:
                logger.debug(f"Sample features (first): {sample_with[0].get('audio_features')}")

            # Flow analysis
            transitions = FlowService.analyse_transitions(track_info)
            flow_score = FlowService.playlist_flow_score(transitions)
            summary = FlowService.flow_summary(transitions)
            timeline = FlowService.flow_timeline(track_info, transitions)

            # Compute bridge targets for rough transitions
            bridge_data = []
            for t in summary['roughest']:
                if t['verdict'] == 'rough':
                    targets = FlowService.bridge_targets(
                        track_info[t['from_idx']], track_info[t['to_idx']]
                    )
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

            logger.info(
                f"Flow analysis complete — {len(track_info)} tracks, "
                f"score {flow_score}/100, {summary['rough_count']} rough transitions"
            )
            return jsonify(response), 200

        except ValueError as e:
            logger.warning(f"Validation error: {str(e)}")
            return jsonify({
                'success': False, 'error': 'Invalid input', 'message': str(e)
            }), 400
        except Exception as e:
            logger.error(f"Flow analysis error: {str(e)}", exc_info=True)
            return jsonify({
                'success': False, 'error': 'Analysis failed',
                'message': 'An error occurred while analyzing the playlist'
            }), 500

    # NOTE: temporary debug endpoints removed — restoring original behavior

    @app.route('/auth/login')
    def auth_login():
        """Redirect user to Spotify to begin Authorization Code Flow"""
        client_id = app.config.get('SPOTIFY_CLIENT_ID')
        redirect_uri = app.config.get('SPOTIFY_REDIRECT_URI')
        scope = 'user-read-private'
        params = {
            'client_id': client_id,
            'response_type': 'code',
            'redirect_uri': redirect_uri,
            'scope': scope,
            'show_dialog': 'true'
        }
        auth_url = 'https://accounts.spotify.com/authorize'
        from urllib.parse import urlencode
        return redirect(f"{auth_url}?{urlencode(params)}")

    @app.route('/auth/callback')
    def auth_callback():
        """Handle Spotify redirect and exchange code for user access token"""
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

        resp = requests.post(
            token_url,
            data={'grant_type': 'authorization_code', 'code': code, 'redirect_uri': redirect_uri},
            auth=(client_id, client_secret),
            timeout=10
        )
        try:
            body = resp.json()
        except Exception:
            body = resp.text

        if resp.status_code != 200:
            return jsonify({'success': False, 'status': resp.status_code, 'body': body}), 400

        # Store user token in session for subsequent probes
        session['user_access_token'] = body.get('access_token')
        session['user_refresh_token'] = body.get('refresh_token')
        session.permanent = True

        return jsonify({'success': True, 'message': 'Authorization successful; user token stored in session'}), 200

    @app.route('/debug/audio-features-raw', methods=['POST', 'GET'])
    def debug_audio_features_raw():
        """
        Minimal raw probe: exchanges client credentials for an access token
        and calls Spotify's /v1/audio-features for provided track ids or a playlist.
        POST JSON: { "track_ids": ["id1","id2"], "playlist_url": "..." }
        If playlist_url is provided, it will be used to extract up to 50 track ids.
        Returns token response, audio-features status, headers (subset), and body.
        """
        try:
            if request.method == 'POST':
                data = request.get_json() or {}
                track_ids = data.get('track_ids') or []
                playlist_url = data.get('playlist_url')
            else:
                # GET: accept playlist_url or track_ids query param (comma-separated)
                track_ids_param = request.args.get('track_ids')
                playlist_url = request.args.get('playlist_url')
                track_ids = track_ids_param.split(',') if track_ids_param else []

            if playlist_url:
                # Validate and fetch playlist tracks via existing spotify_service
                if not spotify_service.validate_playlist_url(playlist_url):
                    return jsonify({'success': False, 'error': 'invalid playlist url'}), 400
                _, _, track_info, _ = spotify_service.fetch_playlist_data(playlist_url)
                # extract up to 50 ids
                for t in track_info:
                    if len(track_ids) >= 50:
                        break
                    url = t.get('spotify_url')
                    if url:
                        tid = url.split('/')[-1].split('?')[0]
                        track_ids.append(tid)

            if not track_ids:
                return jsonify({'success': False, 'error': 'no track_ids provided or found'}), 400

            # Prefer a user access token from session (Authorization Code Flow)
            access_token = session.get('user_access_token')
            token_body = None
            token_status = None
            if access_token:
                headers = {'Authorization': f'Bearer {access_token}'}
                token_status = 'session'
                token_body = {'from': 'session'}
                token_resp = None
            else:
                # Fall back to client credentials exchange
                token_url = 'https://accounts.spotify.com/api/token'
                auth = (app.config.get('SPOTIFY_CLIENT_ID'), app.config.get('SPOTIFY_CLIENT_SECRET'))
                token_resp = requests.post(
                    token_url,
                    data={'grant_type': 'client_credentials'},
                    auth=auth,
                    timeout=10
                )
                try:
                    token_body = token_resp.json()
                except Exception:
                    token_body = token_resp.text
                token_status = token_resp.status_code
                if token_resp.status_code != 200:
                    return jsonify({'success': False, 'token_status': token_resp.status_code, 'token_body': token_body}), 200
                access_token = token_body.get('access_token')
                headers = {'Authorization': f'Bearer {access_token}'}

            ids_param = ','.join(track_ids[:50])
            af_url = f'https://api.spotify.com/v1/audio-features?ids={ids_param}'
            af_resp = requests.get(af_url, headers=headers, timeout=15)

            # Prepare a compact headers map to return (avoid secrets)
            resp_headers = {k: v for k, v in af_resp.headers.items() if k.lower() in ('content-type', 'cache-control', 'pragma', 'www-authenticate', 'ratelimit-remaining', 'ratelimit-reset', 'retry-after')}

            af_body = None
            try:
                af_body = af_resp.json()
            except Exception:
                af_body = af_resp.text

            return jsonify({
                'success': True,
                'token_status': token_status,
                'token_body': token_body,
                'audio_features_status': af_resp.status_code,
                'audio_features_headers': resp_headers,
                'audio_features_body': af_body
            }), 200

        except Exception as e:
            logger.error(f"debug audio-features-raw error: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/debug/whoami')
    def debug_whoami():
        """Call Spotify /v1/me using the session user token to verify it's valid."""
        try:
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
        except Exception as e:
            logger.error(f"whoami probe failed: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/v1/auto-smooth', methods=['POST'])
    @rate_limit
    def auto_smooth():
        """Return an auto-smoothed track order."""
        try:
            data = request.get_json()
            if not data:
                raise ValueError("Request body must be JSON")
            tracks = data.get('tracks', [])
            if not tracks:
                raise ValueError("Tracks list is required")

            order = FlowService.auto_smooth(tracks)
            return jsonify({'success': True, 'order': order}), 200

        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            logger.error(f"Auto-smooth error: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'error': 'Auto-smooth failed'}), 500

    @app.route('/api/v1/analyze', methods=['POST'])
    @rate_limit
    def analyze():
        """Lightweight analyze endpoint for prototyping UI.

        Expects JSON: { "tracks": [ { "tempo":.., "energy":.., "valence":.., "danceability":.., "key":.., "mode":.. }, ... ] }
        Returns: { "success": True, "transition_scores": [...], "playlist_score": float }
        """
        try:
            data = request.get_json()
            if not data:
                raise ValueError("Request body must be JSON")
            tracks = data.get('tracks')
            if not tracks or not isinstance(tracks, list):
                raise ValueError("'tracks' must be a non-empty list")

            # Import here to avoid circular imports at module load
            from services import flow_scoring

            result = flow_scoring.playlist_score(tracks)
            return jsonify({'success': True, **result}), 200

        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            logger.error(f"Analyze endpoint error: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'error': 'Analyze failed'}), 500

    @app.route('/api/v1/bridge-recommendations', methods=['POST'])
    @rate_limit
    def bridge_recommendations():
        """Get Spotify recommendations for a bridge track between two songs."""
        try:
            data = request.get_json()
            if not data:
                raise ValueError("Request body must be JSON")

            targets = data.get('targets', {})
            seed_track_ids = data.get('seed_track_ids', [])
            existing_names = set(data.get('existing_names', []))

            if not targets or not seed_track_ids:
                raise ValueError("targets and seed_track_ids are required")

            recs = spotify_service.get_bridge_recommendations(
                targets, seed_track_ids, existing_names, limit=5
            )
            return jsonify({'success': True, 'recommendations': recs}), 200

        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            logger.error(f"Bridge rec error: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'error': 'Recommendation failed'}), 500

    @app.route('/api/v1/youtube-search', methods=['POST'])
    @rate_limit
    def youtube_search():
        """Search YouTube for a track and return video ID"""
        try:
            import yt_dlp
            
            data = request.get_json()
            if not data:
                raise ValueError("Request body must be JSON")
            
            track_name = data.get('track_name', '').strip()
            artist_name = data.get('artist_name', '').strip()
            
            if not track_name or not artist_name:
                raise ValueError("track_name and artist_name are required")
            
            clean_track = track_name.replace('(', '').replace(')', '').replace('[', '').replace(']', '')
            clean_artist = artist_name.replace('(', '').replace(')', '')
            
            search_query = f"ytsearch1:{clean_track} {clean_artist} official audio"
            logger.info(f"Searching YouTube: {search_query}")
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
                'skip_download': True
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(search_query, download=False)
                
                if result and 'entries' in result and len(result['entries']) > 0:
                    video = result['entries'][0]
                    video_id = video.get('id')
                    video_title = video.get('title', 'Unknown')
                    
                    return jsonify({
                        'success': True,
                        'video_id': video_id,
                        'video_title': video_title
                    }), 200
                else:
                    return jsonify({
                        'success': False,
                        'error': 'No results found'
                    }), 404
        
        except Exception as e:
            logger.error(f"YouTube search error: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'error': 'Search failed',
                'message': str(e)
            }), 500


# Create application instance
app = create_app(os.getenv('FLASK_ENV', 'development'))


if __name__ == '__main__':
    """
    Development server entry point
    For production, use gunicorn:
        gunicorn -w 4 -b 0.0.0.0:5001 app:app
    """
    app.run(
        host=app.config['HOST'],
        port=app.config['PORT'],
        debug=app.config['DEBUG']
    )
