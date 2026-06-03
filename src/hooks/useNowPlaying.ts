import { useEffect, useRef, useState } from 'react';
import { fetchNowPlaying } from '@/api/endpoints';
import type { NowPlayingResponse } from '@/types';

const POLL_INTERVAL_MS = 15_000; // 15 s — polite polling rate

export function useNowPlaying() {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = async () => {
    const data = await fetchNowPlaying();
    // Only store track-type items; skip ads/episodes
    if (data?.currently_playing_type === 'track') {
      setNowPlaying(data);
    } else {
      setNowPlaying(null);
    }
  };

  useEffect(() => {
    void poll();
    timerRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return nowPlaying;
}
