import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import listeningReducer from './slices/listeningSlice';
import insightsReducer from './slices/insightsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    listening: listeningReducer,
    insights: insightsReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
