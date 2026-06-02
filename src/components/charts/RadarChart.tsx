import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as ReRadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { RadarDataPoint } from '@/types';

interface RadarChartProps {
  data: RadarDataPoint[];
  color?: string;
  height?: number;
}

export function RadarChart({ data, color = '#00ffba', height = 280 }: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReRadarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <PolarGrid stroke="#ffffff15" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
        />
        <Radar
          name="Score"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: '#0c1a12',
            border: '1px solid rgba(0,255,186,0.15)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </ReRadarChart>
    </ResponsiveContainer>
  );
}
