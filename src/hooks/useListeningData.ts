import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { store } from '@/store';
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
  fetchRecentlyPlayedSince,
  fetchTopArtists,
  fetchTopTracks,
} from '@/api/endpoints';
import {
  buildDailyDistribution,
  buildHourlyDistribution,
  buildListeningStats,
  buildMoodFromGenres,
  buildMoodFromPopularity,
  buildMoodSnapshot,
} from '@/utils/analytics';
import { rangeStartMs } from '@/types/spotify';
import type { AudioFeatures, TimeRange, TrackWithFeatures } from '@/types';

// Module-level timestamp so all hook instances share the same cooldown
let lastLoadAt = 0;
const LOAD_COOLDOWN_MS = 5_000; // don't reload within 5 seconds

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
    async (range: TimeRange = timeRange, force = false) => {
      // Read live store state — guards against the race where multiple
      // components mount simultaneously and all see isLoading=false from
      // their stale closures before the first dispatch fires.
      if (store.getState().listening.isLoading) return;
      // Cooldown: don't hit the API again if we just loaded (skip for explicit range changes)
      const now = Date.now();
      if (!force && now - lastLoadAt < LOAD_COOLDOWN_MS) return;
      lastLoadAt = now;
      dispatch(setLoading(true));
      dispatch(setError(null));
      try {
        const [tracksPage, artistsPage, recent] = await Promise.all([
          fetchTopTracks(range, 50),
          fetchTopArtists(range, 50),
          fetchRecentlyPlayedSince(rangeStartMs(range), 200),
        ]);

        // Attempt to fetch audio features — returns [] gracefully on 403 (restricted endpoint).
        const trackIds = tracksPage.items.map((t) => t.id);
        const audioFeaturesList = await fetchAudioFeaturesForTracks(trackIds);
        const audioFeaturesMap: Record<string, AudioFeatures> = {};
        audioFeaturesList.forEach((f) => { audioFeaturesMap[f.id] = f; });

        const enrichedTop: TrackWithFeatures[] = tracksPage.items.map((t) => ({
          ...t,
          audioFeatures: audioFeaturesMap[t.id] ?? null,
        }));

        const enrichedRecent: TrackWithFeatures[] = recent.map((i) => ({
          ...i.track,
          audioFeatures: null,
        }));

        dispatch(setTopTracks(enrichedTop));
        dispatch(setTopArtists(artistsPage.items));
        dispatch(setRecentTracks(enrichedRecent));
        dispatch(
          setListeningStats(
            buildListeningStats(recent, artistsPage.items)
          )
        );

        const mood = buildMoodSnapshot(enrichedTop)
          ?? buildMoodFromGenres(artistsPage.items)
          ?? buildMoodFromPopularity(enrichedTop);
        if (mood) dispatch(setMoodSnapshot(mood));

        dispatch(setHourlyDistribution(buildHourlyDistribution(recent)));
        dispatch(setDailyDistribution(buildDailyDistribution(recent)));
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
