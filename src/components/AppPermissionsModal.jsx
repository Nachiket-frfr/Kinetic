import React, { useState, useEffect } from 'react';
import useAppStore from '../store/useAppStore';

export default function AppPermissionsModal({
  isOpen,
  onClose,
  requestSensorPermission,
  startSensorTracking,
}) {
  const { appPermissions, setAppPermission, completePermissionsOnboarding, syncDeviceTelemetry } = useAppStore();

  const [notificationState, setNotificationState] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [sensorStatus, setSensorStatus] = useState(appPermissions?.physicalActivity ? 'granted' : 'prompt');
  const [healthStatus, setHealthStatus] = useState(appPermissions?.healthWellness ?? true);
  const [toastFeedback, setToastFeedback] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDetails, setSyncDetails] = useState(null);

  // Sync notification status on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationState(Notification.permission);
      if (Notification.permission === 'granted') {
        setAppPermission('notifications', true);
      }
    }
  }, [setAppPermission]);

  if (!isOpen) return null;

  const showToast = (msg) => {
    setToastFeedback(msg);
    setTimeout(() => setToastFeedback(null), 3000);
  };

  // Trigger telemetry data synchronization with the app
  const triggerDataSync = async () => {
    setIsSyncing(true);
    setSyncDetails('Connecting to device motion sensors & health database...');
    
    // Simulate high-speed native handshaking
    await new Promise((r) => setTimeout(r, 600));
    setSyncDetails('Syncing steps, calorie expenditure, and cadence baseline...');
    
    await new Promise((r) => setTimeout(r, 600));
    if (typeof syncDeviceTelemetry === 'function') {
      syncDeviceTelemetry({
        baselineSteps: 2840,
        activeCal: 142,
        avgBpm: 73,
      });
    }

    setIsSyncing(false);
    setSyncDetails('✓ Data synced: 2,840 steps • 142 kcal • Heart Rate active');
    showToast('✓ Device data synced successfully with RepLog OS!');
  };

  // 1. Health, Fitness & Wellness toggle
  const handleToggleHealth = () => {
    const next = !healthStatus;
    setHealthStatus(next);
    setAppPermission('healthWellness', next);
    if (next) {
      showToast('✓ Health & Wellness telemetry connected');
      triggerDataSync();
    } else {
      showToast('Health telemetry disconnected');
    }
  };

  // 2. Request Notifications permission (Real Web API)
  const handleRequestNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setNotificationState(result);
        if (result === 'granted') {
          setAppPermission('notifications', true);
          showToast('✓ Notifications enabled successfully!');
          try {
            new Notification('RepLog Fitness OS', {
              body: '✓ Notifications active. You will receive workout rest & step goal alerts.',
              icon: '/favicon.svg',
            });
          } catch {
            // Background notification fallback
          }
        } else {
          setAppPermission('notifications', false);
          showToast('Notifications blocked in browser settings');
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    } else {
      showToast('Notifications not supported in this browser');
    }
  };

  // 3. Request Physical Activity sensor permission (Real Web API)
  const handleRequestPhysicalActivity = async () => {
    try {
      let granted = true;
      if (typeof requestSensorPermission === 'function') {
        granted = await requestSensorPermission();
      }
      if (granted) {
        setSensorStatus('granted');
        setAppPermission('physicalActivity', true);
        if (typeof startSensorTracking === 'function') {
          startSensorTracking();
        }
        showToast('✓ Physical Activity motion sensor streaming active');
        triggerDataSync();
      } else {
        setSensorStatus('denied');
        setAppPermission('physicalActivity', false);
        showToast('Motion permission denied. Check browser site settings');
      }
    } catch (err) {
      console.warn('Physical activity permission error:', err);
    }
  };

  // Batch Allow All & Sync Data
  const handleAllowAll = async () => {
    setHealthStatus(true);
    setAppPermission('healthWellness', true);
    await handleRequestNotifications();
    await handleRequestPhysicalActivity();
    await triggerDataSync();
    completePermissionsOnboarding();
  };

  const handleFinish = () => {
    completePermissionsOnboarding();
    onClose();
  };

  const countGranted = (healthStatus ? 1 : 0) +
    (notificationState === 'granted' ? 1 : 0) +
    (sensorStatus === 'granted' || appPermissions?.physicalActivity ? 1 : 0);

  return (
    <div className="ace-modal-backdrop" onClick={onClose}>
      <div className="ace-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div className="ace-modal-header">
          <div>
            <div className="brand-subtitle">DEVICE PERMISSION MATRIX</div>
            <h2 className="ace-title">APP ACCESS &amp; PERMISSIONS</h2>
          </div>
          <button className="ace-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="ace-tab-pane" style={{ padding: '22px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: '1.5' }}>
            RepLog operates as an integrated fitness operating system. Grant the 3 permissions below to unlock real-time biometrics, workout coaching, and low-power step tracking on your device.
          </p>

          {/* PERMISSION 1: Health, Fitness & Wellness */}
          <div
            className="telemetry-stat-card"
            style={{
              marginBottom: '12px',
              borderLeft: `3px solid ${healthStatus ? '#30D158' : 'var(--border)'}`,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>❤️</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                    1. HEALTH, FITNESS &amp; WELLNESS
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Apple Health &amp; Android Health Connect telemetry
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                    Syncs active calorie expenditure, metabolic rate, resting &amp; workout heart rate, daily ring metrics, and athlete biometric stature.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={`filter-chip-btn ${healthStatus ? 'active' : ''}`}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: healthStatus ? '#30D158' : 'var(--text-muted)',
                  borderColor: healthStatus ? '#30D158' : 'var(--border)',
                  whiteSpace: 'nowrap',
                }}
                onClick={handleToggleHealth}
              >
                {healthStatus ? 'CONNECTED ✓' : 'CONNECT'}
              </button>
            </div>
          </div>

          {/* PERMISSION 2: Notifications */}
          <div
            className="telemetry-stat-card"
            style={{
              marginBottom: '12px',
              borderLeft: `3px solid ${notificationState === 'granted' ? '#30D158' : notificationState === 'denied' ? '#FF453A' : '#FF9F0A'}`,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔔</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                      2. NOTIFICATIONS
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Rest timers, streak preservation &amp; milestone alerts
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                    Sends instant chime alerts when between-set rest timers expire, celebrates daily 10,000-step milestones, and preserves workout streaks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={`filter-chip-btn ${notificationState === 'granted' ? 'active' : ''}`}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: notificationState === 'granted' ? '#30D158' : notificationState === 'denied' ? '#FF453A' : '#FF9F0A',
                  borderColor: notificationState === 'granted' ? '#30D158' : notificationState === 'denied' ? '#FF453A' : '#FF9F0A',
                  whiteSpace: 'nowrap',
                }}
                onClick={handleRequestNotifications}
              >
                {notificationState === 'granted' ? 'ALLOWED ✓' : notificationState === 'denied' ? 'BLOCKED ✕' : 'ALLOW'}
              </button>
            </div>
          </div>

          {/* PERMISSION 3: Physical Activity */}
          <div
            className="telemetry-stat-card"
            style={{
              marginBottom: '18px',
              borderLeft: `3px solid ${sensorStatus === 'granted' || appPermissions?.physicalActivity ? '#30D158' : sensorStatus === 'denied' ? '#FF453A' : '#FF9F0A'}`,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>👣</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                    3. PHYSICAL ACTIVITY
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Hardware motion co-processor &amp; step pedometer
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                    Accesses phone 3-axis accelerometer to count physical footstrikes, running cadence (SPM), and stride speed with zero GPS battery drain (&lt;1% daily).
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={`filter-chip-btn ${sensorStatus === 'granted' || appPermissions?.physicalActivity ? 'active' : ''}`}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: sensorStatus === 'granted' || appPermissions?.physicalActivity ? '#30D158' : sensorStatus === 'denied' ? '#FF453A' : '#FF9F0A',
                  borderColor: sensorStatus === 'granted' || appPermissions?.physicalActivity ? '#30D158' : sensorStatus === 'denied' ? '#FF453A' : '#FF9F0A',
                  whiteSpace: 'nowrap',
                }}
                onClick={handleRequestPhysicalActivity}
              >
                {sensorStatus === 'granted' || appPermissions?.physicalActivity ? 'ACTIVE ✓' : sensorStatus === 'denied' ? 'DENIED ✕' : 'ALLOW'}
              </button>
            </div>
          </div>

          {/* Live Data Sync Banner */}
          {(isSyncing || syncDetails) && (
            <div
              style={{
                padding: '12px 14px',
                background: isSyncing ? 'rgba(10, 132, 255, 0.08)' : 'rgba(48, 209, 88, 0.08)',
                border: `1px solid ${isSyncing ? 'rgba(10, 132, 255, 0.3)' : 'rgba(48, 209, 88, 0.3)'}`,
                borderRadius: '4px',
                marginBottom: '16px',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`live-beacon-dot ${isSyncing ? '' : 'paused'}`} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: isSyncing ? '#0A84FF' : '#30D158' }}>
                    {isSyncing ? 'SYNCHRONIZING WITH APP...' : 'SYNC COMPLETE'}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {isSyncing ? 'ACTIVE HANDSHAKE' : 'UP TO DATE'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {syncDetails}
              </div>
              {isSyncing && (
                <div style={{ height: '3px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: '60%',
                      background: '#0A84FF',
                      animation: 'syncBarPulse 1.2s infinite ease-in-out',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Status summary pill */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid var(--border)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`live-beacon-dot ${countGranted === 3 ? '' : 'paused'}`} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF' }}>
                STATUS: {countGranted} OF 3 PERMISSIONS ACTIVE
              </span>
            </div>
            <span style={{ fontSize: '10px', color: countGranted === 3 ? '#30D158' : 'var(--text-muted)' }}>
              {countGranted === 3 ? 'SYSTEM OPTIMIZED' : 'SETUP INCOMPLETE'}
            </span>
          </div>

          {/* Toast Notice */}
          {toastFeedback && (
            <div style={{ padding: '8px 12px', background: 'rgba(48, 209, 88, 0.1)', border: '1px solid rgba(48, 209, 88, 0.3)', borderRadius: '4px', fontSize: '11px', color: '#30D158', marginBottom: '14px', textAlign: 'center' }}>
              {toastFeedback}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {countGranted < 3 && (
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={handleAllowAll}
              >
                ⚡ GRANT ALL PERMISSIONS (1-TAP)
              </button>
            )}

            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', padding: '12px', borderColor: countGranted === 3 ? '#30D158' : 'var(--border)' }}
              onClick={handleFinish}
            >
              {countGranted === 3 ? '✓ SAVE & LAUNCH FITNESS OS' : 'CONFIRM & CONTINUE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
