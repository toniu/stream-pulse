# StreamPulse

**Spotify Listening Intelligence Platform** — visualise your listening habits, mood trends, genre breakdown, and auto-generated insights, all without sending any data to a server.

> **Live demo**: [Add Vercel URL here once deployed]  
> **No Spotify account needed** — click "View Demo" on the login page to explore with sample data.

---

## Screenshots

<!-- Add screenshots after first deployment -->
<!-- Suggested captures: Login page, Overview, Mood page, Artists deep-dive, Listening page -->

---

## Features

| Feature | Description |
|---|---|
| **Listening Overview** | Top tracks, top artists, and key stats for short / medium / long-term ranges |
| **Mood & Energy** | Valence, energy, danceability, acousticness and tempo visualisations |
| **Listening Patterns** | Hourly heatmap, daily trend chart, and genre distribution |
| **Artist Deep Dives** | Select any top artist for a radar chart, genre profile, and your personal play history |
| **Auto-generated Insights** | Rule-based engin| **Auto-g beha| **Auto-generated Insights** | Rule-based engin| **Auto-g beha| **Auto-generated Insights** | Rule-based engin| **Auto-g beha| **Auto-generated Insights** | Rule-based engin| lates u| **Auto-generated Insights** | Rule-based engin| Spoti| **Auto-generated Insights** | Rule-based engin| **Auto-g beha| **Auto-generated Insights** | Refresh|  | | **Auto-genetok| **Auto-generated Insights** | Rule-based en|


 **Auto-generated Insights** | Rule-based engin| **Auto-g beha| **Auto-generated Insights** dev  *rve **Auto-gex T **Auto-generated Inl stat **Auto- l **Auto-generated Insights** | Rule-based engin| **Auto-g beha| **Auto-generated Insights** dev  *rve ** a **Auto-generated Insights** | Rule-based engin| **Auto-g beha| **Auto-generated Insightslyti **Auto-generated Insights** | Rule-based engin| **Auto-g beha| **Auto-generated k Start

### Prerequisites

- Node.js 18+
- A [Spotify Developer](https://developer.spotify.com/dashboard) app with `http://localhost:5173/callback` as a Redirect URI

### Setup

```bash
git clone https://github.com/your-username/stream-pulse.git
cd stream-pulse
npm install
cp .env.example .env
# Edit .env — add your VITE_SPOTIFY_CLIENT_ID
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and click **Connect with Spotify**, or click **View Demo** to explore without an account.

### Running Tests

```bash
npm test            # single run
npm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:watch  # watch monpm run test:wat's Client ID |
| `VITE| `VITE| `VRI`| `VITE| `VITE| `VRI`| `VITE| `VITE| `VRI`| `VITE| `VITE| `VRI`| `VITE| `VITE| `VRI`| `VITE| `VITE| `VRI`| `VITE|e Spotify Web API in dev| `VITnt| `VITE| `VITE| `VRI`| `VITE| `VITE| `VRI`| `VITE| `VITalls back to genre-ba| ` mood est| `VITE| `VITE| `y-played is capped at 50 items per request — mitig| `VITy `loc| Storage` persistence

---

## Privacy

All data stays in the browser. No backend, no server-side storage. OAuth tokens are kept in `sessionStorage` and cleared on logout.

---

## License

MIT
