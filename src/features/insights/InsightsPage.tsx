import { RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useInsights } from '@/hooks/useInsights';
import type { InsightCategory, InsightSeverity } from '@/types';
import { format } from 'date-fns';

const severityStyles: Record<InsightSeverity, string> = {
  positive: 'border-green-500/30 bg-green-500/5',
  info: 'border-indigo-500/30 bg-indigo-500/5',
  neutral: 'border-white/10 bg-white/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
};

const severityDot: Record<InsightSeverity, string> = {
  positive: 'bg-green-400',
  info: 'bg-indigo-400',
  neutral: 'bg-gray-400',
  warning: 'bg-amber-400',
};

const categoryLabels: Record<InsightCategory, string> = {
  behaviour: 'Behaviour',
  mood: 'Mood',
  genre: 'Genre',
  artist: 'Artist',
  time: 'Time',
  trend: 'Trend',
};

export function InsightsPage() {
  const { insights, isGenerating, lastGeneratedAt, generate } = useInsights();

  return (
    <div className="flex flex-col">
      <Header
        title="Insights Feed"
        subtitle="Auto-generated behavioural analytics from your listening data"
      />
      <div className="p-6 space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {lastGeneratedAt
              ? `Last updated ${format(new Date(lastGeneratedAt), 'MMM d, HH:mm')}`
              : 'Not yet generated'}
          </p>
          <button
            onClick={generate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {isGenerating ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingSpinner size={32} />
          </div>
        ) : insights.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-sm text-gray-400">
              No insights yet. Make sure your data is loaded — try refreshing.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`rounded-xl border p-5 transition-colors ${severityStyles[insight.severity]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${severityDot[insight.severity]}`}
                      />
                      <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
                        {categoryLabels[insight.category]}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">
                      {insight.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                      {insight.description}
                    </p>
                  </div>
                  {insight.metric && (
                    <span className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-bold text-white whitespace-nowrap">
                      {insight.metric}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
