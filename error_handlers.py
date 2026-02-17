"""
Error handlers for Flask application
Provides consistent error responses
"""

from flask import jsonify, render_template, request
from werkzeug.exceptions import HTTPException
from spotipy.exceptions import SpotifyException

from logger import get_logger

logger = get_logger(__name__)


def register_error_handlers(app):
    """
    Register error handlers for the Flask application
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors"""
        logger.warning(f"Bad request: {request.url} - {str(error)}")
        if request.path.startswith('/api/'):
            return jsonify({
                'success': False,
                'error': 'Bad request',
                'message': str(error.description) if hasattr(error, 'description') else 'Invalid request'
            }), 400
        return render_template('error.html', error=error), 400
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors"""
        logger.warning(f"Not found: {request.url}")
        if request.path.startswith('/api/'):
            return jsonify({
                'success': False,
                'error': 'Not found',
                'message': 'The requested resource was not found'
            }), 404
        return render_template('error.html', error=error), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """Handle 405 Method Not Allowed errors"""
        logger.warning(f"Method not allowed: {request.method} {request.url}")
        if request.path.startswith('/api/'):
            return jsonify({
                'success': False,
                'error': 'Method not allowed',
                'message': f'{request.method} method is not allowed for this endpoint'
            }), 405
        return render_template('error.html', error=error), 405
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        """Handle 429 Too Many Requests errors"""
        logger.warning(f"Rate limit exceeded: {request.remote_addr}")
        return jsonify({
            'success': False,
            'error': 'Too many requests',
            'message': 'Please slow down and try again later'
        }), 429
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 Internal Server Error"""
        logger.error(f"Internal server error: {str(error)}", exc_info=True)
        if request.path.startswith('/api/'):
            return jsonify({
                'success': False,
                'error': 'Internal server error',
                'message': 'An unexpected error occurred. Please try again later.'
            }), 500
        return render_template('error.html', error=error), 500
    
    @app.errorhandler(SpotifyException)
    def handle_spotify_error(error):
        """Handle Spotify API errors"""
        logger.error(f"Spotify API error: {error.http_status} - {str(error)}")
        
        error_messages = {
            401: 'Spotify authentication failed',
            403: 'Access to this resource is forbidden',
            404: 'Playlist not found or is private',
            429: 'Spotify API rate limit exceeded. Please try again later.',
            500: 'Spotify service is currently unavailable'
        }
        
        message = error_messages.get(error.http_status, 'An error occurred with Spotify API')
        
        return jsonify({
            'success': False,
            'error': 'Spotify API error',
            'message': message
        }), min(error.http_status, 500)
    
    @app.errorhandler(ValueError)
    def handle_value_error(error):
        """Handle ValueError exceptions"""
        logger.warning(f"ValueError: {str(error)}")
        return jsonify({
            'success': False,
            'error': 'Invalid input',
            'message': str(error)
        }), 400
    
    @app.errorhandler(Exception)
    def handle_generic_error(error):
        """Handle any unhandled exceptions"""
        logger.error(f"Unhandled exception: {str(error)}", exc_info=True)
        
        # Don't expose internal error details in production
        if app.config.get('DEBUG'):
            message = str(error)
        else:
            message = 'An unexpected error occurred. Please try again later.'
        
        return jsonify({
            'success': False,
            'error': 'Server error',
            'message': message
        }), 500
    
    logger.info("Error handlers registered")
