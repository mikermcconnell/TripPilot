import { TripId, ActivityId } from './trip';

export type NotificationType =
  | 'departure_reminder'      // X hours before activity
  | 'checkin_reminder'        // Hotel/flight check-in
  | 'activity_start'          // Activity is starting
  | 'time_to_leave'           // Based on travel time
  | 'weather_alert'           // Weather warning
  | 'timezone_change';        // Timezone shift

export interface ScheduledNotification {
  id: string;
  tripId: TripId;
  activityId?: ActivityId;

  type: NotificationType;
  title: string;
  body: string;

  scheduledFor: string;       // ISO datetime
  timezone: string;

  // Delivery
  delivered: boolean;
  deliveredAt?: string;
  dismissed: boolean;

  // Action
  actionUrl?: string;         // Deep link into app
}

export interface NotificationPreferences {
  enabled: boolean;
  departureReminders: {
    enabled: boolean;
    hoursBeforeDefault: number;   // Default: 2
  };
  checkinReminders: {
    enabled: boolean;
    hoursBeforeDefault: number;   // Default: 24
  };
  timeToLeaveAlerts: {
    enabled: boolean;
    minutesBuffer: number;        // Default: 15
  };
  weatherAlerts: boolean;
  quietHours?: {
    enabled: boolean;
    start: string;                // 'HH:MM'
    end: string;
  };
}
