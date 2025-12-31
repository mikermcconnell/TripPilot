import { useEffect, useRef } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipe?: (direction: SwipeDirection) => void;
}

export interface SwipeOptions {
  threshold?: number; // Minimum distance in pixels to trigger swipe
  velocityThreshold?: number; // Minimum velocity to trigger swipe
  preventDefaultTouchmoveEvent?: boolean;
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

/**
 * Hook to detect swipe gestures on touch devices
 */
export function useSwipeGesture(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventDefaultTouchmoveEvent = false,
  } = options;

  const touchStart = useRef<TouchPosition | null>(null);
  const touchEnd = useRef<TouchPosition | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchEnd.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (preventDefaultTouchmoveEvent) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;

    // Calculate velocity (pixels per millisecond)
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;

    // Determine primary direction
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

    if (isHorizontal) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold && velocityX > velocityThreshold) {
        const direction: SwipeDirection = deltaX > 0 ? 'right' : 'left';

        if (direction === 'left' && handlers.onSwipeLeft) {
          handlers.onSwipeLeft();
        } else if (direction === 'right' && handlers.onSwipeRight) {
          handlers.onSwipeRight();
        }

        if (handlers.onSwipe) {
          handlers.onSwipe(direction);
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold && velocityY > velocityThreshold) {
        const direction: SwipeDirection = deltaY > 0 ? 'down' : 'up';

        if (direction === 'up' && handlers.onSwipeUp) {
          handlers.onSwipeUp();
        } else if (direction === 'down' && handlers.onSwipeDown) {
          handlers.onSwipeDown();
        }

        if (handlers.onSwipe) {
          handlers.onSwipe(direction);
        }
      }
    }

    // Reset
    touchStart.current = null;
    touchEnd.current = null;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Hook variant that returns a ref to attach to an element
 */
export function useSwipeGestureRef(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) {
  const ref = useRef<HTMLElement>(null);
  const { threshold, velocityThreshold, preventDefaultTouchmoveEvent } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const touchStart = { current: null as TouchPosition | null };
    const touchEnd = { current: null as TouchPosition | null };

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      touchEnd.current = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (preventDefaultTouchmoveEvent) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      touchEnd.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      if (!touchEnd.current) return;

      const deltaX = touchEnd.current.x - touchStart.current.x;
      const deltaY = touchEnd.current.y - touchStart.current.y;
      const deltaTime = touchEnd.current.time - touchStart.current.time;

      const velocityX = Math.abs(deltaX) / deltaTime;
      const velocityY = Math.abs(deltaY) / deltaTime;

      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      const thresh = threshold || 50;
      const velThresh = velocityThreshold || 0.3;

      if (isHorizontal) {
        if (Math.abs(deltaX) > thresh && velocityX > velThresh) {
          const direction: SwipeDirection = deltaX > 0 ? 'right' : 'left';

          if (direction === 'left' && handlers.onSwipeLeft) {
            handlers.onSwipeLeft();
          } else if (direction === 'right' && handlers.onSwipeRight) {
            handlers.onSwipeRight();
          }

          if (handlers.onSwipe) {
            handlers.onSwipe(direction);
          }
        }
      } else {
        if (Math.abs(deltaY) > thresh && velocityY > velThresh) {
          const direction: SwipeDirection = deltaY > 0 ? 'down' : 'up';

          if (direction === 'up' && handlers.onSwipeUp) {
            handlers.onSwipeUp();
          } else if (direction === 'down' && handlers.onSwipeDown) {
            handlers.onSwipeDown();
          }

          if (handlers.onSwipe) {
            handlers.onSwipe(direction);
          }
        }
      }

      touchStart.current = null;
      touchEnd.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handlers, threshold, velocityThreshold, preventDefaultTouchmoveEvent]);

  return ref;
}
