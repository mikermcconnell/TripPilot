/**
 * Utility functions for activity display
 */

/**
 * Returns the emoji icon for a given activity type
 */
export function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    food: '🍽️',
    lodging: '🏨',
    travel: '🚗',
    activity: '🎯',
  };
  return icons[type] || '📍';
}

/**
 * Returns the Tailwind gradient class for a given activity type
 */
export function getActivityColor(type: string): string {
  const colors: Record<string, string> = {
    food: 'from-orange-500 to-orange-600',
    lodging: 'from-purple-500 to-purple-600',
    travel: 'from-blue-500 to-blue-600',
    activity: 'from-green-500 to-green-600',
  };
  return colors[type] || 'from-slate-500 to-slate-600';
}

/**
 * Sanitizes a phone number to only include valid characters
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-\s()]/g, '');
}

/**
 * Validates a URL to ensure it uses http or https protocol
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
  } catch {
    return false;
  }
}
