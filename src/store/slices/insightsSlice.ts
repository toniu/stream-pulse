import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Insight } from '@/types';

interface InsightsState {
  insights: Insight[];
  isGenerating: boolean;
  lastGeneratedAt: string | null;
}

const initialState: InsightsState = {
  insights: [],
  isGenerating: false,
  lastGeneratedAt: null,
};

const insightsSlice = createSlice({
  name: 'insights',
  initialState,
  reducers: {
    setInsights(state, action: PayloadAction<Insight[]>) {
      state.insights = action.payload;
      state.lastGeneratedAt = new Date().toISOString();
    },
    setGenerating(state, action: PayloadAction<boolean>) {
      state.isGenerating = action.payload;
    },
  },
});

export const { setInsights, setGenerating } = insightsSlice.actions;
export default insightsSlice.reducer;
