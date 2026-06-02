import { format } from 'date-fns';
import type {
  AudioFeatures,
  DailyListening,
  GenreDistribution,
  ListeningHour,
  ListeningStats,
  MoodLabel,
  MoodSnapshot,
  RecentlyPlayedItem,
  SpotifyArtist,
  TrackWithFeatures,
} from '@/types';

// ─── Hourly Distribution ──────────────────────────────────────────────────────

export function buildHourlyDistribution(
  items: RecentlyPlayedItem[]
): ListeningHour[] {
  const counts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) counts[h] = 0;
  items.forEach((item) => {
    const hour = new Date(item.played_at).getHours();
    counts[hour]++;
  });
  return Object.entries(counts).map(([h, count]) => ({
    hour: Number(h),
    count,
    label: formatHourLabel(Number(h)),
  }));
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

// ─── Daily Distribution ───────────────────────────────────────────────────────

export function buildDailyDistribution(
  items: RecentlyPlayedItem[]
): DailyListening[] {
  const map: Record<string, { minutes: number; trackCount: number }> = {};
  items.forEach((item) => {
    const date = format(new Date(item.played_at), 'yyyy-MM-dd');
    if (!map[date]) map[date] = { minutes: 0, trackCount: 0 };
    map[date].minutes += Math.round(item.track.duration_ms / 60_000);
    map[date].trackCount++;
  });
  return Object.entries(map)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Genre Distribution ───────────────────────────────────────────────────────

export function buildGenreDistribution(
  artists: SpotifyArtist[]
): GenreDistribution[] {
  const counts: Record<string, number> = {};
  artists.forEach((artist) => {
    (artist.genres ?? []).forEach((genre) => {
      counts[genre] = (counts[genre] ?? 0) + 1;
    });
  });
  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  return Object.entries(counts)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

// ─── Listening Stats ──────────────────────────────────────────────────────────

export function buildListeningStats(
  recentItems: RecentlyPlayedItem[],
  topArtists: SpotifyArtist[]
): ListeningStats {
  const totalMinutes = recentItems.reduce(
    (sum, item) => sum + Math.round(item.track.duration_ms / 60_000),
    0
  );

  const artistIds = new Set(
    recentItems.flatMap((i) => i.track.artists.map((a) => a.id))
  );
  const trackIds = new Set(recentItems.map((i) => i.track.id));

  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<string, number> = {};
  recentItems.forEach((item) => {
    const d = new Date(item.played_at);
    const h = d.getHours();
    const day = format(d, 'EEEE');
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  });

  const mostActiveHour = Number(
    Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
  );
  const mostActiveDay =
    Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

  const avgDuration =
    recentItems.length > 0
      ? recentItems.reduce((s, i) => s + i.track.duration_ms, 0) /
        recentItems.length
      : 0;

  const allGenres = new Set(topArtists.flatMap((a) => a.genres ?? []));

  return {
    totalMinutesListened: totalMinutes,
    uniqueArtists: artistIds.size,
    uniqueTracks: trackIds.size,
    uniqueGenres: allGenres.size,
    mostActiveHour,
    mostActiveDay,
    averageTrackDurationMs: avgDuration,
    topGenres: buildGenreDistribution(topArtists),
  };
}

// ─── Mood Snapshot ────────────────────────────────────────────────────────────

export function buildMoodSnapshot(
  tracks: TrackWithFeatures[]
): MoodSnapshot | null {
  const withFeatures = tracks.filter((t) => t.audioFeatures !== null);
  if (withFeatures.length === 0) return null;

  const avg = (key: keyof AudioFeatures) =>
    withFeatures.reduce(
      (sum, t) => sum + (t.audioFeatures![key] as number),
      0
    ) / withFeatures.length;

  const valence = avg('valence');
  const energy = avg('energy');
  const danceability = avg('danceability');
  const acousticness = avg('acousticness');
  const tempo = avg('tempo');

  return {
    averageValence: valence,
    averageEnergy: energy,
    averageDanceability: danceability,
    averageAcousticness: acousticness,
    averageTempo: tempo,
    moodLabel: classifyMood(valence, energy),
    moodColor: getMoodColor(valence, energy),
  };
}

// ─── Genre-based Mood Estimation ─────────────────────────────────────────────
// Used as a fallback when Spotify's /audio-features endpoint is restricted.

const ENERGY_GENRE_MAP: [string[], number][] = [
  [['metal', 'hardcore', 'punk', 'thrash', 'death metal', 'grindcore', 'speed metal'], 0.92],
  [['edm', 'electro', 'techno', 'trance', 'drum and bass', 'dnb', 'dubstep', 'rave', 'industrial'], 0.88],
  [['dance', 'house', 'club', 'reggaeton', 'dancehall', 'afrobeats'], 0.80],
  [['rock', 'indie rock', 'alternative rock', 'hard rock', 'garage rock'], 0.70],
  [['hip hop', 'hip-hop', 'rap', 'trap', 'drill', 'grime'], 0.68],
  [['pop', 'k-pop', 'j-pop', 'latin', 'bubblegum'], 0.62],
  [['r&b', 'soul', 'funk', 'gospel'], 0.55],
  [['jazz', 'blues', 'indie', 'alternative'], 0.50],
  [['folk', 'singer-songwriter', 'acoustic', 'country', 'bluegrass'], 0.35],
  [['classical', 'orchestral', 'chamber', 'ambient', 'new age', 'meditation', 'sleep'], 0.18],
];

const VALENCE_GENRE_MAP: [string[], number][] = [
  [['pop', 'k-pop', 'dance', 'disco', 'funk', 'soul', 'gospel', 'reggaeton', 'dancehall', 'latin', 'afrobeats'], 0.78],
  [['r&b', 'country', 'folk', 'singer-songwriter', 'acoustic'], 0.58],
  [['rock', 'indie', 'jazz', 'blues', 'alternative'], 0.52],
  [['hip hop', 'hip-hop', 'rap', 'trap', 'drill'], 0.45],
  [['classical', 'orchestral', 'ambient', 'new age'], 0.42],
  [['metal', 'hardcore', 'punk', 'industrial', 'death metal', 'doom'], 0.22],
];

const DANCE_GENRE_MAP: [string[], number][] = [
  [['edm', 'dance', 'house', 'techno', 'trance', 'club', 'disco', 'reggaeton', 'k-pop', 'drum and bass', 'dnb', 'afrobeats'], 0.88],
  [['hip hop', 'hip-hop', 'rap', 'trap', 'r&b', 'funk', 'soul', 'latin'], 0.76],
  [['pop', 'dancehall'], 0.68],
  [['rock', 'indie', 'alternative'], 0.45],
  [['metal', 'hardcore', 'punk'], 0.35],
  [['folk', 'country', 'classical', 'ambient', 'acoustic'], 0.28],
];

const ACOUSTIC_GENRE_MAP: [string[], number][] = [
  [['acoustic', 'folk', 'singer-songwriter', 'bluegrass', 'country', 'classical', 'orchestral', 'chamber'], 0.82],
  [['blues', 'jazz', 'soul', 'gospel'], 0.62],
  [['rock', 'indie', 'alternative', 'pop', 'r&b'], 0.32],
  [['hip hop', 'hip-hop', 'rap', 'trap'], 0.20],
  [['edm', 'electro', 'techno', 'dance', 'house', 'dubstep', 'synth', 'industrial'], 0.08],
];

function estimateFromGenreMap(genres: string[], map: [string[], number][]): number {
  const joined = genres.join(' ').toLowerCase();
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [keywords, score] of map) {
    const hits = keywords.filter((kw) => joined.includes(kw)).length;
    if (hits > 0) {
      weightedSum += score * hits;
      totalWeight += hits;
    }
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
}

/** Estimate energy (0–1) from a list of genre strings. */
export function estimateEnergyFromGenres(genres: string[]): number {
  return estimateFromGenreMap(genres, ENERGY_GENRE_MAP);
}

/**
 * Build a MoodSnapshot estimated from artist genres.
 * Used as fallback when Spotify's /audio-features endpoint is unavailable.
 */
export function buildMoodFromGenres(artists: SpotifyArtist[]): MoodSnapshot | null {
  const allGenres = artists.flatMap((a) => a.genres ?? []);
  if (allGenres.length === 0) return null;

  const valence      = estimateFromGenreMap(allGenres, VALENCE_GENRE_MAP);
  const energy       = estimateFromGenreMap(allGenres, ENERGY_GENRE_MAP);
  const danceability = estimateFromGenreMap(allGenres, DANCE_GENRE_MAP);
  const acousticness = estimateFromGenreMap(allGenres, ACOUSTIC_GENRE_MAP);
  // Estimate tempo from energy: range roughly 60–180 BPM
  const tempo = 60 + energy * 120;

  return {
    averageValence:      valence,
    averageEnergy:       energy,
    averageDanceability: danceability,
    averageAcousticness: acousticness,
    averageTempo:        tempo,
    moodLabel: classifyMood(valence, energy),
    moodColor: getMoodColor(valence, energy),
  };
}

function classifyMood(valence: number, energy: number): MoodLabel {
  if (valence > 0.7 && energy > 0.7) return 'Euphoric';
  if (valence > 0.5 && energy > 0.7) return 'Energetic';
  if (valence > 0.6 && energy <= 0.6) return 'Happy';
  if (valence > 0.4 && energy < 0.5) return 'Chill';
  if (valence < 0.4 && energy > 0.6) return 'Tense';
  if (valence < 0.3 && energy < 0.4) return 'Melancholic';
  if (valence > 0.5 && energy < 0.35) return 'Peaceful';
  return 'Dark';
}

function getMoodColor(valence: number, energy: number): string {
  const label = classifyMood(valence, energy);
  const palette: Record<MoodLabel, string> = {
    Euphoric: '#f59e0b',
    Energetic: '#ef4444',
    Happy: '#22c55e',
    Chill: '#6366f1',
    Melancholic: '#64748b',
    Tense: '#f97316',
    Peaceful: '#0ea5e9',
    Dark: '#7c3aed',
  };
  return palette[label];
}

/**
 * Last-resort mood estimate when neither audio features nor genre data are
 * available. Uses average track popularity as a rough proxy: underground /
 * low-popularity tracks skew darker and more intense; mainstream tracks skew
 * upbeat and danceable.
 */
export function buildMoodFromPopularity(tracks: TrackWithFeatures[]): MoodSnapshot | null {
  if (tracks.length === 0) return null;
  // popularity is typed as number but may be undefined at runtime for some
  // Spotify API access tiers — filter to only valid finite values.
  const pops = tracks
    .map((t) => t.popularity)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p) && p >= 0);
  if (pops.length === 0) return null;
  const avgPop = pops.reduce((s, p) => s + p, 0) / pops.length;
  const n = avgPop / 100; // 0–1 normalised

  const energy       = 0.50 + n * 0.25; // 0.50–0.75
  const valence      = 0.25 + n * 0.45; // 0.25–0.70
  const danceability = 0.55 + n * 0.20; // 0.55–0.75
  const acousticness = 0.35 - n * 0.20; // 0.35–0.15
  const tempo        = 85  + n * 55;    // 85–140 BPM

  return {
    averageValence:      valence,
    averageEnergy:       energy,
    averageDanceability: danceability,
    averageAcousticness: acousticness,
    averageTempo:        tempo,
    moodLabel: classifyMood(valence, energy),
    moodColor: getMoodColor(valence, energy),
  };
}
