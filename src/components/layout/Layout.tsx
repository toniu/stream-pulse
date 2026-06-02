import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useListeningData } from '@/hooks/useListeningData';

export function Layout() {
  const { loadAll } = useListeningData();

  // Load data exactly once when the authenticated shell mounts.
  // Individual pages must NOT call loadAll on mount — only on explicit
  // range changes — to avoid concurrent requests and Spotify 429s.
  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen bg-[#060f0a] text-white overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
