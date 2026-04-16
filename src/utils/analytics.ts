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
