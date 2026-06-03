import client from './client';
import type {
  AudioFeatures,
  NowPlayingResponse,
  RecentlyPlayedItem,
  RecentlyPlayedResponse,
  SpotifyArtist,
  SpotifyPagingObject,
  SpotifyTrack,
  SpotifyUser,
  TimeRange,
} from '@/types';

// ─── User ─────────────────────────────────────────────────────────────────────

export const fetchCurrentUser = (): Promise<SpotifyUser> =>
  client.get<SpotifyUser>('/me').then((r) => r.data);

// ─── Top Items ────────────────────────────────────────────────────────────────

export const fetchTopTracks = (
  timeRange: TimeRange = 'medium_term',
  limit = 50
): Promise<SpotifyPagingObject<SpotifyTrack>> =>
  client
    .get<SpotifyPagingObject<SpotifyTrack>>('/me/top/tracks', {
      params: { time_range: timeRange, limit },
    })
    .then((r) => r.data);

export const fetchTopArtists = (
  timeRange: TimeRange = 'medium_term',
  limit = 50
): Promise<SpotifyPagingObject<SpotifyArtist>> =>
  client
    .get<SpotifyPagingObject<SpotifyArtist>>('/me/top/artists', {
      params: { time_range: timeRange, limit },
    })
    .then((r) => r.data);

// ─── Recently Played ──────────────────────────────────────────────────────────

/**
 * Fetches recently-played items since `sinceMs` (Unix timestamp in ms),
 * paginating via cursor until the time boundary is reached or `maxItems` are
 * collected. Returns newest-first.
 *
 * For long_term (sinceMs = 0) the limit cap determines how far back we go.
 */
export const fetchRecentlyPlayedSince = async (
  sinceMs: number,
  maxItems = 200
): Promise<RecentlyPlayedItem[]> => {
  const collected: RecentlyPlayedItem[] = [];
  // Start from the most-recent plays and walk backwards in time.
  let next: string | null = '/me/player/recently-played?limit=50';

  while (next && collected.length < maxItems) {
    // axios treats absolute URLs (https://…) as-is even with a baseURL set.
    const page = await client
      .get<RecentlyPlayedResponse>(next)
      .then((r) => r.data);

    let hitBoundary = false;
    for (const item of page.items) {
      if (sinceMs > 0 && new Date(item.played_at).getTime() < sinceMs) {
        hitBoundary = true;
        break;
      }
      collected.push(item);
      if (collected.length >= maxItems) break;
    }

    next = hitBoundary || !page.next ? null : page.next;
  }

  return collected;
};

// ─── Audio Features ───────────────────────────────────────────────────────────

export const fetchAudioFeaturesForTracks = async (
  trackIds: string[]
): Promise<AudioFeatures[]> => {
  if (trackIds.length === 0) return [];

  // Spotify deprecated /audio-features for new apps (post-Nov 2024).
  // Return empty array gracefully so the dashboard still loads.
  const chunks: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    chunks.push(trackIds.slice(i, i + 100));
  }

  try {
    const results = await Promise.all(
      chunks.map((chunk) =>
        client
          .get<{ audio_features: (AudioFeatures | null)[] }>(
            '/audio-features',
            { params: { ids: chunk.join(',') } }
          )
          .then((r) => r.data.audio_features.filter(Boolean) as AudioFeatures[])
      )
    );
    return results.flat();
  } catch {
    // 403 = endpoint not available for this app; degrade gracefully
    return [];
  }
};

// ─── Artist ───────────────────────────────────────────────────────────────────

export const fetchArtist = (artistId: string): Promise<SpotifyArtist> =>
  client.get<SpotifyArtist>(`/artists/${artistId}`).then((r) => r.data);

export const fetchArtistTopTracks = (
  artistId: string,
  market?: string
): Promise<SpotifyTrack[]> =>
  client
    .get<{ tracks: SpotifyTrack[] }>(`/artists/${artistId}/top-tracks`, {
      params: market ? { market } : undefined,
    })
    .then((r) => r.data.tracks);

// ─── Now Playing ──────────────────────────────────────────────────────────────

/**
 * Returns the currently-playing track, or null when nothing is playing
 * (204 No Content) or the endpoint returns a non-track item.
 */
export const fetchNowPlaying = async (): Promise<NowPlayingResponse | null> => {
  try {
    const res = await client.get<NowPlayingResponse>(
      '/me/player/currently-playing'
    );
    // 204 means nothing is playing
    if (res.status === 204 || !res.data) return null;
    return res.data;
  } catch {
    return null;
  }
};
