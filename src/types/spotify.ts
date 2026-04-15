// ─── Spotify API Response Types ───────────────────────────────────────────────

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtistSimple {
  id: string;
  name: string;
  uri: string;
  href: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
  album_type: 'album' | 'single' | 'compilation';
  artists: SpotifyArtistSimple[];
  uri: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  href: string;
  duration_ms: number;
  popularity: number;
  explicit: boolean;
  preview_url: string | null;
  album: SpotifyAlbum;
  artists: SpotifyArtistSimple[];
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
  href: string;
  popularity: number;
  followers: { total: number };
  genres: string[];
  images: SpotifyImage[];
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: SpotifyImage[];
  followers: { total: number };
  country: string;
  product: 'free' | 'premium';
}

export interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
  context: {
    type: 'album' | 'playlist' | 'artist' | null;
    uri: string;
  } | null;
}

export interface SpotifyPagingObject<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

export interface RecentlyPlayedResponse {
  items: RecentlyPlayedItem[];
  next: string | null;
  cursors: { after: string; before: string };
  limit: number;
}

export interface AudioFeatures {
  id: string;
  danceability: number;   // 0–1
  energy: number;         // 0–1
  key: number;            // 0–11
  loudness: number;       // dB
  mode: number;           // 0=minor, 1=major
  speechiness: number;    // 0–1
  acousticness: number;   // 0–1
  instrumentalness: number; // 0–1
  liveness: number;       // 0–1
  valence: number;        // 0–1 (positiveness/mood)
  tempo: number;          // BPM
  time_signature: number;
  duration_ms: number;
  uri: string;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';
