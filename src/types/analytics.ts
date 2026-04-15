import type { AudioFeatures, SpotifyArtist, SpotifyTrack } from './spotify';

// ─── Processed Analytics Types ────────────────────────────────────────────────

export interface ListeningHour {
  hour: number;        // 0–23
  count: number;
  label: string;       // e.g. "2 AM"
}

export interface DailyListening {
  date: string;        // ISO date string, e.g. "2024-03-10"
  minutes: number;
  trackCount: number;
}

export interface GenreDistribution {
  genre: string;
  count: number;
  percentage: number;
}

export interface MoodSnapshot {
  averageValence: number;
  averageEnergy: number;
  averageDanceability: number;
  averageAcousticness: number;
  averageTempo: number;
  moodLabel: MoodLabel;
  moodColor: string;
}

export type MoodLabel =
  | 'Euphoric'
  | 'Energetic'
  | 'Happy'
  | 'Chill'
  | 'Melancholic'
  | 'Tense'
  | 'Peaceful'
  | 'Dark';

export interface ListeningStats {
  totalMinutesListened: number;
  uniqueArtists: number;
  uniqueTracks: number;
  uniqueGenres: number;
  mostActiveHour: number;
  mostActiveDay: string;
  averageTrackDurationMs: number;
  topGenres: GenreDistribution[];
}

export interface TrackWithFeatures extends SpotifyTrack {
  audioFeatures: AudioFeatures | null;
}

export interface ArtistAnalytics {
  artist: SpotifyArtist;
  playCount: number;
  totalMinutes: number;
  topTracks: SpotifyTrack[];
  genreBreakdown: GenreDistribution[];
  averageEnergy: number;
  averageValence: number;
}

export interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark: number;
}
