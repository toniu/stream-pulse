import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; positive: boolean };
}

export function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor = 'text-indigo-400',
  trend,
}: MetricCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          {subValue && (
            <p className="mt-0.5 text-xs text-gray-400">{subValue}</p>
          )}
          {trend && (
            <p
              className={`mt-1 text-xs font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}
            >
              {trend.positive ? '▲' : '▼'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <span
          className={`rounded-lg bg-white/5 p-2 ${iconColor}`}
        >
          <Icon size={20} />
        </span>
      </div>
    </Card>
  );
}
