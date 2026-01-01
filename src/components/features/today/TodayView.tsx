import { Sun, Check, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTripStore } from '@/stores';
import { useTodayView } from '@/hooks/useTodayView';
import { NextActivityCard } from './NextActivityCard';
import { DayProgress } from './DayProgress';
import { getActivityIcon } from '@/utils/activityHelpers';
import type { Activity } from '@/types';

function ActivityCard({ activity, variant = 'compact' }: { activity: Activity; variant?: 'compact' | 'completed' }) {
  return (
    <div className={`
      bg-white border-2 rounded-xl p-3 transition-all
      ${variant === 'completed' ? 'border-slate-100 opacity-60' : 'border-slate-200 hover:border-blue-200'}
    `}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getActivityIcon(activity.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-bold text-sm leading-tight ${variant === 'completed' ? 'line-through text-slate-500' : 'text-slate-700'}`}>
              {activity.description}
            </h4>
            {activity.time && (
              <span className="text-xs font-bold text-slate-400 flex-shrink-0">
                {activity.time}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">{activity.location.name}</p>
        </div>
        {variant === 'completed' && (
          <div className="flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TodayView() {
  const activeTrip = useTripStore(state => state.activeTrip);
  const todayData = useTodayView(activeTrip);

  if (!activeTrip) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sun className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
            No Active Trip
          </h2>
          <p className="text-slate-500">
            Create a trip to see today's activities
          </p>
        </div>
      </div>
    );
  }

  if (!todayData.currentDay) {
    const tripStart = format(parseISO(activeTrip.startDate), 'MMMM d, yyyy');
    const tripEnd = format(parseISO(activeTrip.endDate), 'MMMM d, yyyy');

    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Sun className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-extrabold text-slate-700 uppercase tracking-wider text-sm">
            Today
          </h2>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            No Activities Today
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Your trip <span className="font-bold">{activeTrip.title}</span> runs from:
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
            <span className="text-sm font-bold text-slate-700">
              {tripStart} → {tripEnd}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (todayData.isRestDay) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Sun className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-extrabold text-slate-700 uppercase tracking-wider text-sm">
            Today
          </h2>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
          <span className="text-6xl mb-4 block">🌴</span>
          <h3 className="text-2xl font-extrabold text-emerald-800 mb-2">
            Rest Day
          </h3>
          <p className="text-emerald-700 font-medium">
            Day {todayData.currentDay.dayNumber} • {format(parseISO(todayData.currentDay.date), 'EEEE, MMMM d')}
          </p>
          <p className="text-sm text-emerald-600 mt-4">
            No activities planned. Enjoy your free time!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 pb-24">
      {/* Day Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Sun className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-extrabold text-slate-700 uppercase tracking-wider text-sm">
              Today
            </h2>
          </div>
          <p className="text-sm font-bold text-slate-400 ml-9">
            Day {todayData.currentDay.dayNumber} • {format(parseISO(todayData.currentDay.date), 'EEEE, MMMM d')}
          </p>
        </div>
        <DayProgress {...todayData.progress} />
      </div>

      {/* What's Next Card */}
      {todayData.nextActivity && (
        <div className="mb-6">
          <NextActivityCard
            activity={todayData.nextActivity}
            timeUntil={todayData.timeUntilNext}
          />
        </div>
      )}

      {/* Upcoming Activities */}
      {todayData.upcomingActivities.length > 1 && (
        <section className="mb-6">
          <h3 className="section-header mb-3 text-slate-500">
            Coming Up
          </h3>
          <div className="space-y-2">
            {todayData.upcomingActivities.slice(1).map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                variant="compact"
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Activities */}
      {todayData.completedActivities.length > 0 && (
        <section className="mb-6">
          <h3 className="section-header mb-3 text-slate-400">
            <Check className="w-4 h-4" />
            Completed
          </h3>
          <div className="space-y-2">
            {todayData.completedActivities.map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                variant="completed"
              />
            ))}
          </div>
        </section>
      )}

      {/* All Done Message */}
      {todayData.progress.percentage === 100 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center">
          <span className="text-4xl mb-3 block">🎉</span>
          <h3 className="text-xl font-extrabold text-green-800 mb-2">
            All Done for Today!
          </h3>
          <p className="text-green-700 text-sm">
            Great job completing all your activities. Enjoy the rest of your day!
          </p>
        </div>
      )}
    </div>
  );
}
