"""
Logging configuration for pyAux Flask application
Provides structured logging with rotation and proper handlers
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(app):
    """
    Configure application logging with file and console handlers
    
    Args:
        app: Flask application instance
    """
    # Create logs directory if it doesn't exist
    log_dir = Path('logs')
    log_dir.mkdir(exist_ok=True)
    
    # Set log level from config
    log_level = getattr(logging, app.config.get('LOG_LEVEL', 'INFO'))
    
    # Remove default handlers
    app.logger.handlers.clear()
    
    # Configure formatter
    formatter = logging.Formatter(app.config.get('LOG_FORMAT'))
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        log_dir / 'pyaux.log',
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    
    # Add handlers to app logger
    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(log_level)
    
    # Log startup
    app.logger.info(f"Logging initialized - Level: {logging.getLevelName(log_level)}")
    
    return app.logger


def get_logger(name: str = __name__) -> logging.Logger:
    """
    Get a logger instance for a specific module
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)
