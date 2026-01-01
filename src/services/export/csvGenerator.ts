import { format, parseISO } from 'date-fns';
import type { Trip, DayItinerary, Activity } from '@/types';

const CSV_HEADERS = [
  'Day',
  'Date',
  'Day_Of_Week',
  'Time',
  'End_Time',
  'Activity',
  'Type',
  'Location_Name',
  'Location_Address',
  'Latitude',
  'Longitude',
  'Booking_Confirmation',
  'Booking_Provider',
  'Phone',
  'Website',
  'Notes',
  'Estimated_Cost',
  'Actual_Cost',
  'Currency',
  'Is_Paid',
];

/**
 * Escape a value for CSV format
 * Handles quotes, commas, and newlines
 */
function escapeCSV(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains special chars
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format a single activity row for CSV
 */
function formatActivityRow(day: DayItinerary, activity: Activity): string {
  const details = activity.details;
  const booking = details?.booking;
  const estimatedCost = details?.estimatedCost;
  const actualCost = details?.actualCost;

  const values = [
    day.dayNumber,
    day.date,
    format(parseISO(day.date), 'EEEE'),
    activity.time || '',
    activity.endTime || '',
    activity.description,
    activity.type,
    activity.location.name,
    activity.location.address || '',
    activity.location.coordinates?.lat || '',
    activity.location.coordinates?.lng || '',
    booking?.confirmationNumber || '',
    booking?.provider || '',
    details?.phone || '',
    details?.website || '',
    details?.notes || '',
    estimatedCost?.amount || '',
    actualCost?.amount || '',
    estimatedCost?.currency || actualCost?.currency || '',
    details?.isPaid !== undefined ? details.isPaid : '',
  ];

  return values.map(escapeCSV).join(',');
}

/**
 * Generate CSV content from a Trip
 */
export function generateCSV(trip: Trip): string {
  const rows: string[] = [CSV_HEADERS.join(',')];

  // Handle empty trips
  if (!trip.itinerary.days.length) {
    return rows.join('\n');
  }

  trip.itinerary.days.forEach((day) => {
    if (day.activities.length === 0) {
      // Add a row for days with no activities
      const emptyRow = [
        day.dayNumber,
        day.date,
        format(parseISO(day.date), 'EEEE'),
        '',
        '',
        '(No activities planned)',
        '',
        day.primaryLocation?.name || '',
        day.primaryLocation?.address || '',
        day.primaryLocation?.coordinates?.lat || '',
        day.primaryLocation?.coordinates?.lng || '',
        '', '', '', '', '', '', '', '', '',
      ];
      rows.push(emptyRow.map(escapeCSV).join(','));
    } else {
      day.activities.forEach((activity) => {
        rows.push(formatActivityRow(day, activity));
      });
    }
  });

  return rows.join('\n');
}

/**
 * Generate filename for CSV export
 */
export function getCSVFilename(trip: Trip): string {
  const sanitizedTitle = trip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${sanitizedTitle}_itinerary.csv`;
}
