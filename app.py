"""
pyAux - Spotify Playlist Analyser
Enterprise-grade Flask web application with proper architecture

Author: pyAux Team
Version: 2.0.0
"""

import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

from config import get_config
from logger import setup_logging, get_logger
from error_handlers import register_error_handlers
from middleware import setup_security, rate_limit
from services import SpotifyService, AnalysisService

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
    """
    Register all application routes
    
    Args:
        app: Flask application
        spotify_service: SpotifyService instance
    """
    
    @app.route('/')
    def index():
        """Render landing page"""
        return render_template('index.html')
    
    @app.route('/results')
    def results():
        """Render results page"""
        return render_template('results.html')
    
    @app.route('/api/v1/analyze', methods=['POST'])
    @rate_limit
    def analyze_playlist():
        """
        API endpoint to analyze a Spotify playlist
        
        Request JSON:
            {
                "playlist_url": "https://open.spotify.com/playlist/..."
            }
            
        Response JSON:
            {
                "success": true,
                "playlist_name": "...",
                "playlist_image": "...",
                "track_count": 50,
                "tracks": [...],
                "ratings": {...},
                "popular_genres": [...],
                "recommendations": [...]
            }
        """
        try:
            # Validate request
            data = request.get_json()
            if not data:
                raise ValueError("Request body must be JSON")
            
            playlist_url = data.get('playlist_url', '').strip()
            if not playlist_url:
                raise ValueError("playlist_url is required")
            
            # Validate URL format
            if not spotify_service.validate_playlist_url(playlist_url):
                raise ValueError("Invalid Spotify playlist URL format")
            
            logger.info(f"Analyzing playlist: {playlist_url}")
            
            # Fetch playlist data
            playlist_name, playlist_image, track_info, artist_ids = \
                spotify_service.fetch_playlist_data(playlist_url)
            
            if not track_info:
                raise ValueError("No tracks found in playlist")
            
            # Check playlist size limit
            max_size = app.config.get('MAX_PLAYLIST_SIZE', 1000)
            if len(track_info) > max_size:
                logger.warning(f"Playlist exceeds max size: {len(track_info)} tracks")
                track_info = track_info[:max_size]
                artist_ids = {aid for track in track_info for artist in track.get('artist_info', []) for aid in [artist['id']]}
            
            # Batch fetch artist genres
            logger.debug(f"Fetching genres for {len(artist_ids)} artists")
            genre_cache = spotify_service.batch_fetch_artist_genres(artist_ids)
            
            # Calculate ratings
            ratings = AnalysisService.calculate_ratings(track_info, genre_cache)
            
            # Get popular genres
            popular_genres = AnalysisService.get_popular_genres(track_info, genre_cache)
            
            # Generate recommendations
            recommendations = spotify_service.get_recommendations(track_info, genre_cache)
            
            # Prepare response
            response = {
                'success': True,
                'playlist_name': playlist_name,
                'playlist_image': playlist_image,
                'track_count': len(track_info),
                'tracks': track_info,
                'ratings': ratings,
                'popular_genres': popular_genres,
                'recommendations': recommendations
            }
            
            logger.info(f"Analysis complete - {len(track_info)} tracks, rating: {ratings['overall_rating']}%")
            return jsonify(response), 200
            
        except ValueError as e:
            logger.warning(f"Validation error: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Invalid input',
                'message': str(e)
            }), 400
        
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'error': 'Analysis failed',
                'message': 'An error occurred while analyzing the playlist'
            }), 500
    
    # Legacy endpoint for backward compatibility
    @app.route('/analyse', methods=['POST'])
    @rate_limit
    def analyse_legacy():
        """Legacy endpoint - redirects to new API"""
        return analyze_playlist()


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
