/**
 * Mock data for the StreamPulse demo mode.
 * Populated with realistic but fictional data so portfolio visitors can
 * explore all features without a Spotify account.
 */
import type { TrackWithFeatures } from '@/types/analytics';
import type { SpotifyArtist } from '@/types/spotify';
import type {
  DailyListening,
  GenreDistribution,
  ListeningHour,
  ListeningStats,
  MoodSnapshot,
} from '@/types/analytics';

// ─── Artists ─────────────────────────────────────────────────────────────────

export const mockTopArtists: SpotifyArtist[] = [
  {
    id: 'a1',
    name: 'Kendrick Lamar',
    genres: ['conscious hip hop', 'hip hop', 'rap', 'west coast rap'],
    popularity: 92,
    followers: { total: 24_000_000 },
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5eb437b9e2a82505b3d93ff1022', height: 640, width: 640 }],
    external_urls: { spotify: 'https://open.spotify.com/artist/2YZyLoL8N0Wb9xBt1NhZWg' },
  },
  {
    id: 'a2',
    name: 'Frank Ocean',
    genres: ['alternative r&b', 'indie r&b', 'neo soul', 'pop'],
    popularity: 87,
    followers: { total: 15_000_000 },
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5eb65906f427e7c4d5060ae6e3c', height: 640, width: 640 }],
    external_urls: { spotify: 'https://open.spotify.com/artist/2h93pZq0e7k5yf4dywlkpM' },
  },
  {
    id: 'a3',
    name: 'Phoebe Bridgers',
    genres: ['anti-folk', 'chamber pop', 'folk', 'indie folk', 'indie pop', 'singer-songwriter'],
    popularity: 82,
    followers: { total: 6_500_000 },
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5eb1a62a5ca2bd783c3cf0c6d18', height: 640, width: 640 }],
    external_urls: { spotify: 'https://open.spotify.com/artist/1r1uxoy19fzMxunt3ONAkG' },
  },
  {
    id: 'a4',
    name: 'Tyler, the Creator',
    genres: ['hip hop', 'rap', 'alternative hip hop'],
    popularity: 88,
    followers: { total: 19_000_000 },
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5eb48dc3268da37b1b83e3de0bd', height: 640, width: 640 }],
    external_urls: { spotify: 'https://open.spotify.com/artist/4V8Sr092TqfHkfAA5fXXqsF' },
  },
  {
    id: 'a5',
    name: 'Lana Del Rey',
    genres: ['art pop', 'indie pop', 'pop', 'sadcore', 'singer-songwriter'],
    popularity: 85,
    followers: { total: 24_000_000 },
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5eb4c716d5da55fd1d1dbef06e6', height: 640, width: 640 }],
    external_urls: { spotify: 'https://open.spotify.com/artist/00FQb4jTyendYWaN8pK0wa' },
  },
  {
    id: 'a6',
    name: 'The Weeknd',
    genres: ['canadian contemporary r&b', 'canadian pop', 'pop', 'r&b'],
    popularity: 96,
    followers: { total: 42_000_000 },
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb', height: 640, width: 640 }],
    external_urls: { spotify: 'https://open.spotify.com/artist/1Xyo4u8uXC1ZmMpatF05PJ' },
  },
  {
    id: 'a7',
    name: 'Bon Iver',
    genres: ['chamber pop', 'folk', 'indie folk', 'indie pop', 'neo folk'],
    popularity: 76,
    followers: { total: 8_200_000 },
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5ebbc1b7c2d56f45feaa96fd8da', height: 640, width: 640 }],
    external_urls: { spotify: 'https://open.spotify.com/artist/4LEiUm1SRbFMgfqnQTwUbQ' },
  },
  {
    id: 'a8',
    name: 'SZA',
    genres: ['pop', 'r&b', 'tde'],
    popularity: 91,
    followers: { total: 18_000_000 },
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5eb4ac6714f2a8b2f2d89cdfc90', height: 640, width: 640 }],
    external_urls: { spotify: 'https://open.spotify.com/artist/7tYKF4w9nC0nq9CsPZTHyP' },
  },
];

// ─── Tracks ──────────────────────────────────────────────────────────────────

function makeTrack(
  id: string,
  name: string,
  artistId: string,
  artistName: string,
  albumName: string,
  albumImg: string,
  durationMs: number,
  popularity: number,
  af?: Partial<NonNullable<TrackWithFeatures['audioFeatures']>>
): TrackWithFeatures {
  return {
    id,
    name,
    artists: [{ id: artistId, name: artistName, external_urls: { spotify: '' } }],
    album: {
      id: `alb-${id}`,
      name: albumName,
      images: [{ url: albumImg, height: 300, width: 300 }],
      release_date: '2023-01-01',
      external_urls: { spotify: '' },
    },
    duration_ms: durationMs,
    popularity,
    external_urls: { spotify: '' },
    audioFeatures: af
      ? {
          id,
          danceability: af.danceability ?? 0.6,
          energy: af.energy ?? 0.6,
          valence: af.valence ?? 0.5,
          acousticness: af.acousticness ?? 0.3,
          instrumentalness: af.instrumentalness ?? 0,
          speechiness: af.speechiness ?? 0.1,
          liveness: af.liveness ?? 0.12,
          loudness: af.loudness ?? -6,
          tempo: af.tempo ?? 120,
          key: 5,
          mode: 1,
          time_signature: 4,
        }
      : null,
  };
}

const kdotImg = 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f';
const foImg = 'https://i.scdn.co/image/ab67616d0000b27382b243023f472afba19ef4b0';
const pbImg = 'https://i.scdn.co/image/ab67616d0000b2734a22ad8aad7bdf17eea5b9c9';
const tylerImg = 'https://i.scdn.co/image/ab67616d0000b273b71a71b02e4b7b6bb6de72b2';
const ldImg = 'https://i.scdn.co/image/ab67616d0000b27309a8f8a8f45b5c2c7b1b5ae7';
const weekndImg = 'https://i.scdn.co/image/ab67616d0000b2739e495fb707973f3390850eea';
const bonImg = 'https://i.scdn.co/image/ab67616d0000b273f58c6f7a7f5e0dc3b4a56523';
const szaImg = 'https://i.scdn.co/image/ab67616d0000b2730c47d8a724932f619b725f62';

export const mockTopTracks: TrackWithFeatures[] = [
  makeTrack('t1', 'HUMBLE.', 'a1', 'Kendrick Lamar', 'DAMN.', kdotImg, 177000, 95, { energy: 0.90, valence: 0.42, danceability: 0.90, tempo: 150 }),
  makeTrack('t2', 'Nights', 'a2', 'Frank Ocean', 'Blonde', foImg, 307000, 89, { energy: 0.49, valence: 0.45, danceability: 0.57, acousticness: 0.38, tempo: 115 }),
  makeTrack('t3', 'Moon Song', 'a3', 'Phoebe Bridgers', 'Punisher', pbImg, 195000, 78, { energy: 0.21, valence: 0.20, danceability: 0.37, acousticness: 0.85, tempo: 88 }),
  makeTrack('t4', 'EARFQUAKE', 'a4', 'Tyler, the Creator', 'IGOR', tylerImg, 233000, 87, { energy: 0.44, valence: 0.56, danceability: 0.73, acousticness: 0.12, tempo: 93 }),
  makeTrack('t5', 'Mariners Apartment Complex', 'a5', 'Lana Del Rey', 'Norman Fucking Rockwell!', ldImg, 264000, 84, { energy: 0.20, valence: 0.26, danceability: 0.38, acousticness: 0.74, tempo: 98 }),
  makeTrack('t6', 'Blinding Lights', 'a6', 'The Weeknd', 'After Hours', weekndImg, 200000, 97, { energy: 0.80, valence: 0.33, danceability: 0.51, tempo: 171 }),
  makeTrack('t7', 'Skinny Love', 'a7', 'Bon Iver', 'For Emma, Forever Ago', bonImg, 217000, 72, { energy: 0.26, valence: 0.24, danceability: 0.42, acousticness: 0.92, tempo: 98 }),
  makeTrack('t8', 'Good Days', 'a8', 'SZA', 'Good Days', szaImg, 279000, 88, { energy: 0.47, valence: 0.54, danceability: 0.67, acousticness: 0.17, tempo: 118 }),
  makeTrack('t9', 'Die Hard', 'a1', 'Kendrick Lamar', 'Mr. Morale & The Big Steppers', kdotImg, 273000, 82, { energy: 0.52, valence: 0.35, danceability: 0.80, tempo: 104 }),
  makeTrack('t10', 'Rushes', 'a2', 'Frank Ocean', 'Endless', foImg, 280000, 76, { energy: 0.15, valence: 0.30, danceability: 0.39, acousticness: 0.70, tempo: 76 }),
  makeTrack('t11', 'Funeral', 'a3', 'Phoebe Bridgers', 'Punisher', pbImg, 248000, 79, { energy: 0.25, valence: 0.13, danceability: 0.32, acousticness: 0.78, tempo: 90 }),
  makeTrack('t12', 'NEW MAGIC WAND', 'a4', 'Tyler, the Creator', 'IGOR', tylerImg, 213000, 80, { energy: 0.62, valence: 0.45, danceability: 0.60, tempo: 160 }),
];

export const mockRecentTracks: TrackWithFeatures[] = [...mockTopTracks].slice(0, 8);

// ─── Listening Stats ──────────────────────────────────────────────────────────

export const mockTopGenres: GenreDistribution[] = [
  { genre: 'hip hop', count: 38, percentage: 32 },
  { genre: 'indie folk', count: 28, percentage: 23 },
  { genre: 'r&b', count: 20, percentage: 17 },
  { genre: 'alternative r&b', count: 14, percentage: 12 },
  { genre: 'pop', count: 10, percentage: 8 },
  { genre: 'singer-songwriter', count: 7, percentage: 6 },
  { genre: 'neo soul', count: 2, percentage: 2 },
];

export const mockListeningStats: ListeningStats = {
  totalMinutesListened: 2847,
  uniqueArtists: 42,
  uniqueTracks: 187,
  uniqueGenres: 19,
  mostActiveHour: 22,
  mostActiveDay: 'Saturday',
  averageTrackDurationMs: 214000,
  topGenres: mockTopGenres,
};

// ─── Mood ─────────────────────────────────────────────────────────────────────

export const mockMoodSnapshot: MoodSnapshot = {
  averageValence: 0.37,
  averageEnergy: 0.45,
  averageDanceability: 0.56,
  averageAcousticness: 0.52,
  averageTempo: 108,
  moodLabel: 'Melancholic',
  moodColor: '#64748b',
};

// ─── Hourly Distribution ─────────────────────────────────────────────────────

function hourLabel(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

const rawHourlyCounts: Record<number, number> = {
  0: 4, 1: 2, 2: 1, 6: 3, 7: 8, 8: 12, 9: 9, 10: 7,
  12: 6, 13: 5, 14: 8, 15: 7, 16: 5,
  17: 10, 18: 14, 19: 18, 20: 22, 21: 26, 22: 30, 23: 19,
};

export const mockHourlyDistribution: ListeningHour[] = Array.from(
  { length: 24 },
  (_, h) => ({
    hour: h,
    count: rawHourlyCounts[h] ?? 0,
    label: hourLabel(h),
  })
);

// ─── Daily Distribution ───────────────────────────────────────────────────────

export const mockDailyDistribution: DailyListening[] = (() => {
  const days: DailyListening[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dow = d.getDay(); // 0 Sun … 6 Sat
    // Heavier weekend listening
    const base = dow === 0 || dow === 6 ? 80 : 45;
    const minutes = Math.round(base + Math.random() * 40 - 20);
    days.push({
      date: d.toISOString().slice(0, 10),
      minutes: Math.max(minutes, 0),
      trackCount: Math.round(minutes / 3.5),
    });
  }
  return days;
})();
