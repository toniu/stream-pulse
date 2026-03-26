"""
Security middleware and utilities
"""

from functools import wraps
from flask import request, jsonify
import hmac
import time
from collections import defaultdict

from logger import get_logger

logger = get_logger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self, max_requests: int = 10, window: int = 60):
        """
        Initialize rate limiter
        
        Args:
            max_requests: Maximum requests allowed per window
            window: Time window in seconds
        """
        self.max_requests = max_requests
        self.window = window
        self.requests = defaultdict(list)
    
    def is_allowed(self, identifier: str) -> bool:
        """
        Check if request is allowed
        
        Args:
            identifier: Unique identifier (e.g., IP address)
            
        Returns:
            True if request is within rate limit
        """
        now = time.time()
        
        # Remove old requests outside window
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < self.window
        ]
        
        # Check if under limit
        if len(self.requests[identifier]) < self.max_requests:
            self.requests[identifier].append(now)
            return True
        
        return False


# Global rate limiter instance
rate_limiter = RateLimiter(max_requests=20, window=60)


def rate_limit(f):
    """
    Decorator to apply rate limiting to routes
    
    Usage:
        @app.route('/api/endpoint')
        @rate_limit
        def endpoint():
            pass
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Use IP address as identifier
        identifier = request.remote_addr or 'unknown'
        
        if not rate_limiter.is_allowed(identifier):
            logger.warning(f"Rate limit exceeded for {identifier}")
            return jsonify({
                'success': False,
                'error': 'Too many requests',
                'message': 'Please slow down and try again later'
            }), 429
        
        return f(*args, **kwargs)
    
    return decorated_function


def add_security_headers(response):
    """
    Add security headers to response
    
    Args:
        response: Flask response object
        
    Returns:
        Response with security headers
    """
    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    
    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # Enable XSS protection
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Content Security Policy
    # Allow Google Fonts and its static CDN for fonts/styles used by the frontend
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: https:; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "connect-src 'self' https://api.spotify.com https://cdn.jsdelivr.net; "
        "media-src 'self' https:; "
        "frame-src 'self' https://www.youtube.com; "
    )
    
    # Referrer Policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Permissions Policy
    response.headers['Permissions-Policy'] = (
        'geolocation=(), '
        'microphone=(), '
        'camera=()'
    )
    
    return response


def setup_security(app):
    """
    Setup security configurations for Flask app
    
    Args:
        app: Flask application instance
    """
    # Add security headers to all responses
    @app.after_request
    def add_headers(response):
        return add_security_headers(response)
    
    logger.info("Security middleware configured")
