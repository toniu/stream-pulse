import { useEffect } from 'react';
import { Clock, Headphones, Music, Users } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/common/MetricCard';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AreaChart } from '@/components/charts/AreaChart';
import { TimeRangePicker } from '@/components/common/TimeRangePicker';
import { useListeningData } from '@/hooks/useListeningData';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTimeRange } from '@/store/slices/listeningSlice';
import { formatMinutes, truncate } from '@/utils/formatters';
import type { TimeRange } from '@/types';

export function OverviewPage() {
  const dispatch = useAppDispatch();
  const timeRange = useAppSelector((s) => s.listening.timeRange);
  const { listeningStats, topTracks, moodSnapshot, dailyDistribution, isLoading, error, loadAll } =
    useListeningData();

  useEffect(() => {
    if (!listeningStats) void loadAll();
  }, []);

  const handleRangeChange = (r: TimeRange) => {
    dispatch(setTimeRange(r));
    void loadAll(r);
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Overview"
        subtitle="Your Spotify listening intelligence dashboard"
      />
      <div className="p-6 space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-400">Key Metrics</h2>
          <TimeRangePicker value={timeRange} onChange={handleRangeChange} />
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingSpinner size={32} />
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                label="Minutes Listened"
                value={listeningStats ? formatMinutes(listeningStats.totalMinutesListened) : '—'}
                icon={Clock}
                iconColor="text-indigo-400"
              />
              <MetricCard
                label="Unique Tracks"
                value={listeningStats?.uniqueTracks ?? '—'}
                icon={Music}
                iconColor="text-pink-400"
              />
              <MetricCard
                label="Unique Artists"
                value={listeningStats?.uniqueArtists ?? '—'}
                icon={Users}
                iconColor="text-emerald-400"
              />
              <MetricCard
                label="Genres Explored"
                value={listeningStats?.uniqueGenres ?? '—'}
                icon={Headphones}
                iconColor="text-amber-400"
              />
            </div>

            {/* Listening activity chart */}
            <Card>
              <h3 className="mb-4 text-sm font-medium text-gray-300">Daily Activity</h3>
              <AreaChart
                data={dailyDistribution.map((d) => ({
                  ...d,
                  date: d.date.slice(5), // MM-DD
                }))}
                xKey="date"
                yKey="minutes"
                height={200}
                tooltipFormatter={(v) => `${v}m`}
              />
            </Card>

            {/* Mood + Top Tracks row */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Current Mood */}
              <Card className="flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                  Current Mood
                </p>
                {moodSnapshot ? (
                  <>
                    <p
                      className="text-3xl font-bold"
                      style={{ color: moodSnapshot.moodColor }}
                    >
                      {moodSnapshot.moodLabel}
                    </p>
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>Valence {(moodSnapshot.averageValence * 100).toFixed(0)}%</span>
                      <span>Energy {(moodSnapshot.averageEnergy * 100).toFixed(0)}%</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">No data</p>
                )}
              </Card>

              {/* Top 5 Tracks */}
              <Card className="lg:col-span-2">
                <h3 className="mb-3 text-sm font-medium text-gray-300">Top Tracks</h3>
                <ol className="space-y-2">
                  {topTracks.slice(0, 5).map((track, i) => (
                    <li key={track.id} className="flex items-center gap-3">
                      <span className="w-4 shrink-0 text-right text-xs text-gray-500">
                        {i + 1}
                      </span>
                      <img
                        src={track.album.images[2]?.url}
                        alt={track.album.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">
                          {truncate(track.name, 40)}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {track.artists.map((a) => a.name).join(', ')}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">
                        {track.popularity}
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
