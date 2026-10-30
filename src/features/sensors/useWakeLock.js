import { useEffect, useRef, useCallback } from 'react';

/**
 * Screen Wake Lock hook tailored for mobile devices (e.g. Samsung Galaxy).
 * Prevents screen timeout / sleep during workouts and active tracking sessions.
 */
export function useWakeLock(enabled = false) {
  const wakeLockRef = useRef(null);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch (err) {
        console.debug('Wake Lock request:', err?.message || err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.debug('Wake Lock release:', err?.message || err);
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      requestWakeLock();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && enabled) {
          requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        releaseWakeLock();
      };
    } else {
      releaseWakeLock();
    }
  }, [enabled, requestWakeLock, releaseWakeLock]);

  return { requestWakeLock, releaseWakeLock };
}

export default useWakeLock;
