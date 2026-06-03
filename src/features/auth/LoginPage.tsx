import { useNavigate } from 'react-router-dom';
import { initiateSpotifyLogin } from '@/api/auth';
import { useAppDispatch } from '@/store/hooks';
import { setDemoMode } from '@/store/slices/uiSlice';
import logoTransparent from '@/assets/stream-pulse-logo-transparent.png';

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleDemo = () => {
    dispatch(setDemoMode(true));
    navigate('/');
  };
  return (
    <div className="flex h-screen items-center justify-center bg-[#060f0a]">
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={logoTransparent}
            alt="StreamPulse"
            className="h-14 w-auto object-contain"
            draggable={false}
          />
          <p className="text-sm text-gray-400">
            Spotify Listening Intelligence Platform
          </p>
        </div>

        {/* Feature list */}
        <ul className="space-y-2 text-left text-sm text-gray-400">
          {[
            'Behavioural listening analytics',
            'Mood & energy profiling',
            'Auto-generated insights',
            'Artist deep dives',
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00ffba]" />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => void initiateSpotifyLogin()}
          className="flex items-center gap-2 rounded-xl bg-[#1DB954] px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105 active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Connect with Spotify
        </button>

        <button
          onClick={handleDemo}
          className="text-sm text-gray-400 underline underline-offset-4 transition-colors hover:text-white"
        >
          View Demo (no account needed)
        </button>

        <p className="max-w-xs text-xs text-gray-500">
          We only request read-only access to your listening data. Nothing is
          stored server-side.
        </p>
      </div>
    </div>
  );
}
