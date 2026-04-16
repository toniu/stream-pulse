import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setDailyDistribution,
  setError,
  setHourlyDistribution,
  setListeningStats,
  setLoading,
  setMoodSnapshot,
  setRecentTracks,
  setTopArtists,
  setTopTracks,
} from '@/store/slices/listeningSlice';
import {
  fetchRecentlyPlayed,
  fetchTopArtists,
  fetchTopTracks,
} from '@/api/endpoints';
import {
  buildDailyDistribution,
  buildHourlyDistribution,
  buildListeningStats,
  buildMoodSnapshot,
} from '@/utils/analytics';
import type { TimeRange, TrackWithFeatures } from '@/types';

export function useListeningData() {
  const dispatch = useAppDispatch();
  const {
    timeRange,
    topTracks,
    topArtists,
    recentTracks,
    listeningStats,
    moodSnapshot,
    hourlyDistribution,
    dailyDistribution,
    isLoading,
    error,
  } = useAppSelector((s) => s.listening);

  const loadAll = useCallback(
    async (range: TimeRange = timeRange) => {
      if (isLoading) return; // prevent concurrent fetches
      dispatch(setLoading(true));
      dispatch(setError(null));
      try {
        const [tracksPage, artistsPage, recent] = await Promise.all([
          fetchTopTracks(range, 50),
          fetchTopArtists(range, 50),
          fetchRecentlyPlayed(50),
        ]);

        // Audio features endpoint (GET /audio-features) is restricted to
        // apps with Extended Quota Mode — set audioFeatures to null for all tracks.
        const enrichedTop: TrackWithFeatures[] = tracksPage.items.map((t) => ({
          ...t,
          audioFeatures: null,
        }));

        const enrichedRecent: TrackWithFeatures[] = recent.items.map((i) => ({
          ...i.track,
          audioFeatures: null,
        }));

        dispatch(setTopTracks(enrichedTop));
        dispatch(setTopArtists(artistsPage.items));
        dispatch(setRecentTracks(enrichedRecent));
        dispatch(
          setListeningStats(
            buildListeningStats(recent.items, artistsPage.items)
          )
        );

        const mood = buildMoodSnapshot(enrichedTop);
        if (mood) dispatch(setMoodSnapshot(mood));

        dispatch(setHourlyDistribution(buildHourlyDistribution(recent.items)));
        dispatch(setDailyDistribution(buildDailyDistribution(recent.items)));
      } catch (err) {
        dispatch(
          setError(err instanceof Error ? err.message : 'Failed to load data')
        );
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, timeRange, isLoading]
  );

  return {
    timeRange,
    topTracks,
    topArtists,
    recentTracks,
    listeningStats,
    moodSnapshot,
    hourlyDistribution,
    dailyDistribution,
    isLoading,
    error,
    loadAll,
  };
}
