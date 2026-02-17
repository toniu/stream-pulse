"""
Flask Web Application for pyAux - Spotify Playlist Analyser
Provides a web interface for analysing and rating Spotify playlists
"""

from flask import Flask, render_template, request, jsonify, session
import spotipy
import os
import re
import math
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
from collections import Counter

# Load environment variables from .env file
load_dotenv()

# Initialise Flask application
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-in-production")

# Import helper functions from main.py
# We'll keep them here for the Flask app to use

def validate_spotify_playlist_url(url):
    """
    Validate the Spotify playlist URL format.
    Returns True if the URL is valid, False otherwise.
    """
    SPOTIFY_PLAYLIST_REGEX = r'^https://open\.spotify\.com/playlist/[a-zA-Z0-9_-]+(\?si=[a-zA-Z0-9_-]+)?$'
    return bool(re.match(SPOTIFY_PLAYLIST_REGEX, url))

def authenticate_spotify():
    """
    Authenticate with the Spotify API using client credentials obtained from environment variables.
    Returns a Spotify client object.
    """
    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")
    
    if not client_id or not client_secret:
        raise ValueError("Spotify credentials not found in environment variables")
    
    client_credentials_manager = SpotifyClientCredentials(
        client_id=client_id, 
        client_secret=client_secret
    )
    sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)
    return sp

def fetch_playlist_tracks(playlist_url, sp):
    """
    Fetch detailed information about tracks in a Spotify playlist using the provided URL.
    Returns a tuple of (playlist_name, playlist_image, track_info_list, artist_ids_set).
    """
    # Extract playlist ID from URL
    playlist_id = playlist_url.split('?')[0].split('/')[-1]
    playlist = sp.playlist(playlist_id)
    playlist_name = playlist['name']
    
    # Get playlist cover image
    playlist_image = playlist['images'][0]['url'] if playlist.get('images') else None
    
    track_info = []
    artist_ids = set()  # Collect unique artist IDs for batch fetching
    results = sp.playlist_tracks(playlist_id)
    
    for item in results['items']:
        track = item['track']
        if not track:  # Skip if track is None
            continue
            
        release_date = track['album'].get('release_date')
        release_year = int(release_date.split('-')[0]) if release_date else None
        
        # Get album images (multiple sizes available)
        album_images = track['album'].get('images', [])
        album_image = album_images[0]['url'] if len(album_images) > 0 else None
        album_image_small = album_images[-1]['url'] if len(album_images) > 0 else None
        
        # Format duration as MM:SS
        duration_ms = track.get('duration_ms', 0)
        duration_min = duration_ms // 60000
        duration_sec = (duration_ms % 60000) // 1000
        duration_formatted = f"{duration_min}:{duration_sec:02d}"
        
        # Collect artist IDs for batch fetching
        artist_info = []
        for artist in track['artists']:
            artist_ids.add(artist['id'])
            artist_info.append({
                'name': artist['name'],
                'id': artist['id']
            })
        
        track_info.append({
            'name': track['name'],
            'artists': [artist['name'] for artist in track['artists']],
            'artist_info': artist_info,  # Include artist IDs
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
        })
    
    return playlist_name, playlist_image, track_info, artist_ids

def batch_fetch_artist_genres(artist_ids, sp):
    """
    Fetch genres for multiple artists in batches using Spotify's batch endpoint.
    Returns a dictionary mapping artist_id to list of genres.
    Much faster than individual searches.
    """
    artist_genres = {}
    artist_id_list = list(artist_ids)
    
    # Spotify allows up to 50 artists per request
    batch_size = 50
    
    for i in range(0, len(artist_id_list), batch_size):
        batch = artist_id_list[i:i + batch_size]
        try:
            artists_data = sp.artists(batch)
            for artist in artists_data['artists']:
                if artist:  # Check if artist data exists
                    artist_genres[artist['id']] = artist.get('genres', [])
        except Exception as e:
            print(f"Error fetching artist batch: {e}")
            # If batch fails, try individual requests as fallback
            for artist_id in batch:
                try:
                    artist_data = sp.artist(artist_id)
                    artist_genres[artist_id] = artist_data.get('genres', [])
                except:
                    artist_genres[artist_id] = []
    
    return artist_genres

def get_artist_genres(artist_name, sp):
    """
    Fetch genres associated with an artist from Spotify API.
    Returns a list of genre strings.
    NOTE: This is a fallback method. Use batch_fetch_artist_genres for better performance.
    """
    results = sp.search(q='artist:' + artist_name, type='artist')
    if results['artists']['items']:
        return results['artists']['items'][0]['genres']
    return []

def calculate_popularity_rating_improved(track_info):
    """
    Improved popularity rating that rewards variety in track popularity.
    A good playlist has a mix of popular and underground tracks.
    Returns a score between 0.0 and 1.0.
    """
    import statistics
    
    popularities = [track['popularity'] for track in track_info]
    
    if len(popularities) == 0:
        return 0.5
    
    # Average popularity (50-70 is ideal sweet spot)
    avg_pop = sum(popularities) / len(popularities)
    avg_score = 1.0 - abs(avg_pop - 60) / 60
    avg_score = max(0, min(1, avg_score))
    
    # Variety (standard deviation - 20-35 is ideal range)
    if len(popularities) > 1:
        std_pop = statistics.stdev(popularities)
        # Ideal standard deviation is around 27.5 (midpoint of 20-35)
        variety_score = 1.0 - abs(std_pop - 27.5) / 27.5
        variety_score = max(0, min(1, variety_score))
    else:
        variety_score = 0.5
    
    # Combine: 60% based on average, 40% based on variety
    return (0.6 * avg_score + 0.4 * variety_score)

def calculate_length_rating_improved(track_count):
    """
    Improved length rating with non-linear scoring.
    Uses logarithmic curve for larger playlists with diminishing returns.
    Returns a score between 0.0 and 1.0.
    """
    if track_count < 10:
        # Penalty for very short playlists
        return track_count / 50
    elif track_count < 30:
        # Growing score for building playlists
        return 0.2 + (track_count - 10) / 50
    elif track_count < 50:
        # Approaching optimal
        return 0.6 + (track_count - 30) / 50
    else:
        # Logarithmic for 50+ tracks (diminishing returns)
        return min(1.0, 0.9 + math.log(track_count - 49) / 10)

def calculate_era_diversity(track_info):
    """
    Calculate era diversity based on the spread of release years.
    A good playlist has a mix of classic and modern tracks.
    Returns a score between 0.0 and 1.0.
    """
    years = [track['release_year'] for track in track_info if track.get('release_year')]
    
    if len(years) < 2:
        return 0.5
    
    # Calculate year spread
    year_range = max(years) - min(years)
    
    # Ideal spread is 10-30 years
    if year_range < 5:
        # Too narrow (all recent or all old)
        return 0.3
    elif year_range < 10:
        return 0.5 + (year_range - 5) / 10
    elif year_range < 30:
        return 0.9 + (year_range - 10) / 200  # Slowly approach 1.0
    else:
        # Excellent variety across eras
        return 1.0

def calculate_genre_diversity(track_info, sp, genre_mapping, genre_cache=None):
    """
    Calculate the diversity rating for parent genres in the playlist.
    Returns a diversity score between 0.0 and 1.0.
    Lower scores mean better genre cohesion (more focused playlist).
    """
    all_parent_genres = []
    total_tracks = len(track_info)
    
    # Use cached genres if provided
    if genre_cache is None:
        genre_cache = {}
    
    # Iterate through each track in the playlist
    for track in track_info:
        # Use artist IDs if available, otherwise fall back to names
        if 'artist_info' in track:
            for artist_data in track['artist_info']:
                artist_id = artist_data['id']
                artist_genres = genre_cache.get(artist_id, [])
                parent_genres = []
                
                # Check if each artist genre matches any parent genre
                for genre in artist_genres:
                    for parent_genre, keywords in genre_mapping.items():
                        if any(keyword in genre for keyword in keywords):
                            parent_genres.append(parent_genre)
                            break
                
                if not parent_genres:  # If no match found, assign to Miscellaneous
                    parent_genres.append('Miscellaneous/World')
                
                all_parent_genres.extend(parent_genres)
        else:
            # Fallback to old method if artist_info not available
            for artist in track['artists']:
                artist_genres = get_artist_genres(artist, sp)
                parent_genres = []
                
                for genre in artist_genres:
                    for parent_genre, keywords in genre_mapping.items():
                        if any(keyword in genre for keyword in keywords):
                            parent_genres.append(parent_genre)
                            break
                
                if not parent_genres:
                    parent_genres.append('Miscellaneous/World')
                
                all_parent_genres.extend(parent_genres)
    
    # Calculate the frequency of each parent genre
    parent_genre_counts = Counter(all_parent_genres)
    
    # Calculate entropy (measure of diversity)
    # Use total genre count, not track count (artists can have multiple genres)
    total_genre_count = len(all_parent_genres)
    
    if total_genre_count == 0:
        return 0.5  # Default if no genres found
    
    entropy = 0.0
    for count in parent_genre_counts.values():
        probability = count / total_genre_count  # Fixed: use total genre count
        if probability > 0:  # Avoid log(0)
            entropy -= probability * math.log(probability, 2)
    
    # Normalise entropy to a score between 0.0 and 1.0
    max_entropy = math.log(len(parent_genre_counts), 2) if len(parent_genre_counts) > 1 else 1
    
    # Handle cases where max_entropy is 0 or very small
    if max_entropy == 0:
        diversity_score = 1.0
    else:
        diversity_score = 1.0 - (entropy / max_entropy)
    
    # Clamp to ensure score is always between 0 and 1 (prevent negative values)
    diversity_score = max(0.0, min(1.0, diversity_score))
    
    return diversity_score

def calculate_playlist_ratings(track_info, genre_mapping, sp, genre_cache=None):
    """
    Calculate ratings for the entire playlist based on multiple factors.
    Returns a dictionary with individual and overall ratings.
    """
    # Improved weights for better balance
    ARTIST_WEIGHT = 0.30
    POPULARITY_WEIGHT = 0.25
    GENRE_WEIGHT = 0.25
    LENGTH_WEIGHT = 0.15
    ERA_WEIGHT = 0.05
    
    # Artist diversity rating (more unique artists = better)
    unique_artists = set(artist for track in track_info for artist in track['artists'])
    artist_diversity_rating = min(len(unique_artists) / len(track_info), 1.0)
    
    # Genre cohesion rating (focused genres = better) - now uses cache
    genre_cohesion_rating = min(calculate_genre_diversity(track_info, sp, genre_mapping, genre_cache), 1.0)
    
    # Improved popularity rating (rewards variety in popularity)
    popularity_rating = calculate_popularity_rating_improved(track_info)
    
    # Improved playlist length rating (logarithmic with diminishing returns)
    playlist_length_rating = calculate_length_rating_improved(len(track_info))
    
    # Era diversity rating (rewards mix of old and new tracks)
    era_diversity_rating = calculate_era_diversity(track_info)
    
    # Calculate overall rating as weighted sum
    overall_rating = (
        (ARTIST_WEIGHT * artist_diversity_rating) +
        (POPULARITY_WEIGHT * popularity_rating) +
        (GENRE_WEIGHT * genre_cohesion_rating) +
        (LENGTH_WEIGHT * playlist_length_rating) +
        (ERA_WEIGHT * era_diversity_rating)
    )
    
    return {
        'artist_diversity_rating': artist_diversity_rating * 100,
        'popularity_rating': popularity_rating * 100,
        'genre_cohesion_rating': genre_cohesion_rating * 100,
        'playlist_length_rating': playlist_length_rating * 100,
        'era_diversity_rating': era_diversity_rating * 100,
        'overall_rating': overall_rating * 100
    }

def get_popular_genres(track_info, sp, genre_mapping, genre_cache=None, num_genres=3):
    """
    Get the most popular parent genres in the playlist.
    Returns a list of tuples (genre_name, percentage).
    """
    all_genres = []
    
    # Use cached genres if provided
    if genre_cache is None:
        genre_cache = {}
    
    for track in track_info:
        # Use artist IDs if available
        if 'artist_info' in track:
            for artist_data in track['artist_info']:
                artist_id = artist_data['id']
                artist_genres = genre_cache.get(artist_id, [])
                parent_genres = []
                
                for genre in artist_genres:
                    for parent_genre, keywords in genre_mapping.items():
                        if any(keyword in genre for keyword in keywords):
                            parent_genres.append(parent_genre)
                            break
                
                if not parent_genres:
                    parent_genres.append('Miscellaneous/World')
                
                all_genres.extend(parent_genres)
        else:
            # Fallback to old method
            for artist in track['artists']:
                artist_genres = get_artist_genres(artist, sp)
                parent_genres = []
                
                for genre in artist_genres:
                    for parent_genre, keywords in genre_mapping.items():
                        if any(keyword in genre for keyword in keywords):
                            parent_genres.append(parent_genre)
                            break
                
                if not parent_genres:
                    parent_genres.append('Miscellaneous/World')
                
                all_genres.extend(parent_genres)
    
    genre_counts = Counter(all_genres)
    total_tracks = len(all_genres)
    most_common_genres = genre_counts.most_common(num_genres)
    
    # Convert to list of dictionaries with percentages
    genre_data = []
    for genre, count in most_common_genres:
        percentage = (count / total_tracks) * 100
        genre_data.append({'name': genre, 'percentage': round(percentage, 2)})
    
    return genre_data

def generate_recommendations(track_info, sp, genre_cache=None, num_recommendations=10):
    """
    Generate recommendations for additional tracks to enhance the playlist.
    Returns a list of recommended track dictionaries.
    Optimized to reduce API calls.
    """
    recommendations = []
    
    # Collect unique artists from existing tracks
    existing_artists = {artist for track in track_info for artist in track['artists']}
    
    # Collect genres from existing tracks using cache
    existing_genres = set()
    if genre_cache and 'artist_info' in track_info[0]:
        for track in track_info:
            for artist_data in track.get('artist_info', []):
                existing_genres.update(genre_cache.get(artist_data['id'], []))
    else:
        # Fallback to search method
        for track in track_info[:5]:  # Limit to first 5 tracks for performance
            for artist in track['artists']:
                existing_genres.update(get_artist_genres(artist, sp))
    
    # Track albums already included in recommendations
    included_albums = set()
    
    # Limit to first 5 artists for faster recommendations
    for artist in list(existing_artists)[:5]:
        results = sp.search(q='artist:' + artist, type='track', limit=5)  # Reduced from 10 to 5
        
        for item in results['tracks']['items']:
            # Check if album and release_date exist
            if 'album' not in item or 'release_date' not in item['album']:
                continue
            
            release_date = item['album']['release_date']
            release_year = int(release_date.split('-')[0])
            
            # Filter out tracks already in the playlist
            if item['name'] in {t['name'] for t in track_info}:
                continue
            
            # Filter out tracks from albums already included
            if item['album']['name'] in included_albums:
                continue
            
            # Get album images
            album_images = item['album'].get('images', [])
            album_image = album_images[0]['url'] if len(album_images) > 0 else None
            album_image_small = album_images[-1]['url'] if len(album_images) > 0 else None
            
            # Format duration
            duration_ms = item.get('duration_ms', 0)
            duration_min = duration_ms // 60000
            duration_sec = (duration_ms % 60000) // 1000
            duration_formatted = f"{duration_min}:{duration_sec:02d}"
            
            # Simplified genre similarity (skip additional API calls)
            genre_similarity = 0.5  # Default similarity
            
            recommendations.append({
                'name': item['name'],
                'artists': [artist['name'] for artist in item['artists']],
                'popularity': item['popularity'],
                'album': item['album']['name'],
                'album_image': album_image,
                'album_image_small': album_image_small,
                'release_year': release_year,
                'duration_ms': duration_ms,
                'duration': duration_formatted,
                'explicit': item.get('explicit', False),
                'preview_url': item.get('preview_url'),
                'spotify_url': item['external_urls'].get('spotify'),
                'genre_similarity': genre_similarity,
            })
            
            included_albums.add(item['album']['name'])
            
            # Limit number of recommendations
            if len(recommendations) >= num_recommendations:
                break
        
        if len(recommendations) >= num_recommendations:
            break
    
    # Sort recommendations by popularity and return top results
    recommendations.sort(key=lambda x: x['popularity'], reverse=True)
    return recommendations[:num_recommendations]

# Genre mapping for categorising Spotify's detailed genres into broader categories
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
    'Miscellaneous/World': []  # For genres not identified in other categories
}

# Flask Routes

@app.route('/')
def index():
    """Render the landing page"""
    return render_template('index.html')

@app.route('/analyse', methods=['POST'])
def analyse():
    """
    API endpoint to analyse a Spotify playlist.
    Accepts JSON with 'playlist_url' field.
    Returns JSON with analysis results.
    Optimized with batch API calls and caching for faster performance.
    """
    try:
        # Get playlist URL from request
        data = request.get_json()
        playlist_url = data.get('playlist_url', '').strip()
        
        # Validate URL
        if not validate_spotify_playlist_url(playlist_url):
            return jsonify({
                'success': False,
                'error': 'Invalid Spotify playlist URL. Please use a valid public playlist link.'
            }), 400
        
        # Authenticate with Spotify
        sp = authenticate_spotify()
        
        # Fetch playlist data (now returns playlist_name, playlist_image, track_info, artist_ids)
        playlist_name, playlist_image, track_info, artist_ids = fetch_playlist_tracks(playlist_url, sp)
        
        if not track_info:
            return jsonify({
                'success': False,
                'error': 'No tracks found in playlist.'
            }), 400
        
        # Batch fetch all artist genres at once (much faster than individual calls)
        print(f"Fetching genres for {len(artist_ids)} unique artists...")
        genre_cache = batch_fetch_artist_genres(artist_ids, sp)
        print(f"Genre cache built with {len(genre_cache)} artists")
        
        # Calculate ratings (with genre cache)
        ratings = calculate_playlist_ratings(track_info, GENRE_MAPPING, sp, genre_cache)
        
        # Get popular genres (with genre cache)
        popular_genres = get_popular_genres(track_info, sp, GENRE_MAPPING, genre_cache)
        
        # Generate recommendations (with genre cache)
        recommendations = generate_recommendations(track_info, sp, genre_cache)
        
        # Prepare response
        response_data = {
            'success': True,
            'playlist_name': playlist_name,
            'playlist_image': playlist_image,
            'track_count': len(track_info),
            'tracks': track_info,
            'ratings': ratings,
            'popular_genres': popular_genres,
            'recommendations': recommendations
        }
        
        return jsonify(response_data)
    
    except ValueError as ve:
        return jsonify({
            'success': False,
            'error': str(ve)
        }), 500
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'An error occurred: {str(e)}'
        }), 500

@app.route('/results')
def results():
    """Render the results page"""
    return render_template('results.html')

# Run the application
if __name__ == '__main__':
    # Run in debug mode for development
    # Using port 5001 because port 5000 is often used by macOS AirPlay
    app.run(debug=True, host='0.0.0.0', port=5001)
