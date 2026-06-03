import { useMemo, useState } from 'react';
import { Users, Music2, TrendingUp, Activity, Music } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { RadarChart } from '@/components/charts/RadarChart';
import { TimeRangePicker } from '@/components/common/TimeRangePicker';
import { useListeningData } from '@/hooks/useListeningData';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTimeRange } from '@/store/slices/listeningSlice';
import { fetchArtist } from '@/api/endpoints';
import { buildMoodFromGenres } from '@/utils/analytics';
import type { SpotifyArtist, RadarDataPoint, TimeRange, TrackWithFeatures } from '@/types';
import { formatNumber } from '@/utils/formatters';

export function ArtistsPage() {
  const dispatch = useAppDispatch();
  const timeRange = useAppSelector((s) => s.listening.timeRange);
  const { topArtists, recentTracks, isLoading, error, loadAll } =
    useListeningData();

  const handleRangeChange = (r: TimeRange) => {
    dispatch(setTimeRange(r));
    void loadAll(r, true);
  };

  const [selectedArtist, setSelectedArtist] = useState<SpotifyArtist | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleSelectArtist = async (artistId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const artist = await fetchArtist(artistId);
      setSelectedArtist(artist);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load artist details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // User's own recent plays for the selected artist, deduped and sorted by play count
  const userPlays = useMemo(() => {
    if (!selectedArtist) return [] as { track: TrackWithFeatures; plays: number }[];
    const map = new Map<string, { track: TrackWithFeatures; plays: number }>();
    recentTracks.forEach((t) => {
      if (!t.artists.some((a) => a.id === selectedArtist.id)) return;
      const existing = map.get(t.id);
      if (existing) existing.plays++;
      else map.set(t.id, { track: t, plays: 1 });
    });
    return [...map.values()].sort((a, b) => b.plays - a.plays).slice(0, 7);
  }, [selectedArtist, recentTracks]);

  // Build radar from selected artist's genres — works without /audio-features
  const artistMood = selectedArtist ? buildMoodFromGenres([selectedArtist]) : null;

  // Only build radar data when we have genre estimates — an all-zero radar
  // is more confusing than the empty-state message.
  const radarData: RadarDataPoint[] = selectedArtist && artistMood
    ? [
        { subject: 'Energy',    value: Math.round(artistMood.averageEnergy * 100), fullMark: 100 },
        { subject: 'Valence',   value: Math.round(artistMood.averageValence * 100), fullMark: 100 },
        { subject: 'Dance',     value: Math.round(artistMood.averageDanceability * 100), fullMark: 100 },
        { subject: 'Acoustic',  value: Math.round(artistMood.averageAcousticness * 100), fullMark: 100 },
        { subject: 'Popularity', value: selectedArtist.popularity, fullMark: 100 },
      ]
    : [];

  return (
    <div className="flex flex-col">
      <Header title="Artist Deep Dive" subtitle="Explore your top artists" />
      <div className="p-4 space-y-4">
        {/* Time range picker */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest">Period</h2>
          <TimeRangePicker value={timeRange} onChange={handleRangeChange} />
        </div>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingSpinner size={32} />
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Artist list */}
            <div className="lg:col-span-1">
              <Card padding="sm">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <Users size={12} className="text-gray-500" />
                  <h3 className="text-xs font-medium uppercase tracking-widest text-gray-500">
                    Top Artists
                  </h3>
                </div>
                <ul className="space-y-0.5">
                  {topArtists.slice(0, 20).map((artist, i) => (
                    <li key={artist.id}>
                        <button
                          onClick={() => void handleSelectArtist(artist.id)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-all ${
                            selectedArtist?.id === artist.id
                              ? 'bg-[#00ffba]/10 text-[#00ffba]'
                              : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-gray-600">
                            {i + 1}
                          </span>
                          {(artist.images ?? [])[2]?.url || (artist.images ?? [])[0]?.url ? (
                            <img
                              src={(artist.images ?? [])[2]?.url ?? (artist.images ?? [])[0]?.url}
                              alt=""
                              className="h-7 w-7 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00ffba]/10 text-[10px] font-bold text-[#00ffba]">
                              {artist.name[0]?.toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium leading-tight">{artist.name}</p>
                            {(artist.genres ?? [])[0] && (
                              <p className="truncate text-[10px] text-gray-500 leading-tight">
                                {artist.genres![0]}
                              </p>
                            )}
                          </div>
                          {selectedArtist?.id === artist.id && (
                            <div className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#00ffba]" />
                          )}
                        </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Artist detail */}
            <div className="lg:col-span-2 space-y-3">
              {detailLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : detailError ? (
                <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
                  <p className="text-sm font-medium text-red-400">Failed to load artist</p>
                  <p className="text-xs text-gray-400">{detailError}</p>
                  <button
                    onClick={() => setDetailError(null)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
                  >
                    Dismiss
                  </button>
                </div>
              ) : selectedArtist ? (
                <>
                  {/* Hero */}
                  <Card padding="sm">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        {(selectedArtist.images ?? [])[0]?.url ? (
                          <img
                            src={(selectedArtist.images ?? [])[0]?.url}
                            alt=""
                            className="h-16 w-16 rounded-xl object-cover"
                            style={{ boxShadow: '0 0 20px #00ffba22' }}
                          />
                        ) : (
                          <span
                            className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#00ffba]/10 text-2xl font-bold text-[#00ffba]"
                            style={{ boxShadow: '0 0 20px #00ffba22' }}
                          >
                            {selectedArtist.name[0]?.toUpperCase()}
                          </span>
                        )}
                        <div
                          className="absolute inset-0 rounded-xl"
                          style={{ boxShadow: 'inset 0 0 0 1px #00ffba44' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold text-white leading-tight">
                          {selectedArtist.name}
                        </h2>
                        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-gray-400">
                          {selectedArtist.followers?.total != null && (
                            <span className="flex items-center gap-1">
                              <Users size={10} />
                              {formatNumber(selectedArtist.followers.total)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                              <TrendingUp size={10} />
                              {Number.isFinite(selectedArtist.popularity) && selectedArtist.popularity != null
                                ? `${selectedArtist.popularity}/100`
                                : '—'}
                            </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(selectedArtist.genres ?? []).slice(0, 4).map((g) => (
                            <span
                              key={g}
                              className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ background: '#00ffba14', color: '#00ffba' }}
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {/* Audio radar */}
                    <Card padding="sm">
                      <div className="mb-2 flex items-center gap-2">
                        <Activity size={12} style={{ color: '#00ffba' }} />
                        <h3 className="text-xs font-medium text-gray-300">Audio Fingerprint</h3>
                      </div>
                      {radarData.length > 0 ? (
                        <RadarChart data={radarData} height={200} />
                      ) : (
                        <div className="py-3 space-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">Popularity</span>
                              <span className="font-medium text-white">
                                {Number.isFinite(selectedArtist.popularity) && selectedArtist.popularity != null
                                  ? `${selectedArtist.popularity}/100`
                                  : '—'}
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/5">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: Number.isFinite(selectedArtist.popularity) && selectedArtist.popularity != null
                                    ? `${selectedArtist.popularity}%`
                                    : '0%',
                                  background: '#00ffba',
                                }}
                              />
                            </div>
                          </div>
                          {selectedArtist.followers?.total != null && (
                            <p className="text-xs text-gray-400 text-center">
                              {formatNumber(selectedArtist.followers.total)} followers
                            </p>
                          )}
                          <p className="text-[10px] text-gray-600 text-center">
                            No genre data on Spotify for this artist
                          </p>
                        </div>
                      )}
                    </Card>

                    {/* User's own plays for this artist */}
                    <Card padding="sm">
                      <div className="mb-2 flex items-center gap-2">
                        <Music size={12} style={{ color: '#00ffba' }} />
                        <h3 className="text-xs font-medium text-gray-300">Your Recent Plays</h3>
                      </div>
                      {userPlays.length === 0 ? (
                        <p className="py-6 text-center text-xs text-gray-500">
                          No recent plays in your history
                        </p>
                      ) : (
                        <ol className="space-y-1.5">
                          {userPlays.map(({ track: t, plays }, i) => (
                            <li key={t.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/5 transition-colors">
                              <span className="w-4 shrink-0 text-[10px] tabular-nums text-gray-600">{i + 1}</span>
                              {(t.album.images ?? [])[2]?.url ? (
                                <img
                                  src={(t.album.images ?? [])[2]?.url}
                                  alt=""
                                  className="h-6 w-6 rounded-md shrink-0"
                                />
                              ) : (
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-gray-500">
                                  <Music2 size={10} />
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-white leading-tight">
                                  {t.name}
                                </p>
                              </div>
                              <span className="text-[10px] tabular-nums text-[#00ffba] shrink-0">
                                {plays}×
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </Card>
                  </div>
                </>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-white/5">
                  <Music2 size={20} className="text-gray-600" />
                  <p className="text-xs text-gray-500">Select an artist to see their analytics</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
