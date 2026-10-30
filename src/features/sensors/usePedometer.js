import { useState, useEffect, useRef, useCallback } from 'react';
import useAppStore from '../../store/useAppStore';
import triggerHaptic from './useHaptics';

/**
 * Advanced Step-Counting Engine (Paper-Inspired Architecture)
 * 
 * Based on: "Open-Source, Step-Counting Algorithm for Smartphone Data
 * Collected in Clinical and Nonclinical Settings" (PMC10687676)
 * 
 * Calibrated for realistic human gait biomechanics:
 * 1. Physical energy & standard deviation gate (rejects resting jitter, desk vibration, typing)
 * 2. Hardware-fused linear acceleration preference (avoids software gravity filter leakage)
 * 3. 10 Hz downsampled ring buffer
 * 4. Refractory peak debouncing (minimum 200ms between footsteps, prominence check)
 * 5. Multi-second gait confirmation buffer (rejects isolated single phone nudges)
 * 6. User-configurable sensitivity modes (Low / Balanced / High)
 */

export const SENSITIVITY_CONFIGS = {
  low: {
    id: 'low',
    label: 'LOW',
    desc: 'Pocket & Bag (Rejects gentle bumps & desk motion)',
    minThreshold: 2.2,     // m/s² minimum peak threshold
    maxThreshold: 4.5,
    minAmplitude: 2.4,     // m/s² peak-to-peak amplitude in 1s window
    minStdDev: 0.65,       // m/s² standard deviation of acceleration
    minQuality: 48,        // 48% autocorrelation correlation minimum
    prominence: 0.65,      // peak prominence above local baseline
    consecutiveWindows: 2, // requires 2 consecutive active seconds before crediting
  },
  medium: {
    id: 'medium',
    label: 'BALANCED',
    desc: 'Standard (Optimal for pocket, waist, and hand)',
    minThreshold: 1.8,     // m/s² minimum peak threshold
    maxThreshold: 4.0,
    minAmplitude: 1.85,    // m/s² peak-to-peak amplitude in 1s window
    minStdDev: 0.48,       // m/s² standard deviation of acceleration
    minQuality: 40,        // 40% autocorrelation correlation minimum
    prominence: 0.50,      // peak prominence above local baseline
    consecutiveWindows: 2, // requires 2 consecutive active seconds before crediting
  },
  high: {
    id: 'high',
    label: 'HIGH',
    desc: 'Light Motion (Sensitive for gentle indoor walking)',
    minThreshold: 1.35,    // m/s² minimum peak threshold
    maxThreshold: 3.5,
    minAmplitude: 1.40,    // m/s² peak-to-peak amplitude in 1s window
    minStdDev: 0.36,       // m/s² standard deviation of acceleration
    minQuality: 32,        // 32% autocorrelation correlation minimum
    prominence: 0.38,      // peak prominence above local baseline
    consecutiveWindows: 1, // immediate credit
  },
};

export function usePedometer() {
  const { dailyHealth, recordStep, athleteProfile, appPermissions, setAppPermission } = useAppStore();

  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState(
    appPermissions?.physicalActivity ? 'granted' : 'prompt'
  );
  const [permissionError, setPermissionError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // User-selectable sensitivity: 'low' | 'medium' | 'high'
  const [sensitivity, setSensitivityState] = useState(() => {
    return localStorage.getItem('pedometer_sensitivity') || 'medium';
  });
  const sensitivityRef = useRef(sensitivity);

  const setSensitivity = useCallback((newSens) => {
    if (SENSITIVITY_CONFIGS[newSens]) {
      setSensitivityState(newSens);
      sensitivityRef.current = newSens;
      localStorage.setItem('pedometer_sensitivity', newSens);
      adaptiveThresholdRef.current = SENSITIVITY_CONFIGS[newSens].minThreshold;
    }
  }, []);

  // Device environment diagnostics
  const [deviceInfo, setDeviceInfo] = useState({
    isIOS: false,
    isAndroid: false,
    isSecureContext: true,
    sensorApiType: 'DeviceMotionEvent (Web)',
  });

  // Calculate biometric personalized stride lengths
  const userHeightCm = athleteProfile?.heightCm || 178;
  const userWeightKg = athleteProfile?.weightKg || 75;
  const walkingStrideM = +((userHeightCm * 0.414) / 100).toFixed(2); // ~0.74m
  const runningStrideM = +((userHeightCm * 0.65) / 100).toFixed(2);  // ~1.16m

  // Live real-time motion telemetry
  const [motionData, setMotionData] = useState({
    x: 0,
    y: 0,
    z: 0,
    magnitude: 9.8,
    dynamicAccel: 0,
    cadence: 0,
    cadenceZone: 'IDLE',
    speedKmH: 0,
    activity: 'STATIONARY',
    sessionSteps: 0,
    sessionDistanceM: 0,
    sessionCalories: 0,
    signalQuality: 0,
    windowSteps: 0,
    adaptiveThreshold: SENSITIVITY_CONFIGS.medium.minThreshold,
    dominantFreqHz: 0,
  });

  // ── Core Algorithm State (Refs for stable event callbacks) ─────────
  const isTrackingRef = useRef(false);
  const sessionStepsRef = useRef(0);
  const sessionDistRef = useRef(0);
  const sessionCalsRef = useRef(0);
  const simTimerRef = useRef(null);

  // 10 Hz Downsampling Ring Buffer (Paper: standardize to 10 Hz)
  const SAMPLE_RATE = 10;
  const sampleIntervalMs = 1000 / SAMPLE_RATE; // 100ms
  const lastSampleTimeRef = useRef(0);

  // Gravity isolation (used only if hardware linear acceleration is unavailable)
  const gravityRef = useRef({ x: 0, y: 9.8, z: 0 });

  // 1-Second Window Accumulator
  const windowBufferRef = useRef([]);
  const windowStartTimeRef = useRef(0);

  // Adaptive Threshold State
  const recentPeaksRef = useRef([]);
  const adaptiveThresholdRef = useRef(SENSITIVITY_CONFIGS.medium.minThreshold);

  // Gait Confirmation & Hysteresis
  // When starting from rest, buffer initial steps. Confirm only if walking persists.
  const pendingStepsBufferRef = useRef([]);
  const consecutiveActiveWindowsRef = useRef(0);

  // Cadence tracking
  const recentStepTimesRef = useRef([]);
  const cadenceRef = useRef(0);
  const speedRef = useRef(0);
  const activityRef = useRef('STATIONARY');
  const lastStepTimeRef = useRef(0);

  // Signal quality tracking
  const signalQualityRef = useRef(0);

  // Inspect environment on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isSecure = window.isSecureContext ?? (window.location.protocol === 'https:' || window.location.hostname === 'localhost');

    setDeviceInfo({
      isIOS,
      isAndroid,
      isSecureContext: isSecure,
      sensorApiType: isIOS ? 'Apple CoreMotion WebKit' : isAndroid ? 'Android SensorManager Web API' : 'Generic DeviceMotionEvent',
    });

    if ('DeviceMotionEvent' in window) {
      setIsSupported(true);

      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        if (!appPermissions?.physicalActivity) {
          setPermissionState('prompt');
        }
      } else {
        if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: 'accelerometer' })
            .then((res) => {
              if (res.state === 'granted') {
                setPermissionState('granted');
                setAppPermission('physicalActivity', true);
              }
              res.onchange = () => {
                setPermissionState(res.state);
                if (res.state === 'granted') {
                  setAppPermission('physicalActivity', true);
                }
              };
            })
            .catch(() => {
              setPermissionState('granted');
              setAppPermission('physicalActivity', true);
            });
        } else {
          setPermissionState('granted');
          setAppPermission('physicalActivity', true);
        }
      }
    } else {
      setIsSupported(false);
      setPermissionState('unsupported');
    }
  }, [appPermissions?.physicalActivity, setAppPermission]);

  const getCadenceZone = (spm) => {
    if (spm <= 0) return 'IDLE';
    if (spm < 100) return 'LEISURE_WALK';
    if (spm <= 130) return 'BRISK_WALK';
    if (spm <= 160) return 'AEROBIC_JOG';
    return 'PERFORMANCE_RUN';
  };

  // ── Paper-Inspired: Dominant Frequency via Autocorrelation ──
  // Evaluates periodicity strictly in the human walking band (0.9 – 3.2 Hz)
  const estimateDominantFrequency = useCallback((samples) => {
    if (samples.length < SAMPLE_RATE) return 0;

    const n = samples.length;
    const mean = samples.reduce((s, v) => s + v, 0) / n;
    const centered = samples.map(v => v - mean);

    // Lags for 0.9 Hz (~11 samples) to 3.2 Hz (~3 samples) at 10 Hz
    const minLag = 3;  // 3.3 Hz maximum gait
    const maxLag = Math.min(n - 1, 11); // 0.9 Hz minimum gait

    let bestLag = 0;
    let bestCorr = -Infinity;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      let norm1 = 0;
      let norm2 = 0;
      for (let i = 0; i < n - lag; i++) {
        corr += centered[i] * centered[i + lag];
        norm1 += centered[i] * centered[i];
        norm2 += centered[i + lag] * centered[i + lag];
      }
      const normalizer = Math.sqrt(norm1 * norm2);
      const normCorr = normalizer > 0 ? corr / normalizer : 0;

      if (normCorr > bestCorr) {
        bestCorr = normCorr;
        bestLag = lag;
      }
    }

    signalQualityRef.current = Math.max(0, Math.min(100, Math.round(bestCorr * 100)));

    if (bestCorr < 0.35 || bestLag === 0) return 0;

    return SAMPLE_RATE / bestLag;
  }, []);

  // ── Step Counting in a 1-Second Window (Energy Gated + Debounced) ──
  const countStepsInWindow = useCallback((windowSamples) => {
    if (windowSamples.length < 4) return 0;

    const currentSens = sensitivityRef.current || 'medium';
    const cfg = SENSITIVITY_CONFIGS[currentSens] || SENSITIVITY_CONFIGS.medium;
    const magnitudes = windowSamples.map(s => s.dynMag);
    const n = magnitudes.length;

    const mean = magnitudes.reduce((s, v) => s + v, 0) / n;
    const variance = magnitudes.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const maxMag = Math.max(...magnitudes);
    const minMag = Math.min(...magnitudes);
    const amplitude = maxMag - minMag;

    // 1. PHYSICAL ENERGY GATE:
    // Human walking produces distinct oscillatory acceleration.
    // Small tremors, desk bumps, or typing have low amplitude & low stdDev.
    if (amplitude < cfg.minAmplitude || stdDev < cfg.minStdDev || maxMag < cfg.minThreshold) {
      return 0;
    }

    // 2. DOMINANT FREQUENCY:
    const domFreq = estimateDominantFrequency(magnitudes);
    const quality = signalQualityRef.current;

    // 3. PROMINENT PEAK DETECTION WITH REFRACTORY DEBOUNCE:
    let peaks = 0;
    let lastPeakIdx = -3;
    const threshold = Math.max(cfg.minThreshold, adaptiveThresholdRef.current);

    for (let i = 1; i < n - 1; i++) {
      const isPeak = magnitudes[i] > magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1];
      const exceedsThresh = magnitudes[i] >= threshold;
      const debounced = (i - lastPeakIdx) >= 2; // at 10Hz, >= 200ms between footsteps
      const localBaseline = (magnitudes[i - 1] + magnitudes[i + 1]) / 2;
      const prominent = (magnitudes[i] - localBaseline) >= cfg.prominence;

      if (isPeak && exceedsThresh && debounced && prominent) {
        peaks++;
        lastPeakIdx = i;
      }
    }

    // 4. GAIT CONFIRMATION FUSION:
    if (domFreq >= 0.9 && domFreq <= 3.2 && quality >= cfg.minQuality) {
      if (peaks > 0) {
        return Math.min(peaks, 4);
      }
      return Math.min(Math.round(domFreq), 3);
    }

    // Fallback: strictly verified prominent peaks
    return Math.min(peaks, 4);
  }, [estimateDominantFrequency]);

  // ── Adaptive Threshold Engine ──
  const updateAdaptiveThreshold = useCallback((magnitude) => {
    recentPeaksRef.current.push(magnitude);
    if (recentPeaksRef.current.length > 40) {
      recentPeaksRef.current.shift();
    }

    const currentSens = sensitivityRef.current || 'medium';
    const cfg = SENSITIVITY_CONFIGS[currentSens] || SENSITIVITY_CONFIGS.medium;

    if (recentPeaksRef.current.length >= 10) {
      const sorted = [...recentPeaksRef.current].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      adaptiveThresholdRef.current = Math.max(
        cfg.minThreshold,
        Math.min(cfg.maxThreshold, median * 0.55)
      );
    } else {
      adaptiveThresholdRef.current = cfg.minThreshold;
    }
  }, []);

  // ── Core Motion Frame Processor ──
  const handleDeviceMotion = useCallback((event) => {
    if (!isTrackingRef.current) return;

    const now = performance.now();

    // ─── Stage 1: 10 Hz Downsampling ───
    if (now - lastSampleTimeRef.current < sampleIntervalMs) return;
    lastSampleTimeRef.current = now;

    // ─── Stage 2: Hardware-Fused Linear Accel vs Software Gravity Filter ───
    let linearX, linearY, linearZ;
    let rawX = 0, rawY = 0, rawZ = 0;

    // Prefer hardware fused linear acceleration if the browser/OS provides it
    if (event.acceleration && event.acceleration.x !== null && event.acceleration.x !== undefined) {
      linearX = event.acceleration.x || 0;
      linearY = event.acceleration.y || 0;
      linearZ = event.acceleration.z || 0;
      if (event.accelerationIncludingGravity) {
        rawX = event.accelerationIncludingGravity.x || 0;
        rawY = event.accelerationIncludingGravity.y || 9.8;
        rawZ = event.accelerationIncludingGravity.z || 0;
      }
    } else if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.x !== null) {
      rawX = event.accelerationIncludingGravity.x || 0;
      rawY = event.accelerationIncludingGravity.y || 0;
      rawZ = event.accelerationIncludingGravity.z || 0;

      // Stable low-pass gravity filter with alpha=0.94 (1.6 second time constant)
      const alpha = 0.94;
      gravityRef.current.x = alpha * gravityRef.current.x + (1 - alpha) * rawX;
      gravityRef.current.y = alpha * gravityRef.current.y + (1 - alpha) * rawY;
      gravityRef.current.z = alpha * gravityRef.current.z + (1 - alpha) * rawZ;

      linearX = rawX - gravityRef.current.x;
      linearY = rawY - gravityRef.current.y;
      linearZ = rawZ - gravityRef.current.z;
    } else {
      return;
    }

    const dynMag = Math.sqrt(linearX * linearX + linearY * linearY + linearZ * linearZ);
    const rawMag = Math.sqrt(rawX * rawX + rawY * rawY + rawZ * rawZ);

    updateAdaptiveThreshold(dynMag);

    // ─── Stage 3: Accumulate into 1-second window ───
    if (windowStartTimeRef.current === 0) {
      windowStartTimeRef.current = now;
    }

    windowBufferRef.current.push({ dynMag, t: now });

    const windowElapsed = now - windowStartTimeRef.current;

    // ─── Stage 4: Process completed 1-second window ───
    if (windowElapsed >= 1000) {
      const windowSamples = windowBufferRef.current;
      const detectedSteps = countStepsInWindow(windowSamples);
      const roundedSteps = Math.round(detectedSteps);

      const currentSens = sensitivityRef.current || 'medium';
      const cfg = SENSITIVITY_CONFIGS[currentSens] || SENSITIVITY_CONFIGS.medium;

      let stepsToRecord = 0;

      if (roundedSteps > 0) {
        consecutiveActiveWindowsRef.current += 1;

        const instantCadence = Math.min(230, Math.round(detectedSteps * 60));
        const isRunning = instantCadence > 135 || dynMag > 4.5;
        const strideMeters = isRunning ? runningStrideM : walkingStrideM;
        const calPerStep = isRunning
          ? 0.065 * (userWeightKg / 70)
          : 0.042 * (userWeightKg / 70);

        // Gait Confirmation: requires consecutive active seconds before confirming gait
        // (prevents isolated table bumps or picking up phone from counting)
        if (cfg.consecutiveWindows > 1 && consecutiveActiveWindowsRef.current < cfg.consecutiveWindows) {
          pendingStepsBufferRef.current.push({
            steps: roundedSteps,
            isRunning,
            dynMag,
            strideMeters,
            calPerStep,
            cadence: instantCadence,
          });
        } else {
          // Commit pending buffer + current window
          const itemsToCommit = [
            ...pendingStepsBufferRef.current,
            {
              steps: roundedSteps,
              isRunning,
              dynMag,
              strideMeters,
              calPerStep,
              cadence: instantCadence,
            },
          ];
          pendingStepsBufferRef.current = [];

          for (const item of itemsToCommit) {
            stepsToRecord += item.steps;
            sessionStepsRef.current += item.steps;
            sessionDistRef.current += item.steps * item.strideMeters;
            sessionCalsRef.current += item.steps * item.calPerStep;

            for (let i = 0; i < item.steps; i++) {
              recentStepTimesRef.current.push(now);
              if (typeof recordStep === 'function') {
                recordStep({ isRunning: item.isRunning, magnitude: item.dynMag });
              }
            }
          }

          // Rolling cadence calculation
          while (recentStepTimesRef.current.length > 20) {
            recentStepTimesRef.current.shift();
          }

          let rollingCadence = instantCadence;
          if (recentStepTimesRef.current.length >= 3) {
            const dt = (recentStepTimesRef.current[recentStepTimesRef.current.length - 1] -
                        recentStepTimesRef.current[0]) / 1000;
            if (dt > 0) {
              rollingCadence = Math.min(230, Math.round(((recentStepTimesRef.current.length - 1) / dt) * 60));
            }
          }

          cadenceRef.current = rollingCadence;
          speedRef.current = +((rollingCadence * strideMeters * 60) / 1000).toFixed(1);
          activityRef.current = isRunning ? 'RUNNING' : 'WALKING';

          triggerHaptic('light');
          lastStepTimeRef.current = now;
        }
      } else {
        // Inactive window: discard unconfirmed isolated bumps
        consecutiveActiveWindowsRef.current = 0;
        pendingStepsBufferRef.current = [];

        if (now - lastStepTimeRef.current > 3000) {
          cadenceRef.current = 0;
          speedRef.current = 0;
          activityRef.current = 'STATIONARY';
          recentStepTimesRef.current = [];
        }
      }

      // Reset window
      windowBufferRef.current = [];
      windowStartTimeRef.current = now;

      // Update UI telemetry
      setMotionData({
        x: +linearX.toFixed(2),
        y: +linearY.toFixed(2),
        z: +linearZ.toFixed(2),
        magnitude: +rawMag.toFixed(1),
        dynamicAccel: +dynMag.toFixed(2),
        cadence: cadenceRef.current,
        cadenceZone: getCadenceZone(cadenceRef.current),
        speedKmH: speedRef.current,
        activity: activityRef.current,
        sessionSteps: sessionStepsRef.current,
        sessionDistanceM: Math.round(sessionDistRef.current),
        sessionCalories: Math.round(sessionCalsRef.current * 10) / 10,
        signalQuality: signalQualityRef.current,
        windowSteps: stepsToRecord,
        adaptiveThreshold: +adaptiveThresholdRef.current.toFixed(2),
        dominantFreqHz: +(detectedSteps).toFixed(1),
      });
    }
  }, [recordStep, runningStrideM, walkingStrideM, userWeightKg, countStepsInWindow, updateAdaptiveThreshold]);

  // Start hardware pedometer tracking
  const startTracking = useCallback(() => {
    if (isTrackingRef.current) return true;
    isTrackingRef.current = true;
    setIsTracking(true);

    windowBufferRef.current = [];
    windowStartTimeRef.current = 0;
    lastSampleTimeRef.current = 0;
    pendingStepsBufferRef.current = [];
    consecutiveActiveWindowsRef.current = 0;

    window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
    return true;
  }, [handleDeviceMotion]);

  // Stop hardware pedometer tracking
  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;
    setIsTracking(false);
    window.removeEventListener('devicemotion', handleDeviceMotion);
  }, [handleDeviceMotion]);

  // Sensor permission request handler
  const requestSensorPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        setPermissionState(response);
        if (response === 'granted') {
          setAppPermission('physicalActivity', true);
          startTracking();
          return true;
        } else {
          setPermissionError('Motion permission was denied. Open iPhone Settings > Safari > Motion & Orientation.');
          return false;
        }
      } catch (err) {
        console.error('Permission error:', err);
        setPermissionState('denied');
        setPermissionError(err.message || 'Sensor permission request requires a user tap.');
        return false;
      }
    }

    setPermissionState('granted');
    setAppPermission('physicalActivity', true);
    startTracking();
    return true;
  }, [setAppPermission, startTracking]);

  useEffect(() => {
    if (permissionState === 'granted' || appPermissions?.physicalActivity) {
      startTracking();
    }
  }, [permissionState, appPermissions?.physicalActivity, startTracking]);

  // Desktop Simulator Mode
  const startSimulation = useCallback((targetCadence = 120) => {
    setIsSimulating(true);
    isTrackingRef.current = true;
    setIsTracking(true);

    if (simTimerRef.current) clearInterval(simTimerRef.current);

    simTimerRef.current = setInterval(() => {
      const isRunning = targetCadence > 135;
      const stepsPerSecond = targetCadence / 60;
      const stepsThisWindow = Math.round(stepsPerSecond);

      const strideMeters = isRunning ? runningStrideM : walkingStrideM;
      const calPerStep = isRunning
        ? 0.065 * (userWeightKg / 70)
        : 0.042 * (userWeightKg / 70);

      for (let i = 0; i < stepsThisWindow; i++) {
        sessionStepsRef.current += 1;
        sessionDistRef.current += strideMeters;
        sessionCalsRef.current += calPerStep;

        if (typeof recordStep === 'function') {
          recordStep({ isRunning, magnitude: isRunning ? 5.8 : 2.4 });
        }
      }

      triggerHaptic('light');

      const activeCadence = targetCadence + Math.floor(Math.random() * 5 - 2);
      const speedKmH = +((activeCadence * strideMeters * 60) / 1000).toFixed(1);

      cadenceRef.current = activeCadence;
      speedRef.current = speedKmH;
      activityRef.current = isRunning ? 'RUNNING' : 'WALKING';

      setMotionData({
        x: +(Math.random() * 1.5 - 0.75).toFixed(2),
        y: +(Math.random() * 1.5 - 0.75).toFixed(2),
        z: +(Math.random() * 1.5 - 0.75).toFixed(2),
        magnitude: isRunning ? +(14.5 + Math.random() * 2).toFixed(1) : +(11.8 + Math.random()).toFixed(1),
        dynamicAccel: isRunning ? +(4.8 + Math.random()).toFixed(2) : +(2.4 + Math.random()).toFixed(2),
        cadence: activeCadence,
        cadenceZone: getCadenceZone(activeCadence),
        speedKmH,
        activity: isRunning ? 'RUNNING' : 'WALKING',
        sessionSteps: sessionStepsRef.current,
        sessionDistanceM: Math.round(sessionDistRef.current),
        sessionCalories: Math.round(sessionCalsRef.current * 10) / 10,
        signalQuality: 85 + Math.floor(Math.random() * 15),
        windowSteps: stepsThisWindow,
        adaptiveThreshold: isRunning ? 2.6 : 1.8,
        dominantFreqHz: +(stepsPerSecond).toFixed(1),
      });
    }, 1000);
  }, [runningStrideM, walkingStrideM, userWeightKg, recordStep]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [handleDeviceMotion]);

  return {
    isSupported,
    permissionState,
    permissionError,
    deviceInfo,
    isTracking,
    isSimulating,
    motionData,
    sensitivity,
    setSensitivity,
    sensitivityConfigs: SENSITIVITY_CONFIGS,
    strideCalibration: {
      userHeightCm,
      userWeightKg,
      walkingStrideM,
      runningStrideM,
    },
    requestSensorPermission,
    startTracking,
    stopTracking,
    startSimulation,
    stopSimulation,
  };
}

export default usePedometer;
