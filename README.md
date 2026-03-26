# pyaux
![logo](screenshots/pyaux-logo.png)

A Python-coded tool that analyses and rates a user’s Spotify playlist (the input is the public Spotify URL). The input of the user's spotify playlist undergoes a process for this calculation of the rating. Using OAuth2, the Spotify API is authenticated using client credentials obtained from environment variables.

### Fetching playlist tracks
Fetch detailed information about tracks in a Spotify playlist using the provided URL. Returns a list of dictionaries, each containing track information.

### The ranking system
The playlist rating is calculated for each track based on the artist diversity, genre diversity, popularity, and playlist length.
- Better playlists usually has one song per artist. Rating will be reduced if artists repeat so many times.
- Better playlists usually focus on one or few main genres in the playlist. A playlist with too many genres loses the focus of what that playlist is supposed to emulate and can bring down the score.
- Better playlists usually have a mix between popular and non popular songs in order to help listeners discover new music
- Better playlists have a length is 50 tracks at least.

### Recommendations
The program also gives extra recommendations of songs based on the user's playlist preferences to help improve the score of their playlist.

### Console output examples:
![output-1](screenshots/output-list.png)
![output-2](screenshots/output-result.png)
![output-3](screenshots/output-recommend.png)

## Development

Quick commands to run the app locally (macOS / Linux):

1. Create and activate the Python virtualenv, install Python deps, and install frontend deps:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && cd -
```

2. Start both the Next.js frontend and the Flask backend (root `package.json` has a `dev` script that uses `concurrently`):

```bash
# from project root
npm install   # ensure dev deps (concurrently) are installed
npm run dev
```

If you prefer to start the backend manually, use the helper script:

```bash
./scripts/start-backend.sh
```

3. Run tests:

```bash
source venv/bin/activate
python -m pytest -q
```

4. If port 5001 is in use, free it with the included helper:

```bash
./clean-port.sh 5001
```

Notes:
- The Next.js dev server runs on port 3000 and proxies API requests to the Flask backend on port 5001.
- Ensure `.env` contains `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for endpoints that call Spotify.

---

Cleanup performed (automated)
- Moved legacy files into `_archive/` to keep repo tidy while preserving history:
	- `app_old.py` -> `_archive/app_old.py`
	- `static/css/style_old.css` -> `_archive/style_old.css`
	- `static/js/main_old.js` -> `_archive/main_old.js`
- Updated `.gitignore` to ignore common artefacts: `node_modules/`, `backend.log`, `logs/`, `coverage/`.

If you'd like me to create a Git commit with these changes or further reorganize the frontend into a separate folder, tell me and I will proceed.

