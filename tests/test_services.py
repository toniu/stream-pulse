"""
Unit tests for pyAux application
Run with: python -m pytest tests/
"""

import pytest
from unittest.mock import Mock, patch
from services.spotify_service import SpotifyService
from services.analysis_service import AnalysisService


class TestSpotifyService:
    """Tests for Spotify service"""
    
    def test_validate_playlist_url_valid(self):
        """Test URL validation with valid URLs"""
        valid_urls = [
            'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
            'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO?si=abc123'
        ]
        for url in valid_urls:
            assert SpotifyService.validate_playlist_url(url) is True
    
    def test_validate_playlist_url_invalid(self):
        """Test URL validation with invalid URLs"""
        invalid_urls = [
            'https://google.com',
            'https://open.spotify.com/track/123',
            'not a url',
            '',
            'http://open.spotify.com/playlist/123'
        ]
        for url in invalid_urls:
            assert SpotifyService.validate_playlist_url(url) is False
    
    def test_parse_track_success(self):
        """Test track parsing with valid data"""
        track_data = {
            'name': 'Test Track',
            'artists': [{'name': 'Artist 1', 'id': '123'}],
            'album': {
                'name': 'Test Album',
                'release_date': '2020-01-01',
                'images': [{'url': 'http://example.com/image.jpg'}]
            },
            'popularity': 50,
            'duration_ms': 180000,
            'explicit': False,
            'preview_url': 'http://example.com/preview.mp3',
            'external_urls': {'spotify': 'http://example.com/track'}
        }
        
        result = SpotifyService._parse_track(track_data)
        
        assert result is not None
        assert result['name'] == 'Test Track'
        assert result['artists'] == ['Artist 1']
        assert result['release_year'] == 2020
        assert result['duration'] == '3:00'
    
    def test_parse_track_invalid(self):
        """Test track parsing with invalid data"""
        result = SpotifyService._parse_track({})
        assert result is None


class TestAnalysisService:
    """Tests for Analysis service"""
    
    def test_calculate_artist_diversity(self):
        """Test artist diversity calculation"""
        track_info = [
            {'artists': ['Artist 1', 'Artist 2']},
            {'artists': ['Artist 2', 'Artist 3']},
            {'artists': ['Artist 1']}
        ]
        
        # 3 unique artists / 3 tracks = 1.0
        diversity = AnalysisService._calculate_artist_diversity(track_info)
        assert diversity == 1.0
    
    def test_calculate_length_rating(self):
        """Test length rating calculation"""
        # Very short playlist
        assert AnalysisService._calculate_length_rating(5) < 0.2
        
        # Medium playlist
        assert 0.3 < AnalysisService._calculate_length_rating(25) < 0.7
        
        # Large playlist (logarithmic diminishing returns)
        assert AnalysisService._calculate_length_rating(100) > 0.75
    
    def test_calculate_era_diversity_single_year(self):
        """Test era diversity with single year"""
        track_info = [
            {'release_year': 2020},
            {'release_year': 2020}
        ]
        
        diversity = AnalysisService._calculate_era_diversity(track_info)
        assert diversity == 0.0
    
    def test_calculate_era_diversity_wide_range(self):
        """Test era diversity with wide range"""
        track_info = [
            {'release_year': 1980},
            {'release_year': 2020}
        ]
        
        diversity = AnalysisService._calculate_era_diversity(track_info)
        assert diversity == 1.0


@pytest.fixture
def mock_spotify_client():
    """Mock Spotify client for tests"""
    with patch('spotipy.Spotify') as mock:
        yield mock


def test_spotify_service_initialization():
    """Test SpotifyService initialization"""
    service = SpotifyService('test_id', 'test_secret')
    assert service.client_id == 'test_id'
    assert service.client_secret == 'test_secret'


def test_rate_calculation_bounds():
    """Test that all ratings stay within 0-1 bounds"""
    track_info = [
        {
            'artists': ['Artist 1'],
            'popularity': 50,
            'release_year': 2020,
            'artist_info': [{'id': '1', 'name': 'Artist 1'}]
        }
    ]
    
    genre_cache = {'1': ['rock']}
    ratings = AnalysisService.calculate_ratings(track_info, genre_cache)
    
    # Check all ratings are percentages (0-100)
    for key, value in ratings.items():
        assert 0 <= value <= 100, f"{key} = {value} is out of bounds"
