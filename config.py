"""
Configuration management for pyAux Flask application
Handles environment-specific settings with validation
"""

import os
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
load_dotenv()


class Config:
    """Base configuration with common settings"""
    
    # Flask settings
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Spotify API credentials (support both CLIENT_* and SPOTIFY_* env names)
    SPOTIFY_CLIENT_ID = os.getenv('CLIENT_ID') or os.getenv('SPOTIFY_CLIENT_ID')
    SPOTIFY_CLIENT_SECRET = os.getenv('CLIENT_SECRET') or os.getenv('SPOTIFY_CLIENT_SECRET')

    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise ValueError("Spotify credentials (CLIENT_ID/ SPOTIFY_CLIENT_ID, CLIENT_SECRET/ SPOTIFY_CLIENT_SECRET) must be set")
    
    # Server settings
    HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    PORT = int(os.getenv('FLASK_PORT', 5001))
    
    # API settings
    API_VERSION = 'v1'
    MAX_PLAYLIST_SIZE = int(os.getenv('MAX_PLAYLIST_SIZE', 1000))
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', 30))
    
    # Cache settings
    CACHE_TYPE = os.getenv('CACHE_TYPE', 'simple')
    CACHE_DEFAULT_TIMEOUT = int(os.getenv('CACHE_TIMEOUT', 300))
    
    # Security settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
    
    # CORS settings
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '').split(',') if os.getenv('CORS_ORIGINS') else ['*']

    # OAuth redirect URI for Authorization Code Flow (override in .env if needed)
    SPOTIFY_REDIRECT_URI = os.getenv('SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:5001/auth/callback')
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'


class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG = True
    TESTING = False
    SESSION_COOKIE_SECURE = False  # Allow HTTP in development
    LOG_LEVEL = 'DEBUG'


class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG = False
    TESTING = False
    
    # Enforce HTTPS in production
    SESSION_COOKIE_SECURE = True
    
    # Stricter security
    SESSION_COOKIE_SAMESITE = 'Strict'
    
    # Performance
    CACHE_TYPE = 'redis'
    
    @staticmethod
    def validate():
        """Validate production configuration"""
        if Config.SECRET_KEY == 'dev-secret-key-change-in-production':
            raise ValueError("Production SECRET_KEY must not be the default value")


class TestingConfig(Config):
    """Testing environment configuration"""
    DEBUG = False
    TESTING = True
    SESSION_COOKIE_SECURE = False
    
    # Use in-memory cache for tests
    CACHE_TYPE = 'simple'


# Config dictionary for easy selection
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(env: Optional[str] = None) -> Config:
    """
    Get configuration based on environment
    
    Args:
        env: Environment name ('development', 'production', 'testing')
        
    Returns:
        Config object for specified environment
    """
    if env is None:
        env = os.getenv('FLASK_ENV', 'development')
    
    config_class = config.get(env, config['default'])
    
    # Validate production config
    if env == 'production':
        config_class.validate()
    
    return config_class
