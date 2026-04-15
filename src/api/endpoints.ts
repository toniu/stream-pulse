import client from './client';
import type {
  AudioFeatures,
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

export const fetchRecentlyPlayed = (
  limit = 50
): Promise<RecentlyPlayedResponse> =>
  client
    .get<RecentlyPlayedResponse>('/me/player/recently-played', {
      params: { limit },
    })
    .then((r) => r.data);

// ─── Audio Features ───────────────────────────────────────────────────────────

export const fetchAudioFeaturesForTracks = async (
  trackIds: string[]
): Promise<AudioFeatures[]> => {
  // Spotify accepts max 100 IDs per request
  const chunks: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    chunks.push(trackIds.slice(i, i + 100));
  }

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
};

// ─── Artist ───────────────────────────────────────────────────────────────────

export const fetchArtist = (artistId: string): Promise<SpotifyArtist> =>
  client.get<SpotifyArtist>(`/artists/${artistId}`).then((r) => r.data);

export const fetchArtistTopTracks = (
  artistId: string,
  market = 'US'
): Promise<SpotifyTrack[]> =>
  client
    .get<{ tracks: SpotifyTrack[] }>(`/artists/${artistId}/top-tracks`, {
      params: { market },
    })
    .then((r) => r.data.tracks);
