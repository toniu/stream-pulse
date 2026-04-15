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
  fetchAudioFeaturesForTracks,
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
      dispatch(setLoading(true));
      dispatch(setError(null));
      try {
        const [tracksPage, artistsPage, recent] = await Promise.all([
          fetchTopTracks(range, 50),
          fetchTopArtists(range, 50),
          fetchRecentlyPlayed(50),
        ]);

        // Enrich tracks with audio features
        const ids = tracksPage.items.map((t) => t.id);
        const features = await fetchAudioFeaturesForTracks(ids);
        const featureMap = new Map(features.map((f) => [f.id, f]));

        const enrichedTop: TrackWithFeatures[] = tracksPage.items.map((t) => ({
          ...t,
          audioFeatures: featureMap.get(t.id) ?? null,
        }));

        const recentIds = recent.items.map((i) => i.track.id);
        const recentFeatures = await fetchAudioFeaturesForTracks(recentIds);
        const recentFeatureMap = new Map(recentFeatures.map((f) => [f.id, f]));
        const enrichedRecent: TrackWithFeatures[] = recent.items.map((i) => ({
          ...i.track,
          audioFeatures: recentFeatureMap.get(i.track.id) ?? null,
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
    [dispatch, timeRange]
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
