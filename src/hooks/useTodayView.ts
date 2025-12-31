import { useState, useEffect, useMemo } from 'react';
import { isBefore, differenceInMilliseconds, addHours } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import type { Trip, DayItinerary, Activity } from '@/types';

interface TodayViewData {
  currentDay: DayItinerary | null;
  nextActivity: Activity | null;
  upcomingActivities: Activity[];
  completedActivities: Activity[];
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  timeUntilNext: number | null;  // milliseconds
  isRestDay: boolean;
}

/**
 * Parse activity time string to Date object
 * Handles both "HH:MM" (24h) and "HH:MM AM/PM" (12h) formats
 */
function parseTime(timeStr: string | undefined, dateStr: string, timezone: string): Date {
  if (!timeStr) {
    return new Date();
  }

  // Try to parse as 24-hour format first (HH:MM)
  const time24Match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (time24Match) {
    const [, hours, minutes] = time24Match;
    const dateTime = `${dateStr}T${hours.padStart(2, '0')}:${minutes}:00`;
    return toZonedTime(dateTime, timezone);
  }

  // Try to parse as 12-hour format (HH:MM AM/PM)
  const time12Match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (time12Match) {
    const [, hours, minutes, period] = time12Match;
    let hour24 = parseInt(hours, 10);

    if (period.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0;
    }

    const dateTime = `${dateStr}T${hour24.toString().padStart(2, '0')}:${minutes}:00`;
    return toZonedTime(dateTime, timezone);
  }

  // Fallback: return current time
  return new Date();
}

/**
 * Hook to get today's itinerary data with real-time updates
 */
export function useTodayView(trip: Trip | null): TodayViewData {
  const [now, setNow] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!trip) {
      return {
        currentDay: null,
        nextActivity: null,
        upcomingActivities: [],
        completedActivities: [],
        progress: { completed: 0, total: 0, percentage: 0 },
        timeUntilNext: null,
        isRestDay: false,
      };
    }

    // Find today's day in the itinerary
    const todayStr = formatInTimeZone(now, trip.timezone, 'yyyy-MM-dd');
    const currentDay = trip.itinerary.days.find(d => d.date === todayStr) || null;

    if (!currentDay) {
      return {
        currentDay: null,
        nextActivity: null,
        upcomingActivities: [],
        completedActivities: [],
        progress: { completed: 0, total: 0, percentage: 0 },
        timeUntilNext: null,
        isRestDay: false,
      };
    }

    // Parse activity times and categorize
    const nowTime = formatInTimeZone(now, trip.timezone, 'HH:mm');
    const sortedActivities = [...currentDay.activities].sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });

    const completedActivities: Activity[] = [];
    const upcomingActivities: Activity[] = [];

    for (const activity of sortedActivities) {
      if (!activity.time) {
        // Activities without time go to upcoming
        upcomingActivities.push(activity);
        continue;
      }

      const activityTime = parseTime(activity.time, currentDay.date, trip.timezone);
      const endTime = activity.endTime
        ? parseTime(activity.endTime, currentDay.date, trip.timezone)
        : addHours(activityTime, 1); // Default 1 hour duration

      const nowParsed = parseTime(nowTime, currentDay.date, trip.timezone);

      if (isBefore(endTime, nowParsed)) {
        completedActivities.push(activity);
      } else {
        upcomingActivities.push(activity);
      }
    }

    const nextActivity = upcomingActivities[0] || null;

    // Calculate time until next activity
    let timeUntilNext: number | null = null;
    if (nextActivity?.time) {
      const nextTime = parseTime(nextActivity.time, currentDay.date, trip.timezone);
      const nowParsed = parseTime(nowTime, currentDay.date, trip.timezone);
      timeUntilNext = differenceInMilliseconds(nextTime, nowParsed);
      if (timeUntilNext < 0) timeUntilNext = 0;
    }

    const total = sortedActivities.length;
    const completed = completedActivities.length;

    return {
      currentDay,
      nextActivity,
      upcomingActivities,
      completedActivities,
      progress: {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      timeUntilNext,
      isRestDay: total === 0,
    };
  }, [trip, now]);
}
