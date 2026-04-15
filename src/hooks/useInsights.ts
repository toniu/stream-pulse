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
    loadAll,
  } = useListeningData();

  const generate = useCallback(() => {
    if (!listeningStats || !moodSnapshot) return;

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

  useEffect(() => {
    if (!listeningStats) {
      void loadAll().then(generate);
    } else {
      generate();
    }
  }, []);

  return { insights, isGenerating, lastGeneratedAt, generate };
}
