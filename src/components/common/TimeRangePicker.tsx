import type { TimeRange } from '@/types';

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const ranges: { value: TimeRange; label: string }[] = [
  { value: 'short_term', label: '4 Weeks' },
  { value: 'medium_term', label: '6 Months' },
  { value: 'long_term', label: 'All Time' },
];

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-white/5 p-1">
      {ranges.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === r.value
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
