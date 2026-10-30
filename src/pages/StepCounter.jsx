import React, { useState, useMemo } from 'react';
import usePedometer from '../features/sensors/usePedometer';
import useWakeLock from '../features/sensors/useWakeLock';
import useAppStore from '../store/useAppStore';

const ZONE_CONFIG = {
  IDLE: { label: 'Idle', color: '#525355', bg: 'rgba(82, 83, 85, 0.1)', icon: '🧘' },
  LEISURE_WALK: { label: 'Leisure Walk', color: '#30D158', bg: 'rgba(48, 209, 88, 0.1)', icon: '🚶' },
  BRISK_WALK: { label: 'Brisk Walk', color: '#FFD60A', bg: 'rgba(255, 214, 10, 0.1)', icon: '🚶‍♂️' },
  AEROBIC_JOG: { label: 'Aerobic Jog', color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.1)', icon: '🏃' },
  PERFORMANCE_RUN: { label: 'Performance Run', color: '#FF375F', bg: 'rgba(255, 55, 95, 0.1)', icon: '🏃‍♂️' },
};

export default function StepCounter() {
  const {
    isSupported,
    permissionState,
    permissionError,
    deviceInfo,
    isTracking,
    isSimulating,
    motionData,
    sensitivity,
    setSensitivity,
    sensitivityConfigs,
    strideCalibration,
    requestSensorPermission,
    startTracking,
    stopTracking,
    startSimulation,
    stopSimulation,
  } = usePedometer();

  useWakeLock(isTracking);

  const { dailyHealth, updateDailyHealth } = useAppStore();
  const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);
  const [simCadence, setSimCadence] = useState(120);

  // Daily totals from the global store
  const totalSteps = dailyHealth?.steps || 0;
  const stepsGoal = dailyHealth?.stepsGoal || 10000;
  const stepsRatio = Math.min(1, Math.max(0, totalSteps / (stepsGoal || 1)));
  const stepsPercent = Math.round(stepsRatio * 100);

  // Compute circular progress for the big ring
  const ringCircumference = 2 * Math.PI * 100; // radius=100
  const ringOffset = ringCircumference * (1 - stepsRatio);

  // Session metrics
  const sessionSteps = motionData.sessionSteps || 0;
  const sessionDist = motionData.sessionDistanceM || 0;
  const sessionCals = motionData.sessionCalories || 0;
  const cadence = motionData.cadence || 0;
  const speedKmH = motionData.speedKmH || 0;
  const zone = ZONE_CONFIG[motionData.cadenceZone] || ZONE_CONFIG.IDLE;
  const activity = motionData.activity || 'STATIONARY';

  // Distance formatting
  const distDisplay = useMemo(() => {
    if (sessionDist >= 1000) return `${(sessionDist / 1000).toFixed(2)} km`;
    return `${sessionDist} m`;
  }, [sessionDist]);

  const totalDistM = useMemo(() => {
    const stride = strideCalibration.walkingStrideM || 0.74;
    return Math.round(totalSteps * stride);
  }, [totalSteps, strideCalibration.walkingStrideM]);

  const totalDistDisplay = useMemo(() => {
    if (totalDistM >= 1000) return `${(totalDistM / 1000).toFixed(2)} km`;
    return `${totalDistM} m`;
  }, [totalDistM]);

  return (
    <div className="page-step-counter">
      <div className="app-card">
        {/* ── Hero Header ─────────────────────────────────────── */}
        <div className="sc-header">
          <div className="sc-header-left">
            <div className="sc-header-badge">
              <span className="sc-header-icon">👣</span>
              <div>
                <h1 className="sc-title">STEP COUNTER</h1>
                <span className="sc-subtitle">WAVELET-INSPIRED ENGINE</span>
              </div>
            </div>
          </div>
          <div className="sc-header-right">
            <button
              className="sc-algo-btn"
              onClick={() => setShowAlgorithmInfo(!showAlgorithmInfo)}
              title="View algorithm details"
            >
              <span>{showAlgorithmInfo ? '✕' : '⚙'}</span>
              <span>{showAlgorithmInfo ? 'CLOSE' : 'ALGORITHM'}</span>
            </button>
          </div>
        </div>

        {/* ── Algorithm Info Panel (collapsible) ───────────── */}
        {showAlgorithmInfo && (
          <div className="sc-algo-panel">
            <div className="sc-algo-title-row">
              <span className="sc-algo-dot" />
              <span className="sc-algo-panel-title">DETECTION ENGINE</span>
              <span className="sc-algo-version">v2.0 WINDOWED</span>
            </div>
            <div className="sc-algo-grid">
              <div className="sc-algo-item">
                <span className="sc-algo-item-label">SAMPLING</span>
                <span className="sc-algo-item-value">10 Hz</span>
                <span className="sc-algo-item-desc">Downsampled from ~60 Hz browser events</span>
              </div>
              <div className="sc-algo-item">
                <span className="sc-algo-item-label">WINDOW</span>
                <span className="sc-algo-item-value">1 sec</span>
                <span className="sc-algo-item-desc">Non-overlapping, per research paper</span>
              </div>
              <div className="sc-algo-item">
                <span className="sc-algo-item-label">THRESHOLD</span>
                <span className="sc-algo-item-value">{motionData.adaptiveThreshold} m/s²</span>
                <span className="sc-algo-item-desc">Adaptive (40% of median amplitude)</span>
              </div>
              <div className="sc-algo-item">
                <span className="sc-algo-item-label">FREQUENCY</span>
                <span className="sc-algo-item-value">{motionData.dominantFreqHz} Hz</span>
                <span className="sc-algo-item-desc">Dominant via autocorrelation</span>
              </div>
              <div className="sc-algo-item">
                <span className="sc-algo-item-label">SIGNAL</span>
                <span className="sc-algo-item-value" style={{
                  color: motionData.signalQuality > 60 ? '#30D158' : motionData.signalQuality > 30 ? '#FFD60A' : '#FF453A'
                }}>{motionData.signalQuality}%</span>
                <span className="sc-algo-item-desc">Autocorrelation confidence</span>
              </div>
              <div className="sc-algo-item">
                <span className="sc-algo-item-label">ORIENTATION</span>
                <span className="sc-algo-item-value" style={{ color: '#30D158' }}>INVARIANT</span>
                <span className="sc-algo-item-desc">Vector magnitude √(x²+y²+z²)</span>
              </div>
            </div>
            <div className="sc-algo-cite">
              Based on: "Open-Source, Step-Counting Algorithm for Smartphone Data"
              <span className="sc-algo-cite-ref">PMC10687676 • Straczkiewicz et al.</span>
            </div>
          </div>
        )}

        {/* ── Big Circular Step Ring ──────────────────────────── */}
        <div className="sc-ring-section">
          <div className="sc-ring-wrap">
            <svg className="sc-ring-svg" viewBox="0 0 240 240">
              {/* Outer glow */}
              <defs>
                <filter id="stepGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="stepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#158FF2" />
                  <stop offset="50%" stopColor="#30D158" />
                  <stop offset="100%" stopColor="#FFD60A" />
                </linearGradient>
              </defs>

              {/* Track ring */}
              <circle
                cx="120" cy="120" r="100"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="14"
                fill="none"
              />
              {/* Progress ring */}
              <circle
                cx="120" cy="120" r="100"
                stroke="url(#stepGrad)"
                strokeWidth="14"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 120 120)"
                filter="url(#stepGlow)"
                style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
              />
              {/* Inner tick marks */}
              {Array.from({ length: 60 }).map((_, i) => {
                const angle = (i / 60) * 360 - 90;
                const rad = (angle * Math.PI) / 180;
                const isMajor = i % 5 === 0;
                const r1 = isMajor ? 82 : 84;
                const r2 = 88;
                return (
                  <line
                    key={i}
                    x1={120 + r1 * Math.cos(rad)}
                    y1={120 + r1 * Math.sin(rad)}
                    x2={120 + r2 * Math.cos(rad)}
                    y2={120 + r2 * Math.sin(rad)}
                    stroke={i / 60 <= stepsRatio ? 'rgba(21, 143, 242, 0.5)' : 'rgba(255,255,255,0.08)'}
                    strokeWidth={isMajor ? 2 : 1}
                  />
                );
              })}
            </svg>

            {/* Center content */}
            <div className="sc-ring-center">
              <div className="sc-ring-steps-count">{totalSteps.toLocaleString()}</div>
              <div className="sc-ring-steps-label">STEPS TODAY</div>
              <div className="sc-ring-goal">
                {stepsPercent}% of {stepsGoal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Activity Zone Indicator */}
          <div className="sc-zone-badge" style={{ background: zone.bg, borderColor: zone.color }}>
            <span className="sc-zone-icon">{zone.icon}</span>
            <span className="sc-zone-label" style={{ color: zone.color }}>{zone.label.toUpperCase()}</span>
            {activity !== 'STATIONARY' && (
              <span className="sc-zone-cadence" style={{ color: zone.color }}>{cadence} SPM</span>
            )}
          </div>
        </div>

        {/* ── Live Metrics Strip ──────────────────────────────── */}
        <div className="sc-metrics-strip">
          <div className="sc-metric-card">
            <span className="sc-metric-icon">🔥</span>
            <div className="sc-metric-body">
              <span className="sc-metric-value">{sessionCals}</span>
              <span className="sc-metric-label">SESSION CAL</span>
            </div>
          </div>
          <div className="sc-metric-card">
            <span className="sc-metric-icon">📏</span>
            <div className="sc-metric-body">
              <span className="sc-metric-value">{distDisplay}</span>
              <span className="sc-metric-label">SESSION DIST</span>
            </div>
          </div>
          <div className="sc-metric-card">
            <span className="sc-metric-icon">⚡</span>
            <div className="sc-metric-body">
              <span className="sc-metric-value">{speedKmH}</span>
              <span className="sc-metric-label">KM/H</span>
            </div>
          </div>
          <div className="sc-metric-card">
            <span className="sc-metric-icon">🎯</span>
            <div className="sc-metric-body">
              <span className="sc-metric-value">{totalDistDisplay}</span>
              <span className="sc-metric-label">TODAY TOTAL</span>
            </div>
          </div>
        </div>

        {/* ── Session Steps Counter ──────────────────────────── */}
        <div className="sc-session-block">
          <div className="sc-session-header">
            <div>
              <span className="sc-session-title">SESSION TRACKER</span>
              <span className="sc-session-subtitle">
                {isTracking
                  ? isSimulating
                    ? `SIMULATOR ACTIVE (${simCadence} SPM)`
                    : activity !== 'STATIONARY'
                      ? 'LIVE MOTION DETECTED'
                      : 'SENSOR LISTENING...'
                  : 'SENSOR PAUSED'}
              </span>
            </div>
            <div className="sc-session-live-badge" style={{
              borderColor: isTracking ? '#30D158' : '#525355',
              color: isTracking ? '#30D158' : '#525355',
            }}>
              <span className={`live-beacon-dot ${isTracking ? '' : 'paused'}`} />
              {isTracking ? 'LIVE' : 'OFF'}
            </div>
          </div>

          <div className="sc-session-metrics-grid">
            <div className="sc-session-metric-big">
              <span className="sc-session-metric-val">{sessionSteps.toLocaleString()}</span>
              <span className="sc-session-metric-unit">SESSION STEPS</span>
            </div>
            <div className="sc-session-metric-big">
              <span className="sc-session-metric-val" style={{ color: zone.color }}>{cadence}</span>
              <span className="sc-session-metric-unit">CADENCE (SPM)</span>
            </div>
          </div>

          {/* Cadence Zone Visualization */}
          <div className="sc-cadence-bar">
            <div className="sc-cadence-zones">
              {[
                { min: 0, max: 100, label: 'LEISURE', color: '#30D158' },
                { min: 100, max: 130, label: 'BRISK', color: '#FFD60A' },
                { min: 130, max: 160, label: 'JOG', color: '#FF9F0A' },
                { min: 160, max: 230, label: 'RUN', color: '#FF375F' },
              ].map((z) => (
                <div
                  key={z.label}
                  className="sc-cadence-zone-segment"
                  style={{
                    flex: z.max - z.min,
                    background: cadence >= z.min && cadence < z.max
                      ? `${z.color}20`
                      : 'rgba(255,255,255,0.03)',
                    borderColor: cadence >= z.min && cadence < z.max ? z.color : 'transparent',
                  }}
                >
                  <span className="sc-cadence-zone-label" style={{
                    color: cadence >= z.min && cadence < z.max ? z.color : '#525355'
                  }}>{z.label}</span>
                </div>
              ))}
            </div>
            {cadence > 0 && (
              <div
                className="sc-cadence-marker"
                style={{
                  left: `${Math.min(100, (cadence / 230) * 100)}%`,
                  background: zone.color,
                }}
              />
            )}
          </div>
        </div>

        {/* ── Live Accelerometer Readout ──────────────────────── */}
        <div className="sc-accel-section">
          <div className="sc-section-header-row">
            <span className="sc-section-dot" />
            <span className="sc-section-label">RAW ACCELEROMETER</span>
            <span className="sc-sensor-type">{deviceInfo.sensorApiType}</span>
          </div>
          <div className="sc-accel-grid">
            <div className="sc-accel-axis">
              <span className="sc-accel-axis-label" style={{ color: '#FF375F' }}>X</span>
              <div className="sc-accel-bar-track">
                <div className="sc-accel-bar-fill" style={{
                  width: `${Math.min(100, Math.abs(motionData.x) * 5)}%`,
                  background: '#FF375F',
                }} />
              </div>
              <span className="sc-accel-axis-val">{motionData.x}</span>
            </div>
            <div className="sc-accel-axis">
              <span className="sc-accel-axis-label" style={{ color: '#30D158' }}>Y</span>
              <div className="sc-accel-bar-track">
                <div className="sc-accel-bar-fill" style={{
                  width: `${Math.min(100, Math.abs(motionData.y) * 5)}%`,
                  background: '#30D158',
                }} />
              </div>
              <span className="sc-accel-axis-val">{motionData.y}</span>
            </div>
            <div className="sc-accel-axis">
              <span className="sc-accel-axis-label" style={{ color: '#158FF2' }}>Z</span>
              <div className="sc-accel-bar-track">
                <div className="sc-accel-bar-fill" style={{
                  width: `${Math.min(100, Math.abs(motionData.z) * 5)}%`,
                  background: '#158FF2',
                }} />
              </div>
              <span className="sc-accel-axis-val">{motionData.z}</span>
            </div>
            <div className="sc-accel-axis">
              <span className="sc-accel-axis-label" style={{ color: '#FFD60A' }}>Δ</span>
              <div className="sc-accel-bar-track">
                <div className="sc-accel-bar-fill" style={{
                  width: `${Math.min(100, motionData.dynamicAccel * 10)}%`,
                  background: 'linear-gradient(90deg, #FFD60A, #FF9F0A)',
                }} />
              </div>
              <span className="sc-accel-axis-val">{motionData.dynamicAccel}</span>
            </div>
          </div>
        </div>

        {/* ── Motion Sensitivity Calibration ──────────────────── */}
        <div className="sc-sensitivity-section">
          <div className="sc-section-header-row">
            <span className="sc-section-dot" style={{ background: '#30D158', boxShadow: '0 0 8px #30D158' }} />
            <span className="sc-section-label">MOTION SENSITIVITY CALIBRATION</span>
            <span className="sc-sensor-type">
              {sensitivityConfigs?.[sensitivity]?.desc || 'Threshold Tuning'}
            </span>
          </div>
          <div className="sc-sensitivity-selector">
            {sensitivityConfigs && Object.values(sensitivityConfigs).map((cfg) => {
              const isActive = sensitivity === cfg.id;
              return (
                <button
                  key={cfg.id}
                  type="button"
                  className={`sc-sensitivity-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setSensitivity(cfg.id)}
                  title={cfg.desc}
                >
                  <span className="sc-sens-title">{cfg.label}</span>
                  <span className="sc-sens-sub">≥ {cfg.minThreshold} m/s²</span>
                </button>
              );
            })}
          </div>
          <div className="sc-sensitivity-note">
            <span>🛡️ Energy Gate Active:</span> Micro-tremor, typing, and gentle desk bumps under {sensitivityConfigs?.[sensitivity]?.minThreshold || 1.8} m/s² are automatically filtered out.
          </div>
        </div>

        {/* ── Sensor Controls ────────────────────────────────── */}
        <div className="sc-controls-section">
          {permissionState !== 'granted' ? (
            <div className="sc-permission-card">
              <div className="sc-perm-icon">📱</div>
              <h3 className="sc-perm-title">Enable Motion Sensor</h3>
              <p className="sc-perm-desc">
                Allow accelerometer access to track your steps using the device's built-in motion co-processor.
                Zero GPS • &lt;1% battery • 100% on-device.
              </p>
              {permissionError && (
                <div className="sc-perm-error">{permissionError}</div>
              )}
              <button className="btn-primary sc-perm-btn" onClick={requestSensorPermission}>
                ENABLE MOTION SENSOR
              </button>
            </div>
          ) : (
            <div className="sc-controls-row">
              {isTracking ? (
                <button
                  className="sc-control-btn sc-control-pause"
                  onClick={() => { stopTracking(); stopSimulation(); }}
                >
                  <span className="sc-control-icon">⏸</span>
                  <span>PAUSE SENSOR</span>
                </button>
              ) : (
                <button
                  className="sc-control-btn sc-control-start"
                  onClick={startTracking}
                >
                  <span className="sc-control-icon">▶</span>
                  <span>RESUME SENSOR</span>
                </button>
              )}
            </div>
          )}

          {/* Desktop Simulation Controls */}
          {permissionState === 'granted' && (
            <div className="sc-sim-section">
              <div className="sc-sim-header">
                <span className="sc-sim-label">DESKTOP SIMULATION</span>
                <span className="sc-sim-desc">Test the algorithm without a physical sensor</span>
              </div>
              <div className="sc-sim-controls">
                <div className="sc-sim-cadence-selector">
                  {[
                    { spm: 80, label: 'SLOW', icon: '🐌' },
                    { spm: 120, label: 'WALK', icon: '🚶' },
                    { spm: 150, label: 'JOG', icon: '🏃' },
                    { spm: 180, label: 'RUN', icon: '🏃‍♂️' },
                  ].map((preset) => (
                    <button
                      key={preset.spm}
                      className={`sc-sim-preset ${simCadence === preset.spm ? 'active' : ''}`}
                      onClick={() => setSimCadence(preset.spm)}
                      style={{
                        borderColor: simCadence === preset.spm ? '#158FF2' : 'var(--border)',
                        color: simCadence === preset.spm ? '#158FF2' : 'var(--text-muted)',
                      }}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                      <span className="sc-sim-preset-spm">{preset.spm}</span>
                    </button>
                  ))}
                </div>
                {!isSimulating ? (
                  <button
                    className="btn-primary sc-sim-start-btn"
                    onClick={() => startSimulation(simCadence)}
                  >
                    ⚡ START SIMULATION ({simCadence} SPM)
                  </button>
                ) : (
                  <button
                    className="sc-control-btn sc-control-pause"
                    onClick={stopSimulation}
                  >
                    <span className="sc-control-icon">🛑</span>
                    <span>STOP SIMULATION</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Stride Calibration Info ─────────────────────────── */}
        <div className="sc-calibration-footer">
          <div className="sc-cal-row">
            <span className="sc-cal-label">STRIDE CALIBRATION</span>
            <span className="sc-cal-source">HEIGHT: {strideCalibration.userHeightCm} cm</span>
          </div>
          <div className="sc-cal-grid">
            <div className="sc-cal-item">
              <span className="sc-cal-item-val">{strideCalibration.walkingStrideM}m</span>
              <span className="sc-cal-item-label">WALK STRIDE</span>
            </div>
            <div className="sc-cal-item">
              <span className="sc-cal-item-val">{strideCalibration.runningStrideM}m</span>
              <span className="sc-cal-item-label">RUN STRIDE</span>
            </div>
            <div className="sc-cal-item">
              <span className="sc-cal-item-val">{strideCalibration.userWeightKg}kg</span>
              <span className="sc-cal-item-label">BODY MASS</span>
            </div>
            <div className="sc-cal-item">
              <span className="sc-cal-item-val" style={{ color: '#30D158' }}>10 Hz</span>
              <span className="sc-cal-item-label">SAMPLE RATE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
