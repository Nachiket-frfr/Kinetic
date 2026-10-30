import { useState, useEffect, useCallback } from 'react';
import { healthRepository } from '../repository/HealthDataRepository';
import { HealthDataSource, HealthConnectionState } from '../types/healthTypes';
import useAppStore from '../../../store/useAppStore';

/**
 * useHealthSync Hook
 * 
 * Manages foreground synchronization, battery-efficient refresh,
 * and state binding between the health repository and the global store.
 */
export function useHealthSync() {
  const { dailyHealth, updateDailyHealth } = useAppStore();

  const [status, setStatus] = useState(() => healthRepository.getProvidersStatus());
  const [todayActivity, setTodayActivity] = useState(null);
  const [historyRange, setHistoryRange] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(null);

  const refreshActivity = useCallback(async ({ days = 7 } = {}) => {
    setIsSyncing(true);
    try {
      const activity = await healthRepository.getTodayActivity();
      setTodayActivity(activity);

      // If active provider returned valid steps, synchronize into dailyHealth
      if (activity.source !== HealthDataSource.NONE && activity.primary?.steps > 0) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        updateDailyHealth({
          steps: activity.primary.steps,
          caloriesBurned: Math.max(dailyHealth?.caloriesBurned || 0, activity.primary.caloriesBurned),
          lastSyncTime: `Synced ${timeStr} (${activity.source === HealthDataSource.GOOGLE_FIT ? 'Fit' : 'Health Connect'})`,
        });
      }

      const history = await healthRepository.getActivityRange(days);
      setHistoryRange(history);
      setLastSyncTimestamp(new Date());
    } catch (err) {
      console.warn('Health sync refresh error:', err);
    } finally {
      setIsSyncing(false);
      setStatus(healthRepository.getProvidersStatus());
    }
  }, [dailyHealth?.caloriesBurned, updateDailyHealth]);

  // Initial load and window focus/visibility return (foreground refresh)
  useEffect(() => {
    refreshActivity();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshActivity();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [refreshActivity]);

  // Connect Google Fit
  const connectGoogleFit = async (opts) => {
    setIsSyncing(true);
    try {
      const result = await healthRepository.googleFit.connect(opts);
      if (healthRepository.activeSource === HealthDataSource.NONE) {
        healthRepository.setActiveSource(HealthDataSource.GOOGLE_FIT);
      }
      await refreshActivity();
      return result;
    } finally {
      setIsSyncing(false);
      setStatus(healthRepository.getProvidersStatus());
    }
  };

  // Disconnect Google Fit
  const disconnectGoogleFit = async () => {
    await healthRepository.googleFit.disconnect();
    if (healthRepository.activeSource === HealthDataSource.GOOGLE_FIT) {
      healthRepository.setActiveSource(
        healthRepository.healthConnect.isConnected()
          ? HealthDataSource.HEALTH_CONNECT
          : HealthDataSource.NONE
      );
    }
    await refreshActivity();
    setStatus(healthRepository.getProvidersStatus());
  };

  // Connect Health Connect
  const connectHealthConnect = async (opts) => {
    setIsSyncing(true);
    try {
      const result = await healthRepository.healthConnect.requestPermissions(opts);
      if (result) {
        healthRepository.setActiveSource(HealthDataSource.HEALTH_CONNECT);
      }
      await refreshActivity();
      return result;
    } finally {
      setIsSyncing(false);
      setStatus(healthRepository.getProvidersStatus());
    }
  };

  // Disconnect Health Connect
  const disconnectHealthConnect = async () => {
    await healthRepository.healthConnect.disconnect();
    if (healthRepository.activeSource === HealthDataSource.HEALTH_CONNECT) {
      healthRepository.setActiveSource(
        healthRepository.googleFit.isConnected()
          ? HealthDataSource.GOOGLE_FIT
          : HealthDataSource.NONE
      );
    }
    await refreshActivity();
    setStatus(healthRepository.getProvidersStatus());
  };

  // Switch Active Source
  const selectActiveSource = (source) => {
    healthRepository.setActiveSource(source);
    refreshActivity();
    setStatus(healthRepository.getProvidersStatus());
  };

  return {
    status,
    activeSource: status.activeSource,
    todayActivity,
    historyRange,
    isSyncing,
    lastSyncTimestamp,
    refreshActivity,
    connectGoogleFit,
    disconnectGoogleFit,
    connectHealthConnect,
    disconnectHealthConnect,
    selectActiveSource,
  };
}

export default useHealthSync;
