import { useState, useMemo } from 'react';
import { Itinerary, Activity } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_ITINERARY } from '@/constants/defaults';

interface UseItineraryReturn {
  itinerary: Itinerary;
  activeDayId: string | null;
  setActiveDayId: (id: string | null) => void;
  addActivity: (dayNumber: number, activity: Omit<Activity, 'id'>) => void;
  deleteActivity: (dayId: string, activityId: string) => void;
  replaceItinerary: (newItinerary: Itinerary) => void;
  resetToDefault: () => void;
}

export function useItinerary(storageKey = 'trippilot_itinerary'): UseItineraryReturn {
  const [itinerary, setItinerary] = useLocalStorage<Itinerary>(storageKey, DEFAULT_ITINERARY);
  const [activeDayId, setActiveDayId] = useState<string | null>(itinerary.days[0]?.id || null);

  const addActivity = (dayNumber: number, activity: Omit<Activity, 'id'>) => {
    setItinerary(prev => {
      const targetDay = prev.days.find(d => d.dayNumber === dayNumber);

      if (!targetDay) {
        return prev;
      }

      const newActivity: Activity = {
        ...activity,
        id: Date.now().toString()
      };

      return {
        ...prev,
        days: prev.days.map(d => {
          if (d.dayNumber === dayNumber) {
            return { ...d, activities: [...d.activities, newActivity] };
          }
          return d;
        })
      };
    });
  };

  const deleteActivity = (dayId: string, activityId: string) => {
    setItinerary(prev => ({
      ...prev,
      days: prev.days.map(day => {
        if (day.id !== dayId) return day;
        return {
          ...day,
          activities: day.activities.filter(a => a.id !== activityId)
        };
      })
    }));
  };

  const replaceItinerary = (newItinerary: Itinerary) => {
    setItinerary(newItinerary);
    if (newItinerary.days.length > 0) {
      setActiveDayId(newItinerary.days[0].id);
    }
  };

  const resetToDefault = () => {
    setItinerary(DEFAULT_ITINERARY);
    setActiveDayId(DEFAULT_ITINERARY.days[0]?.id || null);
  };

  return useMemo(() => ({
    itinerary,
    activeDayId,
    setActiveDayId,
    addActivity,
    deleteActivity,
    replaceItinerary,
    resetToDefault,
  }), [itinerary, activeDayId]);
}
