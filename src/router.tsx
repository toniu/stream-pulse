import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/features/auth/LoginPage';
import { CallbackPage } from '@/features/auth/CallbackPage';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { ListeningPage } from '@/features/listening/ListeningPage';
import { MoodPage } from '@/features/mood/MoodPage';
import { ArtistsPage } from '@/features/artists/ArtistsPage';
import { InsightsPage } from '@/features/insights/InsightsPage';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/callback', element: <CallbackPage /> },
  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'listening', element: <ListeningPage /> },
      { path: 'mood', element: <MoodPage /> },
      { path: 'artists', element: <ArtistsPage /> },
      { path: 'insights', element: <InsightsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
