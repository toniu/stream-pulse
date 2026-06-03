import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useListeningData } from '@/hooks/useListeningData';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDemoMode } from '@/store/slices/uiSlice';

export function Layout() {
  const { loadAll } = useListeningData();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const demoMode = useAppSelector((s) => s.ui.demoMode);

  // Load data exactly once when the authenticated shell mounts.
  // Individual pages must NOT call loadAll on mount — only on explicit
  // range changes — to avoid concurrent requests and Spotify 429s.
  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exitDemo = () => {
    dispatch(setDemoMode(false));
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#060f0a] text-white overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {demoMode && (
          <div className="flex items-center justify-between gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
            <p className="text-xs text-amber-300">
              <span className="font-semibold">Demo Mode</span> — showing sample data. Connect Spotify for your real insights.
            </p>
            <button
              onClick={exitDemo}
              className="shrink-0 rounded-md border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
            >
              Connect Spotify
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
