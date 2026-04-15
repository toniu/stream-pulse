import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  DailyListening,
  ListeningHour,
  ListeningStats,
  MoodSnapshot,
  TrackWithFeatures,
} from '@/types';
import type { SpotifyArtist, TimeRange } from '@/types/spotify';

interface ListeningState {
  timeRange: TimeRange;
  topTracks: TrackWithFeatures[];
  topArtists: SpotifyArtist[];
  recentTracks: TrackWithFeatures[];
  listeningStats: ListeningStats | null;
  moodSnapshot: MoodSnapshot | null;
  hourlyDistribution: ListeningHour[];
  dailyDistribution: DailyListening[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ListeningState = {
  timeRange: 'medium_term',
  topTracks: [],
  topArtists: [],
  recentTracks: [],
  listeningStats: null,
  moodSnapshot: null,
  hourlyDistribution: [],
  dailyDistribution: [],
  isLoading: false,
  error: null,
};

const listeningSlice = createSlice({
  name: 'listening',
  initialState,
  reducers: {
    setTimeRange(state, action: PayloadAction<TimeRange>) {
      state.timeRange = action.payload;
    },
    setTopTracks(state, action: PayloadAction<TrackWithFeatures[]>) {
      state.topTracks = action.payload;
    },
    setTopArtists(state, action: PayloadAction<SpotifyArtist[]>) {
      state.topArtists = action.payload;
    },
    setRecentTracks(state, action: PayloadAction<TrackWithFeatures[]>) {
      state.recentTracks = action.payload;
    },
    setListeningStats(state, action: PayloadAction<ListeningStats>) {
      state.listeningStats = action.payload;
    },
    setMoodSnapshot(state, action: PayloadAction<MoodSnapshot>) {
      state.moodSnapshot = action.payload;
    },
    setHourlyDistribution(state, action: PayloadAction<ListeningHour[]>) {
      state.hourlyDistribution = action.payload;
    },
    setDailyDistribution(state, action: PayloadAction<DailyListening[]>) {
      state.dailyDistribution = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setTimeRange,
  setTopTracks,
  setTopArtists,
  setRecentTracks,
  setListeningStats,
  setMoodSnapshot,
  setHourlyDistribution,
  setDailyDistribution,
  setLoading,
  setError,
} = listeningSlice.actions;
export default listeningSlice.reducer;
