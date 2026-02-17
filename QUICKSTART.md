# 🚀 Quick Start Guide - pyAux Web Application

## Installation & Setup (5 minutes)

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Get Spotify API Credentials

1. Visit: https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click "Create an App"
4. Fill in:
   - App name: `pyAux`
   - App description: `Playlist analyser`
5. Accept the terms and click "Create"
6. You'll see your **Client ID** and **Client Secret**

### Step 3: Configure Environment Variables

Edit the `.env` file in the pyAux directory:

```env
CLIENT_ID=paste_your_client_id_here
CLIENT_SECRET=paste_your_client_secret_here
FLASK_SECRET_KEY=any_random_string_here
```

### Step 4: Run the Application

**Option A - Using the run script (recommended):**
```bash
./run-web.sh
```

**Option B - Direct Python:**
```bash
python app.py
```

### Step 5: Open in Browser

Navigate to: **http://localhost:5000**

---

## Usage

1. **Copy a Spotify playlist URL**
   - Open Spotify (desktop or web)
   - Go to any public playlist
   - Click Share → Copy link to playlist
   - URL format: `https://open.spotify.com/playlist/...`

2. **Paste into pyAux**
   - Paste the URL into the input field
   - Click "Analyse Playlist"
   - Wait for analysis (10-30 seconds)

3. **View Your Results**
   - Overall rating score
   - Detailed breakdowns
   - Popular genres
   - Track list
   - Personalised recommendations

---

## Troubleshooting

### Error: "Invalid Spotify credentials"
**Fix:** Check your `.env` file has the correct `CLIENT_ID` and `CLIENT_SECRET`

### Error: "Module not found"
**Fix:** Run `pip install -r requirements.txt`

### Port 5000 already in use
**Fix:** Change port in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # Change 5000 to 5001
```

### Playlist not loading
**Fix:** Ensure the playlist is **public** (not private)

---

## Features Explained

### 🎨 **Music-Themed Design**
- Black background with neon green accents
- Animated vinyl record logo
- Equaliser bars in background
- Smooth transitions throughout

### 📊 **Rating System**
- **Artist Diversity**: Unique artists vs repetition
- **Genre Cohesion**: Focus on 1-3 main genres
- **Popularity Balance**: Mix of popular & underground
- **Playlist Length**: Optimal is 50+ tracks

### 🎵 **Smart Recommendations**
- Genre-matched suggestions
- Avoids duplicates
- Considers artist diversity
- Helps improve your score

---

## Next Steps

- Analyse multiple playlists
- Use recommendations to improve ratings
- Share results with friends
- Customise the design (see WEB_README.md)

---

**Need more help?** Check [WEB_README.md](WEB_README.md) for detailed documentation.

Enjoy! 🎵
