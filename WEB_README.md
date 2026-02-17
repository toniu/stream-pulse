# pyAux Web Frontend

Welcome to the **pyAux** web application! This is a Flask-based frontend for analysing and rating your Spotify playlists.

## 🎵 Features

- **Beautiful Music-Themed UI**: Black and neon green colour scheme with smooth animations
- **Real-Time Analysis**: Analyses your Spotify playlists and provides detailed ratings
- **Interactive Results**: Animated rating bars, circular progress indicators, and expandable track lists
- **Smart Recommendations**: Get personalised track suggestions to improve your playlist
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Spotify Developer Account (for API credentials)

### Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up Spotify API credentials:**
   
   Create a `.env` file in the `pyAux` directory with your Spotify API credentials:
   ```
   CLIENT_ID=your_spotify_client_id
   CLIENT_SECRET=your_spotify_client_secret
   FLASK_SECRET_KEY=your_random_secret_key
   ```

   To get Spotify credentials:
   - Go to https://developer.spotify.com/dashboard
   - Create a new app
   - Copy your Client ID and Client Secret

3. **Run the Flask application:**
   ```bash
   python app.py
   ```

4. **Open your browser and visit:**
   ```
   http://localhost:5000
   ```

## 📁 Project Structure

```
pyAux/
├── app.py                  # Flask application with routes and API endpoints
├── main.py                 # Original CLI version (still functional)
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (not in git)
├── templates/
│   ├── index.html         # Landing page
│   └── results.html       # Results display page
├── static/
│   ├── css/
│   │   └── style.css      # All styles with music theme
│   └── js/
│       └── main.js        # Client-side JavaScript
└── screenshots/           # Project screenshots
```

## 🎨 Design Features

### Colour Palette
- **Background**: Deep black (#0a0a0a)
- **Accent**: Neon green (#00ff41)
- **Cards**: Dark grey (#151515)

### Animations
- Animated vinyl record logo with spinning effect
- Equaliser bars in the background
- Smooth hover effects on all interactive elements
- Animated rating bars and circular progress indicators
- Loading animations with music waves

## 🔧 Usage

1. **Enter a Spotify Playlist URL**:
   - Copy any public Spotify playlist URL
   - Paste it into the input field on the home page
   - Click "Analyse Playlist"

2. **View Results**:
   - See your overall playlist rating
   - Review detailed breakdowns for:
     - Artist Diversity
     - Genre Cohesion
     - Popularity Balance
     - Playlist Length
   - View popular genres in your playlist
   - Browse all tracks
   - Get personalised recommendations

3. **Improve Your Playlist**:
   - Use the recommendations to add new tracks
   - Re-analyse to see your improved score!

## 🎯 Rating System

The playlist rating is calculated based on:

- **Artist Diversity (30%)**: Better playlists have unique artists rather than repetition
- **Genre Cohesion (25%)**: Focused playlists with 1-3 main genres score higher
- **Popularity Balance (20%)**: Mix of popular and underground tracks is ideal
- **Playlist Length (25%)**: Optimal length is 50+ tracks

## 🔐 Environment Variables

Required environment variables in `.env`:

```
CLIENT_ID=your_spotify_client_id          # From Spotify Developer Dashboard
CLIENT_SECRET=your_spotify_client_secret  # From Spotify Developer Dashboard
FLASK_SECRET_KEY=random_secret_key        # For Flask sessions (generate a random string)
```

## 🚀 Production Deployment

For production deployment, consider:

1. **Set `debug=False` in app.py**
2. **Use a production WSGI server like Gunicorn:**
   ```bash
   gunicorn -w 4 app:app
   ```
3. **Use a reverse proxy like Nginx**
4. **Set strong environment variables**
5. **Enable HTTPS**

## 📝 API Endpoints

### `GET /`
Landing page with playlist URL input

### `POST /analyse`
Analyses a Spotify playlist

**Request Body:**
```json
{
  "playlist_url": "https://open.spotify.com/playlist/..."
}
```

**Response:**
```json
{
  "success": true,
  "playlist_name": "My Awesome Playlist",
  "track_count": 50,
  "ratings": {
    "overall_rating": 85.5,
    "artist_diversity_rating": 90.0,
    "genre_cohesion_rating": 85.0,
    "popularity_rating": 80.0,
    "playlist_length_rating": 100.0
  },
  "popular_genres": [...],
  "tracks": [...],
  "recommendations": [...]
}
```

### `GET /results`
Results display page (loads data from sessionStorage)

## 🛠️ Customisation

### Changing Colours
Edit the CSS variables in [static/css/style.css](static/css/style.css):
```css
:root {
    --accent-green: #00ff41;  /* Change to your preferred colour */
    /* ... other variables ... */
}
```

### Modifying Genre Mappings
Edit the `GENRE_MAPPING` dictionary in [app.py](app.py) to customise genre categorisation.

### Adjusting Rating Weights
Modify the weights in the `calculate_playlist_ratings()` function in [app.py](app.py):
```python
ARTIST_WEIGHT = 0.3      # Artist diversity importance
POPULARITY_WEIGHT = 0.2  # Popularity balance importance
GENRE_WEIGHT = 0.25      # Genre cohesion importance
LENGTH_WEIGHT = 0.25     # Playlist length importance
```

## 🐛 Troubleshooting

### "Invalid Spotify credentials" error
- Check that your `.env` file has the correct `CLIENT_ID` and `CLIENT_SECRET`
- Ensure the `.env` file is in the same directory as `app.py`

### "No results found" on results page
- This means sessionStorage was cleared or you navigated directly to `/results`
- Go back to the home page and analyse a playlist first

### Playlist not loading
- Ensure the playlist URL is public (not private)
- Verify your Spotify API credentials are valid
- Check that you have an internet connection

## 📄 Licence

© 2026 pyAux

## 🙏 Credits

- **Spotify Web API** for playlist data
- **Spotipy** library for Python Spotify integration
- **Flask** web framework

---

Enjoy analysing your playlists! 🎵
