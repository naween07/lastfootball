import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 60): SwipeHandlers {
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);
  const leftRef = useRef(onSwipeLeft);
  const rightRef = useRef(onSwipeRight);
  leftRef.current = onSwipeLeft;
  rightRef.current = onSwipeRight;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = e.touches[0].clientX;
    swiping.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    currentX.current = e.touches[0].clientX;
    const deltaX = Math.abs(currentX.current - startX.current);
    const deltaY = Math.abs(e.touches[0].clientY - startY.current);
    if (deltaX > 20 && deltaX > deltaY) {
      swiping.current = true;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!swiping.current) return;
    const deltaX = currentX.current - startX.current;
    if (Math.abs(deltaX) > threshold) {
      if (deltaX < 0) {
        leftRef.current();
      } else {
        rightRef.current();
      }
    }
    swiping.current = false;
  }, [threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
