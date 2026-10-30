import React, { useState } from 'react';

export default function MobileRunTrackerModal({
  isOpen,
  onClose,
  isSupported,
  permissionState,
  isTracking,
  isSimulating,
  motionData,
  requestSensorPermission,
  startTracking,
  stopTracking,
  startSimulation,
  stopSimulation,
}) {
  const [permissionError, setPermissionError] = useState(null);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setPermissionError(null);
    try {
      const granted = await requestSensorPermission();
      if (granted) {
        startTracking();
      } else {
        setPermissionError('Permission was not granted. Please check browser / device settings.');
      }
    } catch (err) {
      setPermissionError(err?.message || 'Error requesting sensor permission.');
    }
  };

  return (
    <div className="ace-modal-backdrop" onClick={onClose}>
      <div className="ace-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div className="ace-modal-header">
          <div>
            <div className="brand-subtitle">DEVICE MOTION & FITNESS PERMISSION</div>
            <h2 className="ace-title">AUTOMATIC STEP TRACKING</h2>
          </div>
          <button className="ace-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="ace-tab-pane" style={{ padding: '20px' }}>
          {/* StepUp Value Proposition & Battery Notice */}
          <div
            className="telemetry-stat-card"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>👣</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                  Hardware Motion Co-Processor
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Low-power hardware step counting (StepUp style)
                </div>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '8px 0 12px 0' }}>
              We access your phone's built-in <strong>accelerometer and motion sensors</strong> to detect physical footstrikes. This tracks your steps automatically without using GPS.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#30D158' }}>🔋 &lt; 1% BATTERY</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Zero GPS energy drain</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0A84FF' }}>🔒 100% PRIVATE</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Processed on your device</div>
              </div>
            </div>
          </div>

          {/* Current Permission Status */}
          <div
            className="telemetry-stat-card"
            style={{
              borderColor: permissionState === 'granted' ? '#30D158' : permissionState === 'denied' ? '#FF453A' : '#FF9F0A',
              marginBottom: '16px',
            }}
          >
            <div className="telemetry-card-top">
              <span className="telemetry-card-title">PERMISSION STATUS</span>
              <span
                className="search-tag-chip"
                style={{
                  color: permissionState === 'granted' ? '#30D158' : permissionState === 'denied' ? '#FF453A' : '#FF9F0A',
                  borderColor: permissionState === 'granted' ? '#30D158' : permissionState === 'denied' ? '#FF453A' : '#FF9F0A',
                }}
              >
                {permissionState === 'granted' ? 'GRANTED ✓' : permissionState === 'denied' ? 'DENIED ✕' : 'PERMISSION NEEDED'}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#FFFFFF', marginTop: '6px' }}>
              {permissionState === 'granted' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`live-beacon-dot ${isTracking ? '' : 'paused'}`} />
                  <span>
                    {isTracking
                      ? isSimulating
                        ? 'Simulator streaming steps (+165 SPM)'
                        : 'Motion sensor active — step count updates as you move'
                      : 'Sensor enabled (Paused)'}
                  </span>
                </div>
              ) : permissionState === 'denied' ? (
                <span style={{ color: '#FF453A' }}>
                  Motion sensor access was blocked in browser settings.
                </span>
              ) : (
                <span>
                  Tap below to allow the app to count steps via your phone sensors.
                </span>
              )}
            </div>

            {permissionError && (
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#FF453A' }}>
                {permissionError}
              </div>
            )}
          </div>

          {/* Step Count Feedback */}
          {permissionState === 'granted' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SESSION STEPS RECORDED</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#30D158' }}>
                  {motionData.sessionSteps} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>steps ({motionData.activity})</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CADENCE</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF9F0A' }}>
                  {motionData.cadence} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SPM</span>
                </div>
              </div>
            </div>
          )}

          {/* Permission Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {permissionState !== 'granted' ? (
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={handleRequestPermission}
              >
                📱 ALLOW MOTION &amp; STEP PERMISSIONS
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                {!isTracking ? (
                  <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={startTracking}>
                    ▶ RESUME SENSOR
                  </button>
                ) : (
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, padding: '10px', borderColor: '#FF9F0A', color: '#FF9F0A' }}
                    onClick={() => {
                      stopTracking();
                      stopSimulation();
                    }}
                  >
                    ⏸ PAUSE SENSOR
                  </button>
                )}
              </div>
            )}

            {/* If permission denied: Troubleshooting Guide */}
            {permissionState === 'denied' && (
              <div style={{ padding: '10px', background: 'rgba(255, 69, 58, 0.06)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                <strong style={{ color: '#FFFFFF' }}>How to enable:</strong><br />
                • <strong>iPhone:</strong> Settings &gt; Safari &gt; Motion &amp; Orientation Access &gt; ON.<br />
                • <strong>Android:</strong> Tap the lock/tune icon in browser URL bar &gt; Permissions &gt; Motion Sensors &gt; Allow.
              </div>
            )}

            {/* Test Simulation Toggle */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Desktop / Test Mode:</span>
                {!isSimulating ? (
                  <button
                    className="quick-log-btn"
                    onClick={() => startSimulation(165)}
                  >
                    ⚡ Simulate Walking (165 SPM)
                  </button>
                ) : (
                  <button
                    className="quick-log-btn"
                    style={{ borderColor: '#FF453A', color: '#FF453A' }}
                    onClick={stopSimulation}
                  >
                    🛑 Stop Simulation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
