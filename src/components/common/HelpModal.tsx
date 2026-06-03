import { useEffect, useRef } from 'react';
import { X, BarChart2, Brain, Home, Lightbulb, Music, Clock, RefreshCw } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

const sections = [
  {
    icon: Home,
    title: 'Overview',
    color: 'text-[#00ffba]',
    bg: 'bg-[#00ffba]/10',
    points: [
      'Snapshot of your top tracks, artists, and key listening stats.',
      'Switch between Last 4 weeks, Last 6 months, and All time using the time range picker.',
      'The Daily Activity chart shows your track count per day — hover a point to see the exact figure.',
      'The Mood Snapshot card summarises the average vibe of your listening with a colour-coded label.',
    ],
  },
  {
    icon: BarChart2,
    title: 'Listening Behaviour',
    color: 'text-teal-400',
    bg: 'bg-teal-400/10',
    points: [
      'See exactly when you listen — the hourly heatmap highlights your peak listening hour.',
      'The daily trend chart shows how your play count changes across the selected period.',
      'Genre Distribution breaks down the genres of your top artists so you can spot patterns.',
      'Change the time range at the top to shift the entire analysis window.',
    ],
  },
  {
    icon: Brain,
    title: 'Mood & Energy',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    points: [
      'The radar chart maps five audio dimensions: Valence (happiness), Energy, Danceability, Acousticness, and Tempo.',
      'Your "Current Vibe" label (e.g. Energetic, Melancholic) is derived from the average valence and energy of your top tracks.',
      'High Energy and Mellow track lists are ranked by Spotify audio features where available, otherwise estimated from genre data.',
      'Values are shown as 0–100 percentages — 100 means maximum for that trait.',
    ],
  },
  {
    icon: Music,
    title: 'Artists',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    points: [
      'Browse your top artists for the selected time range and click any artist to open their deep-dive panel.',
      'The artist radar chart compares the audio profile of their tracks in your library.',
      'Genre tags and popularity score are pulled directly from Spotify.',
      'Your personal play history for that artist is shown at the bottom of the panel.',
    ],
  },
  {
    icon: Lightbulb,
    title: 'Insights',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    points: [
      'Auto-generated observations about your listening patterns — no AI, just rule-based analysis.',
      'Insights are colour-coded: green = positive trend, indigo = informational, amber = something worth noting.',
      'Hit Refresh to regenerate insights against the latest data.',
      'Insights cover behaviour, mood shifts, genre breadth, artist loyalty, and listening time patterns.',
    ],
  },
  {
    icon: Clock,
    title: 'Time Ranges',
    color: 'text-gray-300',
    bg: 'bg-white/10',
    points: [
      '"Last 4 weeks" — your most recent listening activity.',
      '"Last 6 months" — medium-term trends and seasonal patterns.',
      '"All time" — your overall Spotify listening history (up to ~2 years).',
      'Changing the range on any page updates all charts and metrics on that page.',
    ],
  },
  {
    icon: RefreshCw,
    title: 'Data & Privacy',
    color: 'text-gray-400',
    bg: 'bg-white/5',
    points: [
      'All data is fetched directly from Spotify and stays in your browser — nothing is sent to any server.',
      'OAuth tokens are stored in sessionStorage and cleared when you log out.',
      'Data is cached per session. Use the Refresh button on Insights or reload the page to fetch fresh data.',
      'StreamPulse only requests read-only Spotify scopes — it cannot modify your library or playlists.',
    ],
  },
];

export function HelpModal({ onClose }: HelpModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[#00ffba]/15 bg-[#070e0b] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">How to use StreamPulse</h2>
            <p className="mt-0.5 text-xs text-gray-400">Your Spotify listening intelligence platform</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close help"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {sections.map(({ icon: Icon, title, color, bg, points }) => (
            <div key={title} className="flex gap-4">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon size={15} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="mb-1.5 text-sm font-semibold text-white">{title}</h3>
                <ul className="space-y-1">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                      <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${color.replace('text-', 'bg-')}`} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 px-6 py-3">
          <p className="text-xs text-gray-500">
            Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
