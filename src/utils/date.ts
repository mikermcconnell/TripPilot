// Format date for display
export function formatDisplayDate(
  isoDate: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(isoDate);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return date.toLocaleDateString(undefined, defaultOptions);
}

// Generate date string for day offset from today
export function getDateOffset(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().split('T')[0];
}
