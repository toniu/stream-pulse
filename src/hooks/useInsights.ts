import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setInsights, setGenerating } from '@/store/slices/insightsSlice';
import { useListeningData } from './useListeningData';
import { generateInsights } from '@/services/insights/engine';
import type { InsightContext } from '@/types';

export function useInsights() {
  const dispatch = useAppDispatch();
  const { insights, isGenerating, lastGeneratedAt } = useAppSelector(
    (s) => s.insights
  );
  const {
    recentTracks,
    topTracks,
    topArtists,
    listeningStats,
    moodSnapshot,
    hourlyDistribution,
  } = useListeningData();

  const generate = useCallback(() => {
    // Only require listeningStats — moodSnapshot may be null for apps without
    // Extended Quota (audio features restricted). Mood-specific rules handle
    // null gracefully via the engine's per-rule try/catch.
    if (!listeningStats) return;

    dispatch(setGenerating(true));

    const context: InsightContext = {
      recentTracks,
      topTracks,
      topArtists,
      listeningStats,
      moodSnapshot,
      hourlyDistribution,
    };

    const result = generateInsights(context);
    dispatch(setInsights(result));
    dispatch(setGenerating(false));
  }, [
    dispatch,
    recentTracks,
    topTracks,
    topArtists,
    listeningStats,
    moodSnapshot,
    hourlyDistribution,
  ]);

  // Re-run whenever listeningStats or moodSnapshot change so that mood insights
  // are included once audio features arrive (they load after the base stats).
  useEffect(() => {
    if (listeningStats) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listeningStats, moodSnapshot]);

  return { insights, isGenerating, lastGeneratedAt, generate };
}
