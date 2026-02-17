"""
Analysis service - Handles playlist rating calculations
"""

from typing import Dict, List
from collections import Counter
import math
import statistics

from logger import get_logger

logger = get_logger(__name__)


# Genre mapping configuration
GENRE_MAPPING = {
    'Rap/Hip-Hop': ['rap', 'hip hop', 'trap', 'drill', 'hip-hop'],
    'R&B/Soul': ['r&b', 'soul', 'alternative r&b', 'neo soul'],
    'Pop': ['pop', 'party'],
    'Dance/Electronic': ['dance', 'electronic', 'techno', 'dubstep', 'drum and bass', 'garage', 'house', 'amapiano'],
    'Metal/Rock': ['metal', 'rock', 'punk', 'metalcore'],
    'Jazz/Blues': ['jazz', 'blues'],
    'Country/Folk': ['country', 'folk', 'worship'],
    'Afrobeats': ['afrobeats', 'reggaeton', 'afroswing', 'afrobeat'],
    'Latin': ['latin', 'reggaeton', 'samba'],
    'Caribbean': ['reggae', 'dancehall', 'soca'],
    'Gospel': ['christian', 'gospel', 'worship'],
    'Indie/Alternative': ['alternative', 'indie', 'worship'],
    'Instrumental/Classical': ['classical', 'instrumental', 'percussion', 'lo-fi'],
    'Spoken Word': ['spoken word', 'spoken', 'word', 'poetry', 'freestyle'],
    'Miscellaneous/World': []
}


class AnalysisService:
    """Service for analyzing playlist metrics"""
    
    # Rating weights
    ARTIST_WEIGHT = 0.30
    POPULARITY_WEIGHT = 0.25
    GENRE_WEIGHT = 0.25
    LENGTH_WEIGHT = 0.15
    ERA_WEIGHT = 0.05
    
    @staticmethod
    def calculate_ratings(track_info: List[Dict], genre_cache: Dict) -> Dict[str, float]:
        """
        Calculate all playlist ratings
        
        Args:
            track_info: List of track dictionaries
            genre_cache: Cached artist genres
            
        Returns:
            Dictionary of rating metrics
        """
        try:
            # Calculate individual ratings
            artist_diversity = AnalysisService._calculate_artist_diversity(track_info)
            popularity = AnalysisService._calculate_popularity_rating(track_info)
            genre_cohesion = AnalysisService._calculate_genre_diversity(track_info, genre_cache)
            length = AnalysisService._calculate_length_rating(len(track_info))
            era_diversity = AnalysisService._calculate_era_diversity(track_info)
            
            # Calculate weighted overall rating
            overall = (
                AnalysisService.ARTIST_WEIGHT * artist_diversity +
                AnalysisService.POPULARITY_WEIGHT * popularity +
                AnalysisService.GENRE_WEIGHT * genre_cohesion +
                AnalysisService.LENGTH_WEIGHT * length +
                AnalysisService.ERA_WEIGHT * era_diversity
            )
            
            ratings = {
                'artist_diversity_rating': round(artist_diversity * 100, 2),
                'popularity_rating': round(popularity * 100, 2),
                'genre_cohesion_rating': round(genre_cohesion * 100, 2),
                'playlist_length_rating': round(length * 100, 2),
                'era_diversity_rating': round(era_diversity * 100, 2),
                'overall_rating': round(overall * 100, 2)
            }
            
            logger.info(f"Calculated ratings - Overall: {ratings['overall_rating']}%")
            return ratings
            
        except Exception as e:
            logger.error(f"Error calculating ratings: {str(e)}")
            raise
    
    @staticmethod
    def _calculate_artist_diversity(track_info: List[Dict]) -> float:
        """Calculate artist diversity score"""
        unique_artists = set(artist for track in track_info for artist in track['artists'])
        return min(len(unique_artists) / len(track_info), 1.0)
    
    @staticmethod
    def _calculate_popularity_rating(track_info: List[Dict]) -> float:
        """Calculate popularity balance score"""
        popularities = [track['popularity'] for track in track_info]
        
        if not popularities:
            return 0.5
        
        # Average popularity (50-70 is ideal)
        avg_pop = sum(popularities) / len(popularities)
        avg_score = max(0, min(1, 1.0 - abs(avg_pop - 60) / 60))
        
        # Variety score (std dev 20-35 is ideal)
        if len(popularities) > 1:
            std_pop = statistics.stdev(popularities)
            variety_score = max(0, min(1, 1.0 - abs(std_pop - 27.5) / 27.5))
        else:
            variety_score = 0.5
        
        return 0.6 * avg_score + 0.4 * variety_score
    
    @staticmethod
    def _calculate_length_rating(track_count: int) -> float:
        """Calculate playlist length score"""
        if track_count < 10:
            return track_count / 50
        elif track_count < 30:
            return 0.2 + (track_count - 10) / 50
        elif track_count < 50:
            return 0.6 + (track_count - 30) / 50
        else:
            # Logarithmic for 50+ tracks
            return min(1.0, 1.0 - (1 / math.log(track_count + 1)))
    
    @staticmethod
    def _calculate_era_diversity(track_info: List[Dict]) -> float:
        """Calculate era diversity score"""
        years = [track['release_year'] for track in track_info if track.get('release_year')]
        
        if not years:
            return 0.5
        
        year_range = max(years) - min(years)
        
        if year_range < 5:
            return year_range / 10
        elif year_range < 10:
            return 0.5 + (year_range - 5) / 10
        elif year_range < 30:
            return 0.9 + (year_range - 10) / 200
        else:
            return 1.0
    
    @staticmethod
    def _calculate_genre_diversity(track_info: List[Dict], genre_cache: Dict) -> float:
        """Calculate genre cohesion score"""
        all_parent_genres = []
        
        try:
            for track in track_info:
                for artist_data in track.get('artist_info', []):
                    artist_id = artist_data['id']
                    artist_genres = genre_cache.get(artist_id, [])
                    parent_genres = []
                    
                    # Map to parent genres
                    for genre in artist_genres:
                        for parent_genre, keywords in GENRE_MAPPING.items():
                            if any(keyword in genre for keyword in keywords):
                                parent_genres.append(parent_genre)
                                break
                    
                    if not parent_genres:
                        parent_genres.append('Miscellaneous/World')
                    
                    all_parent_genres.extend(parent_genres)
            
            if not all_parent_genres:
                return 0.5
            
            # Calculate entropy
            genre_counts = Counter(all_parent_genres)
            total_count = len(all_parent_genres)
            
            entropy = 0.0
            for count in genre_counts.values():
                probability = count / total_count
                if probability > 0:
                    entropy -= probability * math.log(probability, 2)
            
            # Normalize
            max_entropy = math.log(len(genre_counts), 2) if len(genre_counts) > 1 else 1
            diversity_score = 1.0 - (entropy / max_entropy) if max_entropy > 0 else 1.0
            
            return max(0.0, min(1.0, diversity_score))
            
        except Exception as e:
            logger.error(f"Error calculating genre diversity: {str(e)}")
            return 0.5
    
    @staticmethod
    def get_popular_genres(track_info: List[Dict], genre_cache: Dict, num_genres: int = 3) -> List[Dict]:
        """
        Get most popular genres in playlist
        
        Args:
            track_info: List of track dictionaries
            genre_cache: Cached artist genres
            num_genres: Number of top genres to return
            
        Returns:
            List of genre dictionaries with percentages
        """
        all_genres = []
        
        try:
            for track in track_info:
                for artist_data in track.get('artist_info', []):
                    artist_id = artist_data['id']
                    artist_genres = genre_cache.get(artist_id, [])
                    parent_genres = []
                    
                    for genre in artist_genres:
                        for parent_genre, keywords in GENRE_MAPPING.items():
                            if any(keyword in genre for keyword in keywords):
                                parent_genres.append(parent_genre)
                                break
                    
                    if not parent_genres:
                        parent_genres.append('Miscellaneous/World')
                    
                    all_genres.extend(parent_genres)
            
            if not all_genres:
                return []
            
            genre_counts = Counter(all_genres)
            total = len(all_genres)
            most_common = genre_counts.most_common(num_genres)
            
            return [
                {'name': genre, 'percentage': round((count / total) * 100, 2)}
                for genre, count in most_common
            ]
            
        except Exception as e:
            logger.error(f"Error getting popular genres: {str(e)}")
            return []
