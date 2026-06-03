import { Zap, Moon, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { RadarChart } from '@/components/charts/RadarChart';
import { useListeningData } from '@/hooks/useListeningData';
import { estimateEnergyFromGenres } from '@/utils/analytics';
import type { RadarDataPoint, TrackWithFeatures } from '@/types';

export function MoodPage() {
  const { moodSnapshot, topTracks, topArtists, listeningStats, isLoading, error } =
    useListeningData();

  // Map artist id → genres so we can estimate energy for each track
  const artistGenreMap = new Map(topArtists.map((a) => [a.id, a.genres ?? []]));

  const trackEnergyScore = (t: TrackWithFeatures): number => {
    if (t.audioFeatures) return t.audioFeatures.energy;
    const genres = t.artists.flatMap((a) => artistGenreMap.get(a.id) ?? []).filter((g): g is string => Boolean(g));
    const est = genres.length > 0 ? estimateEnergyFromGenres(genres) : (t.popularity ?? 50) / 100;
    return Number.isFinite(est) ? est : 0.5;
  };

  // Only render radar when all key values are finite — NaN from the popularity
  // fallback would produce a broken chart.
  const radarData: RadarDataPoint[] = moodSnapshot &&
    Number.isFinite(moodSnapshot.averageValence) &&
    Number.isFinite(moodSnapshot.averageEnergy)
    ? [
        { subject: 'Valence', value: Math.round(moodSnapshot.averageValence * 100), fullMark: 100 },
        { subject: 'Energy', value: Math.round(moodSnapshot.averageEnergy * 100), fullMark: 100 },
        { subject: 'Dance', value: Math.round(moodSnapshot.averageDanceability * 100), fullMark: 100 },
        { subject: 'Acoustic', value: Math.round(moodSnapshot.averageAcousticness * 100), fullMark: 100 },
        { subject: 'Tempo', value: Math.round((moodSnapshot.averageTempo / 200) * 100), fullMark: 100 },
      ]
    : [];

  // A track's energy score is only considered reliable when it comes from real
  // audio features or genre data — not just the popularity fallback.
  const hasReliableScore = (t: TrackWithFeatures): boolean => {
    if (t.audioFeatures) return true;
    const genres = t.artists.flatMap((a) => artistGenreMap.get(a.id) ?? []).filter(Boolean);
    return genres.length > 0;
  };

  const sorted = [...topTracks].sort((a, b) => trackEnergyScore(b) - trackEnergyScore(a));
  const highEnergy = sorted.slice(0, 5);
  const highEnergyIds = new Set(highEnergy.map((t) => t.id));

  // True only when at least one top track has real Spotify audio features
  const hasRealAudioFeatures = topTracks.some((t) => t.audioFeatures !== null);

  const mellow = [...topTracks]
    .sort((a, b) => trackEnergyScore(a) - trackEnergyScore(b))
    .filter((t) => !highEnergyIds.has(t.id))
    .slice(0, 5);

  return (
    <div className="flex flex-col">
      <Header title="Mood & Energy" subtitle="Audio fingerprint of your listening" />
      <div className="p-4 space-y-4 md:p-6 md:space-y-6">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingSpinner size={32} />
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <>
            {/* Mood label banner */}
            {moodSnapshot && (
              <Card className="flex items-center gap-6">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold"
                  style={{ background: `${moodSnapshot.moodColor}22`, color: moodSnapshot.moodColor }}
                >
                  {moodSnapshot.moodLabel[0]}
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest">Current Vibe</p>
                  <p className="text-2xl font-bold" style={{ color: moodSnapshot.moodColor }}>
                    {moodSnapshot.moodLabel}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Avg tempo {Number.isFinite(moodSnapshot.averageTempo) ? Math.round(moodSnapshot.averageTempo) : '—'} BPM · Valence{' '}
                    {Number.isFinite(moodSnapshot.averageValence) ? `${(moodSnapshot.averageValence * 100).toFixed(0)}%` : '—'}
                  </p>
                </div>
              </Card>
            )}

            {/* Estimated data notice */}
            {!hasRealAudioFeatures && moodSnapshot && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  <span className="font-semibold text-amber-300">Estimated data</span> — Spotify's audio features API isn't available for this app yet.
                  Mood scores and energy rankings are inferred from genre tags and track popularity, not real audio analysis.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Radar */}
              <Card>
                <h3 className="mb-2 text-sm font-medium text-gray-300">Audio Profile</h3>
                {radarData.length > 0 ? (
                  <RadarChart data={radarData} color={moodSnapshot?.moodColor} />
                ) : (
                  <p className="py-12 text-center text-xs text-gray-500">
                    No audio feature data available
                  </p>
                )}
              </Card>

              {/* Breakdown metrics */}
              <div className="flex flex-col gap-4">
                {moodSnapshot && (
                  <>
                    {[
                      { label: 'Valence (Happiness)', value: moodSnapshot.averageValence, color: '#22c55e' },
                      { label: 'Energy', value: moodSnapshot.averageEnergy, color: '#ef4444' },
                      { label: 'Danceability', value: moodSnapshot.averageDanceability, color: '#f59e0b' },
                      { label: 'Acousticness', value: moodSnapshot.averageAcousticness, color: '#0ea5e9' },
                    ].map(({ label, value, color }) => (
                      <Card key={label} padding="sm">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-gray-300">{label}</span>
                          <span className="font-bold text-white">
                            {Number.isFinite(value) ? `${(value * 100).toFixed(0)}%` : '—'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: Number.isFinite(value) ? `${value * 100}%` : '0%', background: color }}
                          />
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* High energy vs mellow */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-300"><Zap size={14} className="text-yellow-400 shrink-0" /> High Energy Tracks</h3>
                <ol className="space-y-2">
                  {highEnergy.map((t, i) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <span className="w-4 text-xs text-gray-500">{i + 1}</span>
                      <img src={(t.album.images ?? [])[2]?.url} alt="" className="h-7 w-7 rounded" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">{t.name}</p>
                        <p className="truncate text-xs text-gray-400">
                          {t.artists[0]?.name}
                        </p>
                      </div>
                      <span className="text-xs text-red-400">
                        {hasReliableScore(t) ? `${(trackEnergyScore(t) * 100).toFixed(0)}%` : '—'}
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
              <Card>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-300"><Moon size={14} className="text-blue-400 shrink-0" /> Mellow Tracks</h3>
                <ol className="space-y-2">
                  {mellow.map((t, i) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <span className="w-4 text-xs text-gray-500">{i + 1}</span>
                      <img src={(t.album.images ?? [])[2]?.url} alt="" className="h-7 w-7 rounded" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">{t.name}</p>
                        <p className="truncate text-xs text-gray-400">
                          {t.artists[0]?.name}
                        </p>
                      </div>
                      <span className="text-xs text-blue-400">
                        {hasReliableScore(t) ? `${(trackEnergyScore(t) * 100).toFixed(0)}%` : '—'}
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
