import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { isTokenExpired } from '@/api/auth';
import type React from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, expiresAt } = useAppSelector((s) => s.auth);

  const isAuthenticated =
    !!accessToken && (expiresAt === null || !isTokenExpired(expiresAt));

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
