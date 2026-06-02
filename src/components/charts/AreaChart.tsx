import {
  Area,
  AreaChart as ReAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AreaChartProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
  color?: string;
  height?: number;
  tooltipFormatter?: (value: number) => string;
}

export function AreaChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color = '#00ffba',
  height = 200,
  tooltipFormatter,
}: AreaChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReAreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#0c1a12',
            border: '1px solid rgba(0,255,186,0.15)',
            borderRadius: 8,
            fontSize: 12,
            color: '#e5e7eb',
          }}
          formatter={
            tooltipFormatter
              ? (v: unknown) => [tooltipFormatter(v as number), '']
              : undefined
          }
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${yKey})`}
        />
      </ReAreaChart>
    </ResponsiveContainer>
  );
}
