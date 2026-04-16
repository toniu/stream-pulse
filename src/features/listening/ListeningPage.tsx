import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BarChart } from '@/components/charts/BarChart';
import { AreaChart } from '@/components/charts/AreaChart';
import { TimeRangePicker } from '@/components/common/TimeRangePicker';
import { useListeningData } from '@/hooks/useListeningData';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTimeRange } from '@/store/slices/listeningSlice';
import { formatMinutes } from '@/utils/formatters';
import type { TimeRange } from '@/types';

export function ListeningPage() {
  const dispatch = useAppDispatch();
  const timeRange = useAppSelector((s) => s.listening.timeRange);
  const {
    hourlyDistribution,
    dailyDistribution,
    listeningStats,
    isLoading,
    error,
    loadAll,
  } = useListeningData();

  useEffect(() => {
    if (!listeningStats && !isLoading) void loadAll();
  }, []);

  const handleRangeChange = (r: TimeRange) => {
    dispatch(setTimeRange(r));
    void loadAll(r);
  };

  const peakHour = hourlyDistribution.reduce(
    (max, h) => (h.count > max.count ? h : max),
    hourlyDistribution[0] ?? { count: 0, label: '—', hour: 0 }
  );

  return (
    <div className="flex flex-col">
      <Header
        title="Listening Behaviour"
        subtitle="When and how you listen over time"
      />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-400">Analysis Period</h2>
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
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  Total Listening
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {listeningStats
                    ? formatMinutes(listeningStats.totalMinutesListened)
                    : '—'}
                </p>
              </Card>
              <Card className="text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  Peak Hour
                </p>
                <p className="mt-1 text-2xl font-bold text-indigo-300">
                  {peakHour?.label ?? '—'}
                </p>
              </Card>
              <Card className="text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  Most Active Day
                </p>
                <p className="mt-1 text-2xl font-bold text-pink-300">
                  {listeningStats?.mostActiveDay ?? '—'}
                </p>
              </Card>
            </div>

            {/* Hourly heatmap */}
            <Card>
              <h3 className="mb-4 text-sm font-medium text-gray-300">
                Streams by Hour of Day
              </h3>
              <BarChart
                data={hourlyDistribution.map((h) => ({
                  label: h.label,
                  count: h.count,
                }))}
                xKey="label"
                yKey="count"
                height={220}
                color="#4f46e5"
                activeColor="#818cf8"
                tooltipFormatter={(v) => `${v} streams`}
              />
            </Card>

            {/* Daily trend */}
            <Card>
              <h3 className="mb-4 text-sm font-medium text-gray-300">
                Daily Listening (minutes)
              </h3>
              <AreaChart
                data={dailyDistribution.map((d) => ({
                  date: d.date.slice(5),
                  minutes: d.minutes,
                }))}
                xKey="date"
                yKey="minutes"
                color="#ec4899"
                height={200}
                tooltipFormatter={(v) => `${v}m`}
              />
            </Card>

            {/* Genre breakdown */}
            {listeningStats && listeningStats.topGenres.length > 0 && (
              <Card>
                <h3 className="mb-4 text-sm font-medium text-gray-300">
                  Genre Distribution
                </h3>
                <div className="space-y-2">
                  {listeningStats.topGenres.slice(0, 8).map((g) => (
                    <div key={g.genre} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-xs text-gray-400">
                        {g.genre}
                      </span>
                      <div className="flex-1 rounded-full bg-white/5">
                        <div
                          className="h-1.5 rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${g.percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-gray-500">
                        {g.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
