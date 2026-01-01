import { Plus } from 'lucide-react';

interface EmptyDayPlaceholderProps {
  dayId: string;
  onAddActivity: () => void;
}

export function EmptyDayPlaceholder({ dayId: _dayId, onAddActivity }: EmptyDayPlaceholderProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
      <button
        onClick={onAddActivity}
        className="flex flex-col items-center gap-2 px-6 py-4 text-gray-500 hover:text-blue-600 transition-colors"
        style={{ minHeight: '44px', minWidth: '44px' }}
      >
        <Plus size={24} />
        <span className="text-sm font-medium">Add Activity</span>
      </button>
    </div>
  );
}
