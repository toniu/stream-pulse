import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface BarChartProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
  color?: string;
  activeColor?: string;
  height?: number;
  tooltipFormatter?: (value: number) => string;
}

export function BarChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color = '#00ffba',
  activeColor = '#4fffcc',
  height = 200,
  tooltipFormatter,
}: BarChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
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
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
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
        <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={i === data.length - 1 ? activeColor : color}
            />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
