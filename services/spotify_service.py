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
    
    PLAYLIST_URL_REGEX = r'^https://open\.spotify\.com/playlist/[a-zA-Z0-9_-]+(\?si=[a-zA-Z0-9_-]+)?$'
    
    def __init__(self, client_id: str, client_secret: str):
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
                self._client = spotipy.Spotify(auth_manager=auth_manager, requests_timeout=30)
                logger.info("Spotify client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Spotify client: {str(e)}")
                raise
        return self._client

    @staticmethod
    def validate_playlist_url(url: str) -> bool:
        """Validate Spotify playlist URL format"""
        return bool(re.match(SpotifyService.PLAYLIST_URL_REGEX, url))

    def fetch_playlist_data(self, playlist_url: str) -> Tuple[str, Optional[str], List[Dict], Set[str]]:
        """
        Fetch playlist tracks and metadata, handling pagination
        
        Returns:
            playlist_name, playlist_image, track_info, artist_ids
        """
        if not self.validate_playlist_url(playlist_url):
            raise ValueError("Invalid Spotify playlist URL")
        
        try:
            playlist_id = playlist_url.split('?')[0].split('/')[-1]
            logger.info(f"Fetching playlist: {playlist_id}")
            
            playlist = self.client.playlist(playlist_id)
            playlist_name = playlist.get('name')
            playlist_image = playlist.get('images', [{}])[0].get('url')
            
            track_info: List[Dict] = []
            artist_ids: Set[str] = set()

            results = self.client.playlist_tracks(playlist_id, limit=50)
            
            while results:
                for item in results.get('items', []):
                    track = item.get('track')
                    if not track:
                        continue
                    track_data = self._parse_track(track)
                    if track_data:
                        track_info.append(track_data)
                        for artist in track_data['artist_info']:
                            if artist.get('id'):
                                artist_ids.add(artist['id'])
                
                # Pagination
                if results.get('next'):
                    results = self.client.next(results)
                else:
                    break
            
            logger.info(f"Fetched {len(track_info)} tracks with {len(artist_ids)} unique artists")
            return playlist_name, playlist_image, track_info, artist_ids
        
        except SpotifyException as e:
            status = getattr(e, 'http_status', None)
            logger.error(f"Spotify API error: {str(e)}")

            if status == 404:
                raise ValueError("Playlist not found or is private")
            if status == 403:
                raise PermissionError("Spotify API returned 403 Forbidden — check credentials, scopes, and playlist visibility")
            raise
        except Exception as e:
            logger.error(f"Error fetching playlist data: {str(e)}")
            raise

    @staticmethod
    def _parse_track(track: Dict) -> Optional[Dict]:
        """Parse Spotify track object"""
        try:
            release_date = track.get('album', {}).get('release_date')
            release_year = int(release_date.split('-')[0]) if release_date else None

            album_images = track.get('album', {}).get('images', [])
            album_image = album_images[0]['url'] if album_images else None
            album_image_small = album_images[-1]['url'] if album_images else None

            duration_ms = track.get('duration_ms', 0)
            duration_min = duration_ms // 60000
            duration_sec = (duration_ms % 60000) // 1000
            duration_formatted = f"{duration_min}:{duration_sec:02d}"

            artist_info = [{'name': a['name'], 'id': a['id']} for a in track.get('artists', [])]

            return {
                'name': track.get('name'),
                'artists': [a['name'] for a in track.get('artists', [])],
                'artist_info': artist_info,
                'popularity': track.get('popularity'),
                'release_year': release_year,
                'album': track.get('album', {}).get('name'),
                'album_image': album_image,
                'album_image_small': album_image_small,
                'duration_ms': duration_ms,
                'duration': duration_formatted,
                'explicit': track.get('explicit', False),
                'preview_url': track.get('preview_url'),
                'spotify_url': track.get('external_urls', {}).get('spotify'),
            }
        except Exception as e:
            logger.warning(f"Failed to parse track: {str(e)}")
            return None

    # ---------------- Batch operations ----------------
    def batch_fetch_artist_genres(self, artist_ids: Set[str]) -> Dict[str, List[str]]:
        artist_genres = {}
        artist_list = list(artist_ids)
        batch_size = 50
        try:
            for i in range(0, len(artist_list), batch_size):
                batch = artist_list[i:i+batch_size]
                data = self.client.artists(batch)
                for artist in data.get('artists', []):
                    if artist:
                        artist_genres[artist['id']] = artist.get('genres', [])
            return artist_genres
        except Exception as e:
            logger.error(f"Error fetching artist genres: {str(e)}")
            return {aid: [] for aid in artist_ids}

    def batch_fetch_audio_features(self, track_info: List[Dict]) -> Dict[str, Dict]:
        audio_features_map = {}
        try:
            track_ids = []
            url_map = {}
            for t in track_info:
                url = t.get('spotify_url')
                if url:
                    tid = url.split('/')[-1].split('?')[0]
                    track_ids.append(tid)
                    url_map[tid] = url
            if not track_ids:
                return {}
            
            batch_size = 100
            for i in range(0, len(track_ids), batch_size):
                batch = track_ids[i:i+batch_size]
                features_batch = self.client.audio_features(batch)
                for f in features_batch or []:
                    if f and f.get('id'):
                        tid = f['id']
                        spotify_url = url_map.get(tid)
                        if spotify_url:
                            audio_features_map[spotify_url] = {
                                'energy': f.get('energy', 0.5),
                                'valence': f.get('valence', 0.5),
                                'danceability': f.get('danceability', 0.5),
                                'tempo': f.get('tempo', 120),
                                'loudness': f.get('loudness', -10),
                                'acousticness': f.get('acousticness', 0.5),
                                'instrumentalness': f.get('instrumentalness', 0.0),
                                'speechiness': f.get('speechiness', 0.1),
                                'key': f.get('key'),
                                'mode': f.get('mode'),
                            }
            return audio_features_map
        except Exception as e:
            logger.error(f"Error fetching audio features: {str(e)}")
            return {}

    # ---------------- Recommendations ----------------
    def get_bridge_recommendations(self, target_features: Dict, seed_track_ids: List[str],
                                   existing_names: set, limit: int = 5) -> List[Dict]:
        try:
            kwargs = {
                'seed_tracks': seed_track_ids[:5],
                'limit': limit,
                'target_energy': target_features.get('energy'),
                'target_valence': target_features.get('valence'),
                'target_danceability': target_features.get('danceability'),
                'target_tempo': target_features.get('tempo')
            }
            kwargs = {k: v for k, v in kwargs.items() if v is not None}
            results = self.client.recommendations(**kwargs)
            recommendations = []
            for item in results.get('tracks', []):
                if item['name'] in existing_names:
                    continue
                t = self._parse_track(item)
                if t:
                    recommendations.append(t)
            return recommendations[:limit]
        except Exception as e:
            logger.error(f"Error generating bridge recommendations: {str(e)}")
            return []

    def get_recommendations(self, track_info: List[Dict], genre_cache: Dict, limit: int = 10) -> List[Dict]:
        recommendations = []
        existing_artists = {artist for t in track_info for artist in t['artists']}
        included_albums = set()

        name_to_genres = {}
        for track in track_info:
            for artist in track.get('artist_info', []):
                aid, name = artist.get('id'), artist.get('name')
                if aid and name:
                    name_to_genres[name] = genre_cache.get(aid, [])

        genre_counts = {}
        for genres in name_to_genres.values():
            for g in genres:
                genre_counts[g] = genre_counts.get(g, 0) + 1
        dominant_genres = {g for g, _ in sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:3]}

        try:
            for artist in list(existing_artists)[:5]:
                results = self.client.search(q=f'artist:{artist}', type='track', limit=5)
                for item in results['tracks']['items']:
                    if len(recommendations) >= limit:
                        break
                    if item['name'] in {t['name'] for t in track_info}:
                        continue
                    if item['album']['name'] in included_albums:
                        continue
                    track_artist_id = item['artists'][0].get('id', '')
                    track_genres = genre_cache.get(track_artist_id, []) or name_to_genres.get(item['artists'][0]['name'], [])
                    if dominant_genres and not any(g in dominant_genres for g in track_genres):
                        continue
                    t = self._parse_track(item)
                    if t:
                        t['genre_similarity'] = len(set(track_genres) & dominant_genres) / len(dominant_genres) if dominant_genres else 0
                        if t['genre_similarity'] > 0.3:
                            recommendations.append(t)
                            included_albums.add(item['album']['name'])
                if len(recommendations) >= limit:
                    break

            if len(recommendations) < limit:
                fallback_query = ' '.join(list(dominant_genres)[:2]) if dominant_genres else 'music'
                extra = self.client.search(q=fallback_query, type='track', limit=limit - len(recommendations))
                for item in extra['tracks']['items']:
                    if len(recommendations) >= limit:
                        break
                    if item['name'] in {t['name'] for t in track_info}:
                        continue
                    if item['album']['name'] in included_albums:
                        continue
                    t = self._parse_track(item)
                    if t:
                        t['genre_similarity'] = 0
                        recommendations.append(t)
                        included_albums.add(item['album']['name'])

            recommendations.sort(key=lambda x: (x['genre_similarity'], x['popularity']), reverse=True)
            return recommendations[:limit]
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return []