import { describe, it, expect } from 'vitest';
import {
  buildHourlyDistribution,
  buildDailyDistribution,
  buildGenreDistribution,
  buildListeningStats,
  buildMoodSnapshot,
  estimateEnergyFromGenres,
} from '../analytics';
import type { RecentlyPlayedItem, SpotifyArtist, TrackWithFeatures } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(hour: number, durationMs = 200_000): RecentlyPlayedItem {
  const d = new Date(2024, 0, 15, hour, 0, 0);
  return {
    played_at: d.toISOString(),
    track: {
      id: `track-${hour}-${Math.random()}`,
      name: `Track at ${hour}h`,
      artists: [{ id: 'artist1', name: 'Artist', external_urls: { spotify: '' } }],
      album: {
        id: 'album1',
        name: 'Album',
        images: [],
        release_date: '2024-01-01',
        external_urls: { spotify: '' },
      },
      duration_ms: durationMs,
      popularity: 70,
      external_urls: { spotify: '' },
    },
  };
}

function makeArtist(id: string, genres: string[], popularity = 70): SpotifyArtist {
  return {
    id,
    name: `Artist ${id}`,
    genres,
    popularity,
    followers: { total: 1000 },
    images: [],
    external_urls: { spotify: '' },
  };
}

function makeTrackWithFeatures(id: string, audioFeatures: TrackWithFeatures['audioFeatures']): TrackWithFeatures {
  return {
    id,
    name: `Track ${id}`,
    artists: [{ id: 'a1', name: 'Artist', external_urls: { spotify: '' } }],
    album: { id: 'alb1', name: 'Album', images: [], release_date: '2024-01-01', external_urls: { spotify: '' } },
    duration_ms: 200_000,
    popularity: 70,
    external_urls: { spotify: '' },
    audioFeatures,
  };
}

// ─── buildHourlyDistribution ──────────────────────────────────────────────────

describe('buildHourlyDistribution', () => {
  it('returns 24 buckets', () => {
    const result = buildHourlyDistribution([]);
    expect(result).toHaveLength(24);
  });

  it('counts plays in the correct hour', () => {
    const items = [makeItem(10), makeItem(10), makeItem(22)];
    const result = buildHourlyDistribution(items);
    expect(result.find((b) => b.hour === 10)?.count).toBe(2);
    expect(result.find((b) => b.hour === 22)?.count).toBe(1);
    expect(result.find((b) => b.hour === 3)?.count).toBe(0);
  });

  it('formats labels correctly', () => {
    const result = buildHourlyDistribution([]);
    expect(result.find((b) => b.hour === 0)?.label).toBe('12 AM');
    expect(result.find((b) => b.hour === 12)?.label).toBe('12 PM');
    expect(result.find((b) => b.hour === 15)?.label).toBe('3 PM');
    expect(result.find((b) => b.hour === 9)?.label).toBe('9 AM');
  });
});

// ─── buildDailyDistribution ───────────────────────────────────────────────────

describe('buildDailyDistribution', () => {
  it('returns empty array for no items', () => {
    expect(buildDailyDistribution([])).toEqual([]);
  });

  it('groups plays by date and sums minutes', () => {
    const items = [
      makeItem(10, 120_000), // 2 min
      makeItem(14, 180_000), // 3 min — same day
    ];
    const result = buildDailyDistribution(items);
    expect(result).toHaveLength(1);
    expect(result[0].minutes).toBe(5);
    expect(result[0].trackCount).toBe(2);
  });

  it('sorts chronologically', () => {
    const d1 = new Date(2024, 0, 10, 8, 0, 0);
    const d2 = new Date(2024, 0, 11, 8, 0, 0);
    const items: RecentlyPlayedItem[] = [
      { played_at: d2.toISOString(), track: makeItem(8).track },
      { played_at: d1.toISOString(), track: makeItem(8).track },
    ];
    const result = buildDailyDistribution(items);
    expect(result[0].date < result[1].date).toBe(true);
  });
});

// ─── buildGenreDistribution ───────────────────────────────────────────────────

describe('buildGenreDistribution', () => {
  it('returns empty array when no artists', () => {
    expect(buildGenreDistribution([])).toEqual([]);
  });

  it('counts genre occurrences across artists', () => {
    const artists = [
      makeArtist('a1', ['hip hop', 'rap']),
      makeArtist('a2', ['hip hop', 'jazz']),
    ];
    const result = buildGenreDistribution(artists);
    const hh = result.find((g) => g.genre === 'hip hop');
    expect(hh?.count).toBe(2);
  });

  it('sorts by count descending', () => {
    const artists = [
      makeArtist('a1', ['jazz']),
      makeArtist('a2', ['pop', 'pop']),  // note: genres per artist deduplicate naturally
      makeArtist('a3', ['jazz', 'jazz']),
    ];
    const result = buildGenreDistribution(artists);
    // Each genre string is counted once per artist, so jazz=2, pop=1
    expect(result[0].genre).toBe('jazz');
  });

  it('percentages sum to ~100', () => {
    const artists = [makeArtist('a1', ['hip hop', 'jazz']), makeArtist('a2', ['pop'])];
    const result = buildGenreDistribution(artists);
    const total = result.reduce((s, g) => s + g.percentage, 0);
    expect(total).toBeGreaterThanOrEqual(99);
    expect(total).toBeLessThanOrEqual(101);
  });
});

// ─── buildListeningStats ──────────────────────────────────────────────────────

describe('buildListeningStats', () => {
  it('returns zeroed stats for empty input', () => {
    const stats = buildListeningStats([], []);
    expect(stats.totalMinutesListened).toBe(0);
    expect(stats.uniqueArtists).toBe(0);
    expect(stats.uniqueTracks).toBe(0);
  });

  it('counts unique tracks and artists correctly', () => {
    const items = [makeItem(10), makeItem(10)];
    // Force distinct IDs so they show as 2 unique tracks
    items[0].track.id = 'track-a';
    items[1].track.id = 'track-b';
    const stats = buildListeningStats(items, []);
    expect(stats.uniqueTracks).toBe(2);
  });

  it('correctly identifies most active hour', () => {
    const items = [makeItem(22), makeItem(22), makeItem(22), makeItem(10)];
    const stats = buildListeningStats(items, []);
    expect(stats.mostActiveHour).toBe(22);
  });

  it('includes topGenres from artists', () => {
    const artists = [makeArtist('a1', ['hip hop'])];
    const stats = buildListeningStats([], artists);
    expect(stats.topGenres.length).toBeGreaterThan(0);
    expect(stats.topGenres[0].genre).toBe('hip hop');
  });
});

// ─── buildMoodSnapshot ────────────────────────────────────────────────────────

describe('buildMoodSnapshot', () => {
  it('returns null when no tracks have audio features', () => {
    const tracks = [makeTrackWithFeatures('t1', null), makeTrackWithFeatures('t2', null)];
    expect(buildMoodSnapshot(tracks)).toBeNull();
  });

  it('computes averages from audio features', () => {
    const tracks = [
      makeTrackWithFeatures('t1', {
        id: 't1', danceability: 0.8, energy: 0.9, valence: 0.7,
        acousticness: 0.1, instrumentalness: 0, speechiness: 0.05,
        liveness: 0.1, loudness: -5, tempo: 140, key: 5, mode: 1, time_signature: 4,
      }),
      makeTrackWithFeatures('t2', {
        id: 't2', danceability: 0.6, energy: 0.7, valence: 0.5,
        acousticness: 0.3, instrumentalness: 0, speechiness: 0.05,
        liveness: 0.1, loudness: -8, tempo: 120, key: 5, mode: 1, time_signature: 4,
      }),
    ];
    const snap = buildMoodSnapshot(tracks);
    expect(snap).not.toBeNull();
    expect(snap!.averageEnergy).toBeCloseTo(0.8, 1);
    expect(snap!.averageValence).toBeCloseTo(0.6, 1);
    expect(snap!.averageTempo).toBeCloseTo(130, 0);
  });
});

// ─── estimateEnergyFromGenres ─────────────────────────────────────────────────

describe('estimateEnergyFromGenres', () => {
  it('returns 0.5 for unknown genres', () => {
    expect(estimateEnergyFromGenres(['xyzgenre_unknown'])).toBe(0.5);
  });

  it('estimates metal higher than classical', () => {
    const metalEnergy = estimateEnergyFromGenres(['metal', 'hardcore']);
    const classicalEnergy = estimateEnergyFromGenres(['classical', 'orchestral']);
    expect(metalEnergy).toBeGreaterThan(classicalEnergy);
  });

  it('estimates dance genres as high energy', () => {
    const energy = estimateEnergyFromGenres(['edm', 'techno', 'dance']);
    expect(energy).toBeGreaterThan(0.8);
  });
});
