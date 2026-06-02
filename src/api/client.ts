import axios, { type InternalAxiosRequestConfig } from 'axios';
import { store } from '@/store';
import { logout } from '@/store/slices/authSlice';

const BASE_URL = 'https://api.spotify.com/v1';

// Extend config type to track retries
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

const spotifyClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
});

// Attach auth token from Redux store on every request
spotifyClient.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 + 429
spotifyClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    if (error.response?.status === 401) {
      store.dispatch(logout());
      return Promise.reject(error);
    }

    if (error.response?.status === 429) {
      const config = error.config as RetryableConfig | undefined;
      // Only retry once — if the retry itself 429s, propagate
      if (!config || config._retried) return Promise.reject(error);
      config._retried = true;

      const retryAfter = Number(error.response.headers['retry-after'] ?? 10);
      const waitMs = Math.min(retryAfter * 1_000, 30_000); // cap at 30 s
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return spotifyClient(config);
    }

    return Promise.reject(error);
  }
);

export default spotifyClient;
