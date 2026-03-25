"""
Analysis service - Playlist DNA analysis
Builds timeline data, detects vibe outliers, and provides smart reordering.
No scoring or rating — just data visualisation and tools.
"""

from typing import Dict, List
from collections import Counter
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

# Audio feature keys used for timeline and outlier detection
_TIMELINE_FEATURES = ['energy', 'valence', 'danceability', 'tempo', 'acousticness']


class AnalysisService:
    """Service for Playlist DNA analysis — timeline, outliers, reorder."""

    # ------------------------------------------------------------------ #
    #  Timeline                                                          #
    # ------------------------------------------------------------------ #
    @staticmethod
    def build_timeline_data(track_info: List[Dict]) -> List[Dict]:
        """
        Build per-track timeline data from audio features.

        Returns a list (one entry per track, in playlist order) of dicts:
            { position, name, artists, energy, valence, danceability,
              tempo, acousticness }
        Tracks without audio features are included with null values.
        """
        timeline = []
        for i, track in enumerate(track_info):
            af = track.get('audio_features')
            entry = {
                'position': i,
                'name': track.get('name', ''),
                'artists': track.get('artists', []),
            }
            if af:
                for key in _TIMELINE_FEATURES:
                    entry[key] = af.get(key)
            else:
                for key in _TIMELINE_FEATURES:
                    entry[key] = None
            timeline.append(entry)
        return timeline

    # ------------------------------------------------------------------ #
    #  Outlier detection                                                 #
    # ------------------------------------------------------------------ #
    @staticmethod
    def detect_outliers(track_info: List[Dict], z_threshold: float = 1.8) -> List[Dict]:
        """
        Detect vibe outliers using z-scores across audio features.

        A track is an outlier if *any* of its feature z-scores exceeds
        the threshold.  Returns a list of dicts:
            { position, name, artists, outlier_features: [{feature, value, z_score, direction}] }
        """
        features_to_check = ['energy', 'valence', 'danceability', 'acousticness']
        # Collect per-feature values (only tracks that have audio features)
        feature_values: Dict[str, List[float]] = {f: [] for f in features_to_check}
        indices_with_features: List[int] = []

        for i, track in enumerate(track_info):
            af = track.get('audio_features')
            if not af:
                continue
            indices_with_features.append(i)
            for f in features_to_check:
                val = af.get(f)
                feature_values[f].append(val if val is not None else 0.5)

        if len(indices_with_features) < 3:
            return []

        # Compute means and stdevs
        stats_map: Dict[str, Dict] = {}
        for f in features_to_check:
            vals = feature_values[f]
            mean = statistics.mean(vals)
            stdev = statistics.pstdev(vals)
            stats_map[f] = {'mean': mean, 'stdev': stdev}

        outliers = []
        value_idx = 0
        for idx in indices_with_features:
            track = track_info[idx]
            af = track['audio_features']
            outlier_features = []
            for f in features_to_check:
                val = af.get(f, 0.5)
                s = stats_map[f]
                if s['stdev'] == 0:
                    continue
                z = (val - s['mean']) / s['stdev']
                if abs(z) >= z_threshold:
                    outlier_features.append({
                        'feature': f,
                        'value': round(val, 3),
                        'z_score': round(z, 2),
                        'direction': 'high' if z > 0 else 'low',
                    })
            if outlier_features:
                outliers.append({
                    'position': idx,
                    'name': track.get('name', ''),
                    'artists': track.get('artists', []),
                    'outlier_features': outlier_features,
                })
            value_idx += 1

        logger.info(f"Detected {len(outliers)} outlier tracks out of {len(indices_with_features)}")
        return outliers

    # ------------------------------------------------------------------ #
    #  Smart Reorder                                                      #
    # ------------------------------------------------------------------ #
    @staticmethod
    def smart_reorder(track_info: List[Dict], shape: str = 'build-up') -> List[int]:
        """
        Reorder tracks to match a target energy curve.

        Supported shapes:
            build-up   — low → high energy
            wind-down  — high → low energy
            wave       — low → high → low (arc)
            steady     — minimise energy jumps (nearest-neighbour)

        Returns a list of original indices in the new order.
        """
        tracks_with_energy = []
        for i, track in enumerate(track_info):
            af = track.get('audio_features')
            energy = af.get('energy', 0.5) if af else 0.5
            tracks_with_energy.append((i, energy))

        if shape == 'build-up':
            tracks_with_energy.sort(key=lambda x: x[1])
        elif shape == 'wind-down':
            tracks_with_energy.sort(key=lambda x: x[1], reverse=True)
        elif shape == 'wave':
            tracks_with_energy.sort(key=lambda x: x[1])
            half = len(tracks_with_energy) // 2
            rising = tracks_with_energy[:half]
            falling = tracks_with_energy[half:]
            falling.sort(key=lambda x: x[1], reverse=True)
            tracks_with_energy = rising + falling
        elif shape == 'steady':
            tracks_with_energy = AnalysisService._nearest_neighbour_order(tracks_with_energy)
        else:
            logger.warning(f"Unknown reorder shape '{shape}', defaulting to build-up")
            tracks_with_energy.sort(key=lambda x: x[1])

        return [idx for idx, _ in tracks_with_energy]

    @staticmethod
    def _nearest_neighbour_order(items: List[tuple]) -> List[tuple]:
        """Greedy nearest-neighbour ordering by energy to minimise jumps."""
        if not items:
            return items
        remaining = list(items)
        # Start from the track closest to the median energy
        energies = [e for _, e in remaining]
        median_energy = statistics.median(energies)
        remaining.sort(key=lambda x: abs(x[1] - median_energy))
        ordered = [remaining.pop(0)]
        while remaining:
            last_energy = ordered[-1][1]
            remaining.sort(key=lambda x: abs(x[1] - last_energy))
            ordered.append(remaining.pop(0))
        return ordered

    # ------------------------------------------------------------------ #
    #  Genre helpers (kept from original)                                #
    # ------------------------------------------------------------------ #
    @staticmethod
    def get_popular_genres(track_info: List[Dict], genre_cache: Dict, num_genres: int = 3) -> List[Dict]:
        """
        Get most popular genres in playlist.

        Returns list of dicts: [{ name, percentage }]
        """
        all_genres = []

        try:
            for track in track_info:
                for artist_data in track.get('artist_info', []):
                    artist_id = artist_data['id']
                    artist_genres = genre_cache.get(artist_id, [])
                    all_genres.extend(artist_genres)

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
