"""
Spotify service layer - Handles all Spotify API interactions
Separates business logic from route handlers
"""

from typing import Dict, List, Set, Tuple, Optional
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from spotipy.exceptions import SpotifyException
import re
from collections import Counter
import math
import statistics

from logger import get_logger

logger = get_logger(__name__)


class SpotifyService:
    """Service class for Spotify API operations"""
    
    # Class-level regex pattern
    PLAYLIST_URL_REGEX = r'^https://open\.spotify\.com/playlist/[a-zA-Z0-9_-]+(\?si=[a-zA-Z0-9_-]+)?$'
    
    def __init__(self, client_id: str, client_secret: str):
        """
        Initialize Spotify service with credentials
        
        Args:
            client_id: Spotify API client ID
            client_secret: Spotify API client secret
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self._client: Optional[spotipy.Spotify] = None
        
    @property
    def client(self) -> spotipy.Spotify:
        """Lazy-load Spotify client"""
        if self._client is None:
            try:
                auth_manager = SpotifyClientCredentials(
                    client_id=self.client_id,
                    client_secret=self.client_secret
                )
                self._client = spotipy.Spotify(
                    auth_manager=auth_manager,
                    requests_timeout=30
                )
                logger.info("Spotify client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Spotify client: {str(e)}")
                raise
        return self._client
    
    @staticmethod
    def validate_playlist_url(url: str) -> bool:
        """
        Validate Spotify playlist URL format
        
        Args:
            url: Playlist URL to validate
            
        Returns:
            True if valid, False otherwise
        """
        return bool(re.match(SpotifyService.PLAYLIST_URL_REGEX, url))
    
    def is_valid_playlist_url(self, url: str) -> bool:
        """
        Validate if the given URL is a valid Spotify playlist URL.

        Args:
        url (str): The Spotify playlist URL to validate.

        Returns:
        bool: True if the URL is valid, False otherwise.
        """
        pattern = re.compile(self.PLAYLIST_URL_REGEX)
        return bool(pattern.match(url))
    
    def fetch_playlist_data(self, playlist_url: str) -> Tuple[str, Optional[str], List[Dict], Set[str]]:
        """
        Fetch playlist tracks and metadata
        
        Args:
            playlist_url: Spotify playlist URL
            
        Returns:
            Tuple of (playlist_name, playlist_image, track_info, artist_ids)
            
        Raises:
            ValueError: If URL is invalid or playlist is private
            SpotifyException: If API call fails
        """
        try:
            # Extract playlist ID
            playlist_id = playlist_url.split('?')[0].split('/')[-1]
            logger.info(f"Fetching playlist: {playlist_id}")
            
            # Fetch playlist metadata
            playlist = self.client.playlist(playlist_id)
            logger.debug(f"Spotify API response: {playlist}")
            playlist_name = playlist['name']
            playlist_image = playlist['images'][0]['url'] if playlist.get('images') else None
            
            # Fetch tracks
            track_info = []
            artist_ids = set()
            results = self.client.playlist_tracks(playlist_id)
            
            while results:
                for item in results['items']:
                    track = item.get('track')
                    if not track:
                        continue
                    
                    track_data = self._parse_track(track)
                    if track_data:
                        track_info.append(track_data)
                        # Collect artist IDs
                        for artist in track_data['artist_info']:
                            artist_ids.add(artist['id'])
                
                # Handle pagination
                if results['next']:
                    results = self.client.next(results)
                else:
                    break
            
            logger.info(f"Fetched {len(track_info)} tracks with {len(artist_ids)} unique artists")
            return playlist_name, playlist_image, track_info, artist_ids
            
        except SpotifyException as e:
            logger.error(f"Spotify API error: {str(e)}")
            if e.http_status == 404:
                logger.debug(f"Playlist tracks response: {results}")
                raise ValueError("Playlist not found or is private")
            logger.error(f"Spotify API error details: {e.response.json()}")
            raise
        except Exception as e:
            logger.error(f"Error fetching playlist data: {str(e)}")
            raise
    
    @staticmethod
    def _parse_track(track: Dict) -> Optional[Dict]:
        """
        Parse track data from Spotify API response
        
        Args:
            track: Track dictionary from Spotify API
            
        Returns:
            Parsed track info or None if invalid
        """
        try:
            release_date = track['album'].get('release_date')
            release_year = int(release_date.split('-')[0]) if release_date else None
            
            album_images = track['album'].get('images', [])
            album_image = album_images[0]['url'] if album_images else None
            album_image_small = album_images[-1]['url'] if album_images else None
            
            duration_ms = track.get('duration_ms', 0)
            duration_min = duration_ms // 60000
            duration_sec = (duration_ms % 60000) // 1000
            duration_formatted = f"{duration_min}:{duration_sec:02d}"
            
            artist_info = [
                {'name': artist['name'], 'id': artist['id']}
                for artist in track['artists']
            ]
            
            return {
                'name': track['name'],
                'artists': [artist['name'] for artist in track['artists']],
                'artist_info': artist_info,
                'popularity': track['popularity'],
                'release_year': release_year,
                'album': track['album']['name'],
                'album_image': album_image,
                'album_image_small': album_image_small,
                'duration_ms': duration_ms,
                'duration': duration_formatted,
                'explicit': track.get('explicit', False),
                'preview_url': track.get('preview_url'),
                'spotify_url': track['external_urls'].get('spotify'),
            }
        except (KeyError, TypeError) as e:
            logger.warning(f"Failed to parse track: {str(e)}")
            return None
    
    def batch_fetch_artist_genres(self, artist_ids: Set[str]) -> Dict[str, List[str]]:
        """
        Batch fetch genres for multiple artists
        
        Args:
            artist_ids: Set of artist IDs
            
        Returns:
            Dictionary mapping artist_id to list of genres
        """
        artist_genres = {}
        artist_id_list = list(artist_ids)
        batch_size = 50  # Spotify API limit
        
        try:
            for i in range(0, len(artist_id_list), batch_size):
                batch = artist_id_list[i:i + batch_size]
                artists_data = self.client.artists(batch)
                
                for artist in artists_data['artists']:
                    if artist:
                        artist_genres[artist['id']] = artist.get('genres', [])
            
            logger.info(f"Fetched genres for {len(artist_genres)} artists")
            return artist_genres
            
        except Exception as e:
            logger.error(f"Error batch fetching genres: {str(e)}")
            # Fallback to empty genres if batch fails
            return {aid: [] for aid in artist_ids}
    
    def batch_fetch_audio_features(self, track_info: List[Dict]) -> Dict[str, Dict]:
        """
        Batch fetch audio features for tracks
        
        Args:
            track_info: List of track dictionaries with 'spotify_url'
            
        Returns:
            Dictionary mapping track spotify_url to audio features
        """
        audio_features_map = {}
        
        try:
            # Extract track IDs from spotify URLs
            track_ids = []
            url_to_id_map = {}
            for track in track_info:
                spotify_url = track.get('spotify_url')
                if spotify_url:
                    track_id = spotify_url.split('/')[-1].split('?')[0]
                    track_ids.append(track_id)
                    url_to_id_map[track_id] = spotify_url
            
            if not track_ids:
                logger.warning("No track IDs available for audio features")
                return {}
            
            # Fetch in batches (Spotify API limit: 100 tracks per request).
            # If a batch request fails (403 or other transient error), retry with
            # smaller sub-batches to isolate problematic IDs and continue.
            initial_batch_size = 100
            for i in range(0, len(track_ids), initial_batch_size):
                batch = track_ids[i:i + initial_batch_size]
                try:
                    features_batch = self.client.audio_features(batch)
                except Exception as e:
                    logger.warning(f"audio_features batch request failed for {len(batch)} ids: {str(e)}")
                    # Retry in smaller chunks (diagnostic + more likely to succeed)
                    small_size = 25
                    for j in range(0, len(batch), small_size):
                        small_batch = batch[j:j + small_size]
                        try:
                            features_batch_small = self.client.audio_features(small_batch)
                        except Exception as e2:
                            logger.error(f"audio_features sub-batch failed ({len(small_batch)}): {str(e2)}")
                            # Optionally try per-id to log failures (slow)
                            for single_id in small_batch:
                                try:
                                    single_fb = self.client.audio_features([single_id])
                                    fb_list = single_fb or []
                                except Exception as e3:
                                    logger.error(f"audio_features single id {single_id} failed: {str(e3)}")
                                    fb_list = []
                                for features in fb_list:
                                    if features:
                                        tid = features.get('id')
                                        spotify_url = url_to_id_map.get(tid)
                                        if spotify_url:
                                            audio_features_map[spotify_url] = {
                                                'energy': features.get('energy', 0.5),
                                                'valence': features.get('valence', 0.5),
                                                'danceability': features.get('danceability', 0.5),
                                                'tempo': features.get('tempo', 120),
                                                'loudness': features.get('loudness', -10),
                                                'acousticness': features.get('acousticness', 0.5),
                                                'instrumentalness': features.get('instrumentalness', 0.0),
                                                'speechiness': features.get('speechiness', 0.1),
                                                'key': features.get('key'),
                                                'mode': features.get('mode'),
                                            }
                        else:
                            for features in features_batch_small:
                                if features:
                                    tid = features.get('id')
                                    spotify_url = url_to_id_map.get(tid)
                                    if spotify_url:
                                        audio_features_map[spotify_url] = {
                                            'energy': features.get('energy', 0.5),
                                            'valence': features.get('valence', 0.5),
                                            'danceability': features.get('danceability', 0.5),
                                            'tempo': features.get('tempo', 120),
                                            'loudness': features.get('loudness', -10),
                                            'acousticness': features.get('acousticness', 0.5),
                                            'instrumentalness': features.get('instrumentalness', 0.0),
                                            'speechiness': features.get('speechiness', 0.1),
                                            'key': features.get('key'),
                                            'mode': features.get('mode'),
                                        }
                            logger.debug(f"Processed sub-batch of {len(small_batch)} ids")
                    # move on to next initial batch
                    continue

                # Process successful initial batch
                for features in features_batch:
                    if features:
                        track_id = features.get('id')
                        spotify_url = url_to_id_map.get(track_id)
                        if spotify_url:
                            audio_features_map[spotify_url] = {
                                'energy': features.get('energy', 0.5),
                                'valence': features.get('valence', 0.5),
                                'danceability': features.get('danceability', 0.5),
                                'tempo': features.get('tempo', 120),
                                'loudness': features.get('loudness', -10),
                                'acousticness': features.get('acousticness', 0.5),
                                'instrumentalness': features.get('instrumentalness', 0.0),
                                'speechiness': features.get('speechiness', 0.1),
                                'key': features.get('key'),
                                'mode': features.get('mode'),
                            }

                logger.debug(f"batch_fetch_audio_features: requested {len(batch)} ids, returned {len(features_batch)} feature objects")

            logger.info(f"Fetched audio features for {len(audio_features_map)} tracks")
            return audio_features_map
            
        except Exception as e:
            logger.error(f"Error batch fetching audio features: {str(e)}")
            # Return empty dict on failure
            return {}
    
    def get_bridge_recommendations(self, target_features: Dict,
                                     seed_track_ids: List[str],
                                     existing_names: set,
                                     limit: int = 5) -> List[Dict]:
        """

                        # Debug info for this batch
                        logger.debug(
                            f"batch_fetch_audio_features: requested {len(batch)} ids, returned {len(features_batch)} feature objects"
                        )

        Get bridge-track recommendations from Spotify based on target audio features.

        Args:
            target_features: Dict with target energy, valence, danceability, tempo, etc.
            seed_track_ids: Up to 5 Spotify track IDs to seed from.
            existing_names: Set of track names already in the playlist (to dedupe).
            limit: Max results.

        Returns:
            List of parsed track dicts.
        """
        try:
            kwargs = {
                'seed_tracks': seed_track_ids[:5],
                'limit': limit,
                'target_energy': target_features.get('energy'),
                'target_valence': target_features.get('valence'),
                'target_danceability': target_features.get('danceability'),
                'target_tempo': target_features.get('tempo'),
            }
            # Remove None values
            kwargs = {k: v for k, v in kwargs.items() if v is not None}

            results = self.client.recommendations(**kwargs)
            recommendations = []
            for item in results.get('tracks', []):
                if item['name'] in existing_names:
                    continue
                track_data = self._parse_track(item)
                if track_data:
                    recommendations.append(track_data)
            logger.info(f"Generated {len(recommendations)} bridge recommendations")
            return recommendations[:limit]
        except Exception as e:
            logger.error(f"Error getting bridge recommendations: {str(e)}")
            return []

    def get_recommendations(self, track_info: List[Dict], genre_cache: Dict, limit: int = 10) -> List[Dict]:
        """
        Generate track recommendations based on playlist
        
        Args:
            track_info: List of track dictionaries
            genre_cache: Cached artist genres
            limit: Maximum recommendations to return
            
        Returns:
            List of recommended tracks
        """
        recommendations = []
        existing_artists = {artist for track in track_info for artist in track['artists']}
        included_albums = set()

        # Build a name → genres map so lookups work (genre_cache is keyed by ID)
        name_to_genres = {}
        for track in track_info:
            for artist_obj in track.get('artist_info', []):
                aid = artist_obj.get('id', '')
                name = artist_obj.get('name', '')
                if name and aid:
                    name_to_genres[name] = genre_cache.get(aid, [])

        # Calculate dominant genres in the playlist
        genre_counts = {}
        for artist_name, genres in name_to_genres.items():
            for genre in genres:
                genre_counts[genre] = genre_counts.get(genre, 0) + 1

        # Sort genres by frequency
        sorted_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)
        dominant_genres = {genre for genre, count in sorted_genres[:3]}  # Top 3 genres

        try:
            # Limit artists to process
            for artist in list(existing_artists)[:5]:
                results = self.client.search(q=f'artist:{artist}', type='track', limit=5)

                for item in results['tracks']['items']:
                    if len(recommendations) >= limit:
                        break

                    # Skip tracks already in playlist
                    if item['name'] in {t['name'] for t in track_info}:
                        continue

                    # Skip duplicate albums
                    if item['album']['name'] in included_albums:
                        continue

                    # Filter by dominant genres
                    track_artist_id = item['artists'][0].get('id', '')
                    track_genres = genre_cache.get(track_artist_id, []) or name_to_genres.get(item['artists'][0]['name'], [])
                    if dominant_genres and not any(genre in dominant_genres for genre in track_genres):
                        continue

                    track_data = self._parse_track(item)
                    if track_data:
                        # Calculate genre similarity
                        genre_similarity = len(set(track_genres) & dominant_genres) / len(dominant_genres)
                        track_data['genre_similarity'] = genre_similarity

                        # Add to recommendations if similarity is above threshold
                        if genre_similarity > 0.3:  # Threshold for genre similarity
                            recommendations.append(track_data)
                            included_albums.add(item['album']['name'])

                if len(recommendations) >= limit:
                    break

            # Fallback: search using top genres from the playlist
            if len(recommendations) < limit:
                fallback_query = ' '.join(list(dominant_genres)[:2]) if dominant_genres else 'music'
                additional_results = self.client.search(q=fallback_query, type='track', limit=limit - len(recommendations))
                for item in additional_results['tracks']['items']:
                    if len(recommendations) >= limit:
                        break

                    # Skip tracks already in playlist
                    if item['name'] in {t['name'] for t in track_info}:
                        continue

                    # Skip duplicate albums
                    if item['album']['name'] in included_albums:
                        continue

                    track_data = self._parse_track(item)
                    if track_data:
                        track_data['genre_similarity'] = 0
                        recommendations.append(track_data)
                        included_albums.add(item['album']['name'])

            # Sort by genre similarity and popularity
            recommendations.sort(key=lambda x: (x['genre_similarity'], x['popularity']), reverse=True)
            logger.info(f"Generated {len(recommendations)} recommendations")

            return recommendations[:limit]

        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return []
