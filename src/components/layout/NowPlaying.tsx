import { Music } from 'lucide-react';
import { useNowPlaying } from '@/hooks/useNowPlaying';

/**
 * Compact Now Playing bar shown at the bottom of the sidebar.
 * Only renders when something is actively playing.
 */
export function NowPlaying({ collapsed }: { collapsed: boolean }) {
  const nowPlaying = useNowPlaying();

  if (!nowPlaying?.is_playing || !nowPlaying.item) return null;

  const track = nowPlaying.item;
  const albumArt = track.album.images[track.album.images.length - 1]?.url;
  const progress =
    nowPlaying.progress_ms != null && track.duration_ms > 0
      ? (nowPlaying.progress_ms / track.duration_ms) * 100
      : 0;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-[#00ffba]/10 px-2 py-3">
        <div className="relative">
          {albumArt ? (
            <img
              src={albumArt}
              alt=""
              className="h-8 w-8 rounded-md object-cover ring-1 ring-[#00ffba]/30"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#00ffba]/10 text-[#00ffba]">
              <Music size={14} />
            </span>
          )}
          {/* pulse dot */}
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#00ffba] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[#00ffba]/10 px-3 py-3">
      {/* Label row */}
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#00ffba] animate-pulse shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#00ffba]">
          Now Playing
        </span>
      </div>

      {/* Track row */}
      <div className="flex items-center gap-2 min-w-0">
        {albumArt ? (
          <img
            src={albumArt}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#00ffba]/10 text-[#00ffba]">
            <Music size={14} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white leading-tight">
            {track.name}
          </p>
          <p className="truncate text-[11px] text-gray-400 leading-tight">
            {track.artists.map((a) => a.name).join(', ')}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5 h-0.5 w-full rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#00ffba] transition-all duration-15000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
