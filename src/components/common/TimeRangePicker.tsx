import type { TimeRange } from '@/types';

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const RANGES: { value: TimeRange; label: string; sub: string }[] = [
  { value: 'short_term',  label: '4 Weeks',  sub: 'Last 4 wks' },
  { value: 'medium_term', label: '6 Months', sub: 'Last 6 mo'  },
  { value: 'long_term',   label: 'All Time', sub: 'All history' },
];

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg p-0.5"
      style={{ background: 'rgba(255,255,255,0.05)' }}
    >
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          title={r.sub}
          className="rounded-md px-3 py-1 text-[11px] font-semibold tracking-wide transition-all"
          style={
            value === r.value
              ? { background: '#00ffba1a', color: '#00ffba', boxShadow: '0 0 0 1px #00ffba44' }
              : { color: '#6b7280' }
          }
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

