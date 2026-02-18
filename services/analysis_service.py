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
    
    # Default rating weights (for 'general' purpose)
    DEFAULT_WEIGHTS = {
        'artist': 0.30,
        'popularity': 0.25,
        'genre': 0.25,
        'length': 0.15,
        'era': 0.05,
        'flow': 0.0
    }
    
    # Context-specific weighting adjustments
    CONTEXT_WEIGHTS = {
        'general': {
            'artist': 0.25, 'popularity': 0.20, 'genre': 0.25, 'length': 0.15, 'era': 0.05, 'flow': 0.10
        },
        'party': {
            'artist': 0.15, 'popularity': 0.30, 'genre': 0.15, 'length': 0.10, 'era': 0.05, 'flow': 0.25
        },
        'workout': {
            'artist': 0.15, 'popularity': 0.15, 'genre': 0.20, 'length': 0.10, 'era': 0.05, 'flow': 0.35
        },
        'focus': {
            'artist': 0.20, 'popularity': 0.10, 'genre': 0.30, 'length': 0.15, 'era': 0.05, 'flow': 0.20
        },
        'discovery': {
            'artist': 0.35, 'popularity': 0.15, 'genre': 0.20, 'length': 0.10, 'era': 0.10, 'flow': 0.10
        },
        'background': {
            'artist': 0.20, 'popularity': 0.10, 'genre': 0.30, 'length': 0.15, 'era': 0.05, 'flow': 0.20
        },
        'roadtrip': {
            'artist': 0.25, 'popularity': 0.20, 'genre': 0.15, 'length': 0.20, 'era': 0.05, 'flow': 0.15
        }
    }
    
    @staticmethod
    def calculate_ratings(track_info: List[Dict], genre_cache: Dict, purpose: str = 'general') -> Dict[str, float]:
        """
        Calculate all playlist ratings with context awareness
        
        Args:
            track_info: List of track dictionaries
            genre_cache: Cached artist genres
            purpose: Playlist purpose/context
            
        Returns:
            Dictionary of rating metrics
        """
        try:
            # Get context-specific weights
            weights = AnalysisService.CONTEXT_WEIGHTS.get(purpose, AnalysisService.CONTEXT_WEIGHTS['general'])
            
            # Calculate individual ratings
            artist_diversity = AnalysisService._calculate_artist_diversity(track_info)
            popularity = AnalysisService._calculate_popularity_rating(track_info, purpose)
            genre_cohesion = AnalysisService._calculate_genre_diversity(track_info, genre_cache)
            length = AnalysisService._calculate_length_rating(len(track_info), purpose)
            era_diversity = AnalysisService._calculate_era_diversity(track_info)
            flow_score = AnalysisService._calculate_flow_score(track_info, purpose)
            
            # Calculate weighted overall rating
            overall = (
                weights['artist'] * artist_diversity +
                weights['popularity'] * popularity +
                weights['genre'] * genre_cohesion +
                weights['length'] * length +
                weights['era'] * era_diversity +
                weights['flow'] * flow_score
            )
            
            ratings = {
                'artist_diversity_rating': round(artist_diversity * 100, 2),
                'popularity_rating': round(popularity * 100, 2),
                'genre_cohesion_rating': round(genre_cohesion * 100, 2),
                'playlist_length_rating': round(length * 100, 2),
                'era_diversity_rating': round(era_diversity * 100, 2),
                'flow_score_rating': round(flow_score * 100, 2),
                'overall_rating': round(overall * 100, 2),
                'context': purpose
            }
            
            logger.info(f"Calculated ratings for '{purpose}' context - Overall: {ratings['overall_rating']}%")
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
    def _calculate_popularity_rating(track_info: List[Dict], purpose: str = 'general') -> float:
        """Calculate popularity balance score with context awareness"""
        popularities = [track['popularity'] for track in track_info]
        
        if not popularities:
            return 0.5
        
        avg_pop = sum(popularities) / len(popularities)
        
        # Context-specific ideal popularity ranges
        ideal_ranges = {
            'party': (70, 90),        # Favor hits
            'workout': (60, 80),      # Energetic popular tracks
            'focus': (30, 50),        # Calmer, less mainstream
            'discovery': (20, 40),    # Underground/indie
            'background': (30, 50),   # Not too attention-grabbing
            'roadtrip': (50, 70),     # Mix of familiar and new
            'general': (50, 70)       # Balanced
        }
        
        ideal_low, ideal_high = ideal_ranges.get(purpose, (50, 70))
        ideal_mid = (ideal_low + ideal_high) / 2
        
        # Score based on how close avg is to ideal range
        if ideal_low <= avg_pop <= ideal_high:
            avg_score = 1.0
        else:
            distance = min(abs(avg_pop - ideal_low), abs(avg_pop - ideal_high))
            avg_score = max(0, 1.0 - (distance / 50))
        
        # Variety score (std dev)
        if len(popularities) > 1:
            std_pop = statistics.stdev(popularities)
            # More variety is good for discovery, less for party/workout
            if purpose in ['party', 'workout']:
                ideal_std = 15  # Lower variety for consistency
            elif purpose == 'discovery':
                ideal_std = 35  # Higher variety for exploration
            else:
                ideal_std = 25  # Moderate variety
            
            variety_score = max(0, min(1, 1.0 - abs(std_pop - ideal_std) / ideal_std))
        else:
            variety_score = 0.5
        
        return 0.7 * avg_score + 0.3 * variety_score
    
    @staticmethod
    def _calculate_length_rating(track_count: int, purpose: str = 'general') -> float:
        """Calculate playlist length score with context awareness"""
        # Context-specific ideal lengths
        ideal_lengths = {
            'party': (20, 40),        # Medium-sized for 2-3 hours
            'workout': (15, 30),      # 45min to 1.5 hours
            'focus': (20, 60),        # Longer for deep work sessions
            'discovery': (15, 25),    # Shorter to sample variety
            'background': (30, 100),  # Longer for ambient listening
            'roadtrip': (40, 100),    # Long for extended trips
            'general': (20, 50)       # Moderate length
        }
        
        ideal_min, ideal_max = ideal_lengths.get(purpose, (20, 50))
        
        # Score based on proximity to ideal range
        if ideal_min <= track_count <= ideal_max:
            # Within ideal range - score based on position in range
            range_position = (track_count - ideal_min) / (ideal_max - ideal_min)
            return 0.9 + (0.1 * (1 - abs(range_position - 0.5) * 2))  # Peak at midpoint
        elif track_count < ideal_min:
            # Too short - linear penalty
            return max(0.3, track_count / ideal_min * 0.85)
        else:
            # Too long - logarithmic penalty (less harsh)
            excess_ratio = (track_count - ideal_max) / ideal_max
            return max(0.4, 0.85 - (excess_ratio * 0.3))
    
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
    def _calculate_flow_score(track_info: List[Dict], purpose: str = 'general') -> float:
        """
        Calculate playlist flow/consistency score based on audio features
        
        Analyzes transitions between tracks for smooth energy/tempo progression
        """
        if len(track_info) < 2:
            return 0.8  # Can't judge flow with < 2 tracks
        
        # Extract tracks with audio features
        tracks_with_features = [
            track for track in track_info 
            if track.get('audio_features')
        ]
        
        if len(tracks_with_features) < 2:
            logger.warning("Insufficient audio features for flow analysis")
            return 0.5  # Neutral score if features unavailable
        
        # Context-specific flow expectations
        flow_priorities = {
            'party': {'energy': 0.5, 'tempo': 0.4, 'valence': 0.1},
            'workout': {'energy': 0.6, 'tempo': 0.4, 'valence': 0.0},
            'focus': {'energy': 0.3, 'tempo': 0.2, 'valence': 0.5},
            'discovery': {'energy': 0.2, 'tempo': 0.2, 'valence': 0.6},
            'background': {'energy': 0.4, 'tempo': 0.2, 'valence': 0.4},
            'roadtrip': {'energy': 0.3, 'tempo': 0.3, 'valence': 0.4},
            'general': {'energy': 0.4, 'tempo': 0.3, 'valence': 0.3}
        }
        
        priorities = flow_priorities.get(purpose, flow_priorities['general'])
        
        # Calculate transition smoothness
        energy_transitions = []
        tempo_transitions = []
        valence_transitions = []
        
        for i in range(len(tracks_with_features) - 1):
            curr = tracks_with_features[i]['audio_features']
            next = tracks_with_features[i + 1]['audio_features']
            
            # Calculate differences (normalized to 0-1)
            energy_diff = abs(curr['energy'] - next['energy'])
            tempo_diff = abs(curr['tempo'] - next['tempo']) / 200  # Normalize tempo (typical range 0-200 BPM)
            valence_diff = abs(curr['valence'] - next['valence'])
            
            energy_transitions.append(energy_diff)
            tempo_transitions.append(tempo_diff)
            valence_transitions.append(valence_diff)
        
        # Calculate average smoothness (lower diff = smoother = better)
        avg_energy_smoothness = 1.0 - (sum(energy_transitions) / len(energy_transitions))
        avg_tempo_smoothness = 1.0 - (sum(tempo_transitions) / len(tempo_transitions))
        avg_valence_smoothness = 1.0 - (sum(valence_transitions) / len(valence_transitions))
        
        # Context-specific ideal consistencies
        ideal_consistency = {
            'party': 0.75,      # High consistency
            'workout': 0.85,     # Very high consistency
            'focus': 0.80,       # High consistency for concentration
            'discovery': 0.50,   # Lower consistency for variety
            'background': 0.75,  # Consistent ambient
            'roadtrip': 0.65,    # Moderate variety
            'general': 0.70      # Balanced
        }
        
        target_consistency = ideal_consistency.get(purpose, 0.70)
        
        # Weighted flow score based on context priorities
        raw_flow = (
            priorities['energy'] * avg_energy_smoothness +
            priorities['tempo'] * avg_tempo_smoothness +
            priorities['valence'] * avg_valence_smoothness
        )
        
        # Adjust based on how close to ideal consistency
        if raw_flow >= target_consistency:
            # Reward being at or above target
            flow_score = min(1.0, 0.8 + (raw_flow - target_consistency) * 0.5)
        else:
            # Penalize being below target
            flow_score = raw_flow * (0.8 / target_consistency)
        
        return max(0.0, min(1.0, flow_score))
    
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
