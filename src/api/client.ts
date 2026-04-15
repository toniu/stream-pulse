import axios from 'axios';
import { store } from '@/store';
import { logout } from '@/store/slices/authSlice';

const BASE_URL = 'https://api.spotify.com/v1';

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

// Handle 401 — token expired/invalid → log out
spotifyClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default spotifyClient;
