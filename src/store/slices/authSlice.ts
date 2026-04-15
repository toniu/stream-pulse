import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SpotifyUser } from '@/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: SpotifyUser | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  accessToken: sessionStorage.getItem('sp_access_token'),
  refreshToken: sessionStorage.getItem('sp_refresh_token'),
  expiresAt: Number(sessionStorage.getItem('sp_expires_at')) || null,
  user: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens(
      state,
      action: PayloadAction<{ accessToken: string; expiresAt: number }>
    ) {
      state.accessToken = action.payload.accessToken;
      state.expiresAt = action.payload.expiresAt;
      sessionStorage.setItem('sp_access_token', action.payload.accessToken);
      sessionStorage.setItem('sp_expires_at', String(action.payload.expiresAt));
    },
    setUser(state, action: PayloadAction<SpotifyUser>) {
      state.user = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.user = null;
      state.error = null;
      sessionStorage.removeItem('sp_access_token');
      sessionStorage.removeItem('sp_refresh_token');
      sessionStorage.removeItem('sp_expires_at');
    },
  },
});

export const { setTokens, setUser, setLoading, setError, logout } =
  authSlice.actions;
export default authSlice.reducer;
