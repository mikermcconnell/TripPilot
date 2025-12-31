interface DayProgressProps {
  completed: number;
  total: number;
  percentage: number;
}

export function DayProgress({ completed, total, percentage }: DayProgressProps) {
  return (
    <div className="flex flex-col items-end">
      <div className="text-right mb-2">
        <span className="text-2xl font-black text-slate-800">{percentage}%</span>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          Complete
        </p>
      </div>
      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {completed} of {total}
      </p>
    </div>
  );
}
