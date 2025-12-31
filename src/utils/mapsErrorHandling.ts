/**
 * Maps API Error Handling Utilities
 * Implements retry logic and error boundaries per TDD Section 7.2
 */

/**
 * Standard error handler for all maps services
 * Implements exponential backoff retry for transient failures
 */
export async function withMapsErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Log for debugging
    console.error(`[Maps ${operation}] Error:`, message);

    // Handle specific API errors
    if (message.includes('OVER_QUERY_LIMIT')) {
      // Wait and retry once
      await new Promise((r) => setTimeout(r, 2000));
      try {
        return await fn();
      } catch (retryError) {
        console.error(`[Maps ${operation}] Retry failed:`, retryError);
        // Give up after retry
      }
    }

    // Return fallback if provided
    if (fallback !== undefined) {
      return fallback;
    }

    return null;
  }
}

/**
 * Retry with exponential backoff
 * For critical operations that need multiple retry attempts
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    operation?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    operation = 'operation',
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on final attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Check if error is retryable
      const errorMessage = lastError.message;
      const isRetryable =
        errorMessage.includes('OVER_QUERY_LIMIT') ||
        errorMessage.includes('UNKNOWN_ERROR') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network');

      if (!isRetryable) {
        // Don't retry non-transient errors
        break;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);

      console.warn(
        `[Maps ${operation}] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${delay}ms...`,
        errorMessage
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`${operation} failed after ${maxRetries} attempts`);
}

/**
 * Validate coordinates before API calls
 */
export function validateCoordinates(
  coords: { lat: number; lng: number } | undefined | null
): coords is { lat: number; lng: number } {
  if (!coords) return false;

  return (
    !isNaN(coords.lat) &&
    !isNaN(coords.lng) &&
    Math.abs(coords.lat) <= 90 &&
    Math.abs(coords.lng) <= 180
  );
}

/**
 * Check if error indicates API quota issues
 */
export function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('OVER_QUERY_LIMIT') ||
    message.includes('OVER_DAILY_LIMIT') ||
    message.includes('REQUEST_DENIED')
  );
}

/**
 * Check if error is transient and retryable
 */
export function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('UNKNOWN_ERROR') ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('OVER_QUERY_LIMIT')
  );
}
