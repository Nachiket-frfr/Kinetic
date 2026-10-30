import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import aceExercises from '../data/aceExercises.json';
import defaultSplits from '../data/workoutSplits.json';
import AceReferenceModal from '../components/AceReferenceModal';
import usePedometer from '../features/sensors/usePedometer';
import MobileRunTrackerModal from '../components/MobileRunTrackerModal';
import useWakeLock from '../features/sensors/useWakeLock';
import AppPermissionsModal from '../components/AppPermissionsModal';
import CustomSplitModal from '../components/CustomSplitModal';
import HealthConnectModal from '../components/HealthConnectModal';
import { healthRepository } from '../features/health/repository/HealthDataRepository';
import { HealthDataSource } from '../features/health/types/healthTypes';

const CURATED_EXERCISES = [
  { key: 'bodyweight-squat', name: 'Squats', target: 'legs', duration: '5 min', cal: '120 cal', icon: '🏋️', equipment: 'Bodyweight', difficulty: 'Beginner' },
  { key: 'bent-knee-push-up', name: 'Push-Up', target: 'chest', duration: '6 min', cal: '90 cal', icon: '🤸', equipment: 'Bodyweight', difficulty: 'Intermediate' },
  { key: 'deadlift', name: 'Deadlift', target: 'full-body', duration: '8 min', cal: '150 cal', icon: '⚡', equipment: 'Barbell', difficulty: 'Advanced' },
  { key: 'forward-lunge', name: 'Lunges', target: 'legs', duration: '5 min', cal: '110 cal', icon: '🦵', equipment: 'Bodyweight', difficulty: 'Intermediate' },
  { key: 'bicep-curl', name: 'Bicep Curl', target: 'arms', duration: '6 min', cal: '85 cal', icon: '💪', equipment: 'Dumbbells', difficulty: 'Beginner' },
  { key: 'front-plank', name: 'Plank Hold', target: 'abs', duration: '4 min', cal: '70 cal', icon: '🛡️', equipment: 'Bodyweight', difficulty: 'Intermediate' },
  { key: 'crunch', name: 'Ab Crunches', target: 'abs', duration: '5 min', cal: '80 cal', icon: '⚡', equipment: 'Bodyweight', difficulty: 'Beginner' },
  { key: 'burpee', name: 'Burpees HIIT', target: 'full-body', duration: '7 min', cal: '140 cal', icon: '🔥', equipment: 'Bodyweight', difficulty: 'Advanced' },
];

const focusCategories = [
  { id: 'all', label: 'Full Body', icon: '🏋️' },
  { id: 'abs', label: 'Abs', icon: '⚡' },
  { id: 'arms', label: 'Arms', icon: '💪' },
  { id: 'legs', label: 'Legs', icon: '🦵' },
  { id: 'chest', label: 'Chest', icon: '🛡️' },
];

export default function Home() {
  const navigate = useNavigate();
  const {
    dailyHealth,
    updateDailyHealth,
    logManualActivity,
    athleteProfile,
    updateAthleteProfile,
    lvl,
    currExp,
    streak,
    sessionHistory,
    completedWorkouts = [],
    activeWorkoutSession,
    activeSplitId,
    setActiveSplitId,
    getActiveSplit,
    setSelectedExercise,
    customSplits,
    appPermissions,
    completePermissionsOnboarding,
  } = useAppStore();

  // App Permissions System (Health & Wellness, Notifications, Physical Activity)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Auto-prompt on initial session if permissions not yet configured (like camera prompt)
  useEffect(() => {
    if (appPermissions && !appPermissions.hasCompletedOnboarding) {
      setShowPermissionsModal(true);
    }
  }, [appPermissions]);

  // Mobile Hardware Sensor Pedometer & Run Tracking
  const [showPedometerModal, setShowPedometerModal] = useState(false);
  const {
    isSupported: sensorSupported,
    permissionState: sensorPerm,
    isTracking: isSensorTracking,
    isSimulating: isSensorSimulating,
    motionData,
    requestSensorPermission,
    startTracking: startSensorTracking,
    stopTracking: stopSensorTracking,
    startSimulation: startSensorSim,
    stopSimulation: stopSensorSim,
  } = usePedometer();

  // Keep Samsung mobile screen awake when tracking steps
  useWakeLock(isSensorTracking);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [activeFocus, setActiveFocus] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState('ALL');

  // Modals
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showProgramsModal, setShowProgramsModal] = useState(false);
  const [showCustomSplitModal, setShowCustomSplitModal] = useState(false);
  const [editingCustomSplit, setEditingCustomSplit] = useState(null);
  const [showHealthConnectModal, setShowHealthConnectModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAceModal, setShowAceModal] = useState(false);
  const [aceModalKey, setAceModalKey] = useState('bodyweight-squat');
  // Feedback Toast
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  // Form states inside modals
  const [targetForm, setTargetForm] = useState({
    caloriesGoal: dailyHealth?.caloriesGoal || 500,
    stepsGoal: dailyHealth?.stepsGoal || 10000,
    timeGoal: dailyHealth?.timeGoal || 60,
  });

  const [profileForm, setProfileForm] = useState({
    name: athleteProfile?.name || '',
    weightKg: athleteProfile?.weightKg || '',
    heightCm: athleteProfile?.heightCm || '',
  });

  const activeSplit = getActiveSplit();
  const todayWorkout = activeSplit?.days?.[0] || { name: 'Full Body Power', exercises: [] };

  const filteredCurated = useMemo(() => {
    return CURATED_EXERCISES.filter((ex) => {
      const matchesFocus = activeFocus === 'all' || ex.target === activeFocus || (activeFocus === 'full-body');
      const matchesEquip = selectedEquipment === 'ALL' || ex.equipment === selectedEquipment;
      const matchesQuery = searchQuery.trim() === '' || ex.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFocus && matchesEquip && matchesQuery;
    });
  }, [activeFocus, selectedEquipment, searchQuery]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return Object.entries(aceExercises)
      .filter(([key, val]) => {
        const title = (val.title || key).toLowerCase();
        const category = (val.category || '').toLowerCase();
        const equip = (val.equipment || '').toLowerCase();
        return title.includes(q) || category.includes(q) || equip.includes(q);
      })
      .slice(0, 8)
      .map(([key, val]) => ({
        key,
        title: val.title || key,
        category: val.category || 'General',
        equipment: val.equipment || 'Standard',
        difficulty: val.difficulty || 'Intermediate',
      }));
  }, [searchQuery]);

  // Health Telemetry Computations (Genuine, zero fake baseline)
  const calories = dailyHealth?.caloriesBurned || 0;
  const caloriesGoal = dailyHealth?.caloriesGoal || 500;
  const steps = dailyHealth?.steps || 0;
  const stepsGoal = dailyHealth?.stepsGoal || 10000;
  const activeMinutes = dailyHealth?.activeMinutes || 0;
  const timeGoal = dailyHealth?.timeGoal || 60;

  const calRatio = Math.min(1, Math.max(0, calories / (caloriesGoal || 1)));
  const calOffset = 390 * (1 - calRatio);

  const stepsRatio = Math.min(1, Math.max(0, steps / (stepsGoal || 1)));
  const stepsOffset = 290 * (1 - stepsRatio);

  const timeRatio = Math.min(1, Math.max(0, activeMinutes / (timeGoal || 1)));
  const timeOffset = 188 * (1 - timeRatio);

  // Live Real-Time Clock & Date State
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const getGreeting = (date) => {
    const hours = date.getHours();
    if (hours >= 5 && hours < 12) return 'GOOD MORNING';
    if (hours >= 12 && hours < 17) return 'GOOD AFTERNOON';
    if (hours >= 17 && hours < 22) return 'GOOD EVENING';
    return 'GOOD NIGHT';
  };

  const formattedTime = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const liveBpm = dailyHealth?.heartRate || null;

  const handleLaunchExercise = (exerciseKey) => {
    setSelectedExercise(exerciseKey);
    navigate('/workout');
  };

  const handleLaunchProgram = (splitId) => {
    setActiveSplitId(splitId);
    navigate('/workout');
  };

  const handleSaveGoals = (e) => {
    e.preventDefault();
    updateDailyHealth({
      caloriesGoal: Number(targetForm.caloriesGoal) || 600,
      stepsGoal: Number(targetForm.stepsGoal) || 10000,
      timeGoal: Number(targetForm.timeGoal) || 60,
    });
    setShowHealthModal(false);
    triggerToast('✓ Daily Health Targets Updated');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateAthleteProfile({
      name: profileForm.name || 'Athlete',
      weightKg: profileForm.weightKg ? Number(profileForm.weightKg) : null,
      heightCm: profileForm.heightCm ? Number(profileForm.heightCm) : null,
    });
    setShowProfileModal(false);
    triggerToast('✓ Athlete Profile Updated');
  };

  // Workouts summaries for Home (from completedWorkouts or synthesized from sessionHistory)
  const resolvedWorkouts = useMemo(() => {
    if (completedWorkouts && completedWorkouts.length > 0) {
      return completedWorkouts;
    }
    if (!sessionHistory || sessionHistory.length === 0) return [];

    // Synthesize workouts by grouping sets by date
    const groupsByDate = {};
    sessionHistory.forEach((s) => {
      const d = s.date || 'Historical';
      if (!groupsByDate[d]) {
        groupsByDate[d] = {
          id: `synth-${d}`,
          date: d,
          time: 'Logged Session',
          title: `${(s.exercise || 'Workout').toUpperCase()} SESSION`,
          duration: `${Math.max(10, Math.round(sessionHistory.length * 2.5))} min`,
          durationSec: sessionHistory.length * 150,
          volumeKg: 0,
          setsCount: 0,
          isPRDay: false,
          prCount: 0,
          exercises: {},
          avgFormScore: 94,
        };
      }
      const g = groupsByDate[d];
      const vol = (Number(s.weight) || 0) * (Number(s.reps) || 0);
      g.volumeKg += vol;
      g.setsCount += 1;
      const exKey = s.exercise || 'General';
      if (!g.exercises[exKey]) {
        g.exercises[exKey] = {
          key: exKey,
          title: (s.exercise || 'Exercise').toUpperCase(),
          setsCount: 0,
          volume: 0,
          bestWeight: 0,
        };
      }
      g.exercises[exKey].setsCount += 1;
      g.exercises[exKey].volume += vol;
      g.exercises[exKey].bestWeight = Math.max(g.exercises[exKey].bestWeight, Number(s.weight) || 0);
    });

    return Object.values(groupsByDate).map((g) => ({
      ...g,
      exercises: Object.values(g.exercises),
    })).reverse();
  }, [completedWorkouts, sessionHistory]);

  return (
    <div className="page-home">
      <div className="app-card">
        {/* Top Athlete Greeting Bar (Real-Time Dynamic) */}
        <div className="home-top-greeting-row">
          <div
            className="home-greeting-text"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowProfileModal(true)}
            title="Click to view/edit Athlete Profile"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="home-greeting-label">{getGreeting(now)}</span>
              <span className="live-beacon-dot" title="Live Telemetry Active" />
            </div>
            <h1 className="home-user-name">
              {athleteProfile?.name ? athleteProfile.name.toUpperCase() : 'ATHLETE'}{' '}
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                [LVL {lvl}]
              </span>
            </h1>
            <div className="home-live-clock-row">
              <span className="home-live-time">{formattedTime}</span>
              <span>• {formattedDate.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="live-sensor-btn"
              style={{
                borderColor: (appPermissions?.physicalActivity && appPermissions?.notifications && appPermissions?.healthWellness) ? '#30D158' : '#FF9F0A',
                color: (appPermissions?.physicalActivity && appPermissions?.notifications && appPermissions?.healthWellness) ? '#30D158' : '#FF9F0A',
                background: (appPermissions?.physicalActivity && appPermissions?.notifications && appPermissions?.healthWellness) ? 'rgba(48, 209, 88, 0.08)' : 'rgba(255, 159, 10, 0.08)',
                padding: '6px 10px',
                fontSize: '10px',
                fontWeight: 800,
              }}
              onClick={() => setShowPermissionsModal(true)}
              title="System Permissions (Health & Wellness, Notifications, Physical Activity)"
            >
              <span className={`live-beacon-dot ${(appPermissions?.physicalActivity && appPermissions?.notifications) ? '' : 'paused'}`} />
              {(appPermissions?.physicalActivity && appPermissions?.notifications && appPermissions?.healthWellness)
                ? appPermissions?.lastSyncedAt
                  ? 'SYNCED (3/3)'
                  : 'PERMISSIONS (3/3)'
                : 'PERMISSIONS SETUP'}
            </button>
            <div
              className="home-profile-badge"
              title="Athlete Profile Hub"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowProfileModal(true)}
            >
              <div className="home-avatar">
                <span className="avatar-emoji">🧔🏻</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Active Workout In Progress Banner */}
        {activeWorkoutSession?.isActive && (
          <div
            className="home-active-session-banner"
            onClick={() => navigate('/workout')}
            style={{
              margin: '14px 0 6px',
              padding: '14px 18px',
              background: 'linear-gradient(135deg, rgba(21,143,242,0.18), rgba(21,143,242,0.06))',
              border: '1px solid rgba(21,143,242,0.45)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(21,143,242,0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="active-pulse" style={{ fontSize: '20px' }}>⚡</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent, #158FF2)', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                    ● LIVE WORKOUT IN PROGRESS
                  </span>
                  <span style={{ fontSize: '10px', background: 'rgba(21,143,242,0.25)', color: 'var(--accent, #158FF2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {activeWorkoutSession.exercises?.length || 1} EXERCISES
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #E4E6E9)', marginTop: '3px' }}>
                  {activeWorkoutSession.exercises?.map((e) => e.title || e.exerciseKey).join(' • ') || 'Live Session'}
                </div>
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ fontSize: '11px', padding: '8px 14px', whiteSpace: 'nowrap' }}
              onClick={(e) => {
                e.stopPropagation();
                navigate('/workout');
              }}
            >
              RESUME WORKOUT →
            </button>
          </div>
        )}

        {/* Search Bar with Live Dropdown & Filter Drawer Toggle */}
        <div className="home-search-container">
          <div className="home-search-row">
            <div className="home-search-box">
              <span className="home-search-icon">🔍</span>
              <input
                type="text"
                className="home-search-input"
                placeholder="Search Workouts, Exercises, Protocols..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0 8px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <button
              className={`home-filter-btn ${showFilterDrawer ? 'active' : ''}`}
              title="Toggle Filter Options"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              style={{
                borderColor: showFilterDrawer ? 'var(--accent)' : undefined,
                color: showFilterDrawer ? 'var(--accent)' : undefined,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
          </div>

          {/* Real-time Search Dropdown when typing */}
          {searchQuery.trim() !== '' && (
            <div className="home-search-dropdown">
              <div className="search-dropdown-header">
                <span>FOUND {searchResults.length} MATCHING EXERCISES</span>
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  CLOSE
                </button>
              </div>
              {searchResults.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No exercises found matching "{searchQuery}"
                </div>
              ) : (
                searchResults.map((res) => (
                  <div key={res.key} className="search-result-item">
                    <div className="search-result-info">
                      <div className="search-result-title">{res.title}</div>
                      <div className="search-result-tags">
                        <span className="search-tag-chip">{res.category}</span>
                        <span className="search-tag-chip">{res.equipment}</span>
                      </div>
                    </div>
                    <div className="search-result-actions">
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '10px' }}
                        onClick={() => {
                          setAceModalKey(res.key);
                          setShowAceModal(true);
                        }}
                      >
                        FORM
                      </button>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 10px', fontSize: '10px' }}
                        onClick={() => handleLaunchExercise(res.key)}
                      >
                        START
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Collapsible Filter Drawer */}
        {showFilterDrawer && (
          <div className="home-filter-drawer">
            <div className="filter-group-row">
              <span className="filter-group-label">EQUIPMENT:</span>
              <div className="filter-chips-list">
                {['ALL', 'Bodyweight', 'Dumbbells', 'Barbell'].map((eq) => (
                  <button
                    key={eq}
                    className={`filter-chip-btn ${selectedEquipment === eq ? 'active' : ''}`}
                    onClick={() => setSelectedEquipment(eq)}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group-row">
              <span className="filter-group-label">TARGET:</span>
              <div className="filter-chips-list">
                {[
                  { id: 'all', label: 'All Muscles' },
                  { id: 'abs', label: 'Abs' },
                  { id: 'arms', label: 'Arms' },
                  { id: 'legs', label: 'Legs' },
                  { id: 'chest', label: 'Chest' },
                  { id: 'full-body', label: 'Compound' },
                ].map((tgt) => (
                  <button
                    key={tgt.id}
                    className={`filter-chip-btn ${activeFocus === tgt.id ? 'active' : ''}`}
                    onClick={() => setActiveFocus(tgt.id)}
                  >
                    {tgt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Connected Health Integration Hub (Google Fit / Health Connect / Device Sensors) */}
        {(() => {
          const activeSource = healthRepository.getActiveSource();
          const isFit = activeSource === HealthDataSource.GOOGLE_FIT;
          const isHc = activeSource === HealthDataSource.HEALTH_CONNECT;
          const isHw = isSensorTracking;
          const isAnyConnected = isFit || isHc || isHw;

          return (
            <div
              className="home-device-card clickable"
              onClick={() => setShowHealthConnectModal(true)}
              title="Configure Health Connect & Google Fit Data Providers"
            >
              <div className="home-device-info">
                <div className="home-device-icon-wrap" style={{ background: isAnyConnected ? 'rgba(21, 143, 242, 0.15)' : 'rgba(255, 255, 255, 0.05)' }}>
                  <span className="watch-icon">{isFit ? '🔵' : isHc ? '🟢' : isHw ? '👣' : '⚡'}</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="home-device-title">
                      {isFit
                        ? 'GOOGLE FIT (CLOUD SYNC)'
                        : isHc
                        ? 'HEALTH CONNECT (ANDROID)'
                        : isHw
                        ? 'MOTION SENSOR PEDOMETER'
                        : 'HEALTH PROVIDER'}
                    </span>
                    <span className={`live-stream-badge ${isAnyConnected ? '' : 'paused'}`}>
                      <span className={`live-beacon-dot ${isAnyConnected ? '' : 'paused'}`} />
                      {isAnyConnected ? 'ACTIVE' : 'DISCONNECTED'}
                    </span>
                  </div>
                  <div className="home-device-status">
                    {isAnyConnected ? (
                      <span style={{ color: '#30D158', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                        ✓ {steps > 0 ? `${steps.toLocaleString()} steps synchronized today` : 'Connected • No step records yet'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        Activity data not connected • Tap to connect Google Fit or Health Connect
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="home-device-action" title="Device Controls">
                <span className="btn-secondary" style={{ fontSize: '10px', padding: '4px 10px' }}>
                  {isAnyConnected ? 'MANAGE' : '+ CONNECT'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Health Overview Section (Interactive Real-Time Rings & Telemetry Hub) */}
        <div className="home-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="home-section-title">DAILY ACTIVITY RINGS</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="home-view-all-link"
              onClick={() => navigate('/macros')}
              style={{ color: '#30D158' }}
              title="Open Scientific Macros & TDEE Calculator"
            >
              Macros ↗
            </button>
            <button
              className="home-view-all-link"
              onClick={() => navigate('/steps')}
              style={{ color: '#158FF2' }}
              title="Open Dedicated Wavelet Step Counter"
            >
              Step Counter ↗
            </button>
            <button
              className="home-view-all-link"
              onClick={() => setShowHealthModal(true)}
              title="Log Activity or Adjust Goals"
            >
              Log / Goals ↗
            </button>
          </div>
        </div>

        <div
          className="health-overview-card clickable"
          onClick={() => setShowHealthModal(true)}
          title="Click to view detailed metrics, log activity, or set goals"
        >
          <div className="health-metrics-list">
            <div className="health-metric-item">
              <span className="metric-icon-bubble coral">🔥</span>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="health-metric-val">
                    {calories}{' '}
                    <span className="health-unit">/ {caloriesGoal} Kcal</span>
                  </div>
                  <div className="health-metric-name">
                    CALORIES ({Math.round(calRatio * 100)}%)
                  </div>
                </div>
                <button
                  type="button"
                  className="live-sensor-btn"
                  style={{
                    borderColor: '#30D158',
                    color: '#30D158',
                    background: 'rgba(48, 209, 88, 0.08)',
                    fontSize: '9px',
                    padding: '4px 8px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/macros');
                  }}
                  title="Calculate Daily Target Calories & Macros"
                >
                  <span>🥗</span>
                  <span>MACROS ↗</span>
                </button>
              </div>
            </div>

            <div className="health-metric-item" style={{ position: 'relative' }}>
              <span className="metric-icon-bubble gold">👣</span>
              <div style={{ flex: 1 }}>
                <div className="health-metric-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>
                      {steps.toLocaleString()}{' '}
                      <span className="health-unit">/ {stepsGoal.toLocaleString()} Steps</span>
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      SOURCE: {healthRepository.getActiveSource() === HealthDataSource.GOOGLE_FIT ? 'GOOGLE FIT' : healthRepository.getActiveSource() === HealthDataSource.HEALTH_CONNECT ? 'HEALTH CONNECT' : 'DEVICE HARDWARE'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="live-sensor-btn"
                      style={{
                        borderColor: '#158FF2',
                        color: '#158FF2',
                        background: 'rgba(21, 143, 242, 0.1)',
                        fontSize: '9px',
                        padding: '4px 8px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/steps');
                      }}
                      title="Open Dedicated Wavelet Step Counter Page"
                    >
                      <span>👣</span>
                      <span>STEP LAB ↗</span>
                    </button>

                    <button
                      type="button"
                      className="live-sensor-btn"
                      style={{
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        color: '#FFFFFF',
                        background: 'rgba(255, 255, 255, 0.05)',
                        fontSize: '9px',
                        padding: '4px 8px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHealthConnectModal(true);
                      }}
                      title="Connect Google Fit or Health Connect"
                    >
                      <span>🔄</span>
                      <span>SYNC APPS</span>
                    </button>

                    <button
                      type="button"
                      className="live-sensor-btn"
                      style={{
                        borderColor: isSensorTracking ? '#30D158' : 'rgba(255, 214, 10, 0.3)',
                        color: isSensorTracking ? '#30D158' : '#FFD60A',
                        background: isSensorTracking ? 'rgba(48, 209, 88, 0.08)' : 'rgba(255, 214, 10, 0.1)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPedometerModal(true);
                      }}
                      title="Hardware Motion Sensor Step Engine"
                    >
                      <span className={`live-beacon-dot ${isSensorTracking ? '' : 'paused'}`} />
                      {isSensorTracking
                        ? isSensorSimulating
                          ? 'SIM ACTIVE'
                          : motionData.activity !== 'STATIONARY'
                            ? `${motionData.activity} (${motionData.cadence} SPM)`
                            : 'AUTO TRACKING ON'
                        : 'ENABLE SENSOR'}
                    </button>
                  </div>
                </div>
                <div className="health-metric-name">
                  STEPS ({Math.round(stepsRatio * 100)}%)
                </div>
              </div>
            </div>

            <div className="health-metric-item">
              <span className="metric-icon-bubble lime">⏱️</span>
              <div>
                <div className="health-metric-val">
                  {activeMinutes}{' '}
                  <span className="health-unit">/ {timeGoal} Min</span>
                </div>
                <div className="health-metric-name">
                  ACTIVE TIME ({Math.round(timeRatio * 100)}%)
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Concentric Rings SVG */}
          <div className="health-rings-container">
            <svg className="concentric-rings-svg" viewBox="0 0 160 160">
              {/* Outer Ring Background (Calories: Pink/Coral #FF375F) */}
              <circle cx="80" cy="80" r="62" stroke="rgba(255, 55, 95, 0.15)" strokeWidth="12" fill="none" />
              {/* Outer Ring Active Fill */}
              <circle
                cx="80" cy="80" r="62"
                stroke="#FF375F"
                strokeWidth="12"
                strokeDasharray="390"
                strokeDashoffset={calOffset}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 80 80)"
              />

              {/* Middle Ring Background (Steps: Electric Blue #158FF2) */}
              <circle cx="80" cy="80" r="46" stroke="rgba(21, 143, 242, 0.15)" strokeWidth="12" fill="none" />
              {/* Middle Ring Active Fill */}
              <circle
                cx="80" cy="80" r="46"
                stroke="#158FF2"
                strokeWidth="12"
                strokeDasharray="290"
                strokeDashoffset={stepsOffset}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 80 80)"
              />

              {/* Inner Ring Background (Active Time: Lime #30D158) */}
              <circle cx="80" cy="80" r="30" stroke="rgba(48, 209, 88, 0.15)" strokeWidth="12" fill="none" />
              {/* Inner Ring Active Fill */}
              <circle
                cx="80" cy="80" r="30"
                stroke="#30D158"
                strokeWidth="12"
                strokeDasharray="188"
                strokeDashoffset={timeOffset}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 80 80)"
              />
            </svg>
          </div>
        </div>

        {/* Programs Section */}
        <div className="home-section-header" style={{ marginTop: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="home-section-title">PROGRAMS</h2>
            <button
              type="button"
              className="live-sensor-btn"
              style={{ padding: '2px 8px', fontSize: '9px' }}
              onClick={() => {
                setEditingCustomSplit(null);
                setShowCustomSplitModal(true);
              }}
            >
              + CUSTOM
            </button>
          </div>
          <button className="home-view-all-link" onClick={() => setShowProgramsModal(true)}>
            View all ({defaultSplits.length + (customSplits?.length || 0)})
          </button>
        </div>

        <div className="programs-scroll-row">
          {/* Card 1: Active Split */}
          <div
            className="program-card"
            onClick={() => handleLaunchProgram(activeSplit?.id || 'ppl-6day')}
            title="Launch ongoing split"
          >
            <div className="program-bg-gradient workout-gradient" />
            <div className="program-content">
              <span className="program-tag">ACTIVE SPLIT</span>
              <h3 className="program-title">{activeSplit?.name || 'Workout Protocol'}</h3>
              <p className="program-subtitle">
                {todayWorkout?.name || 'Day 1'} • {todayWorkout?.exercises?.length || 5} Exercises
              </p>
            </div>
            <button
              className="program-play-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleLaunchProgram(activeSplit?.id || 'ppl-6day');
              }}
            >
              ▶
            </button>
          </div>

          {/* Card 2: Cardio HIIT */}
          <div
            className="program-card"
            onClick={() => handleLaunchProgram('cardio-hiit')}
            title="Launch Cardio HIIT protocol"
          >
            <div className="program-bg-gradient cardio-gradient" />
            <div className="program-content">
              <span className="program-tag">ENDURANCE</span>
              <h3 className="program-title">Cardio HIIT</h3>
              <p className="program-subtitle">HIIT Sprint & Core • 5 Intervals</p>
            </div>
            <button
              className="program-play-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleLaunchProgram('cardio-hiit');
              }}
            >
              ▶
            </button>
          </div>

          {/* Card 3: Custom Split Builder Quick Card */}
          <div
            className="program-card"
            style={{ borderStyle: 'dashed', cursor: 'pointer' }}
            onClick={() => {
              setEditingCustomSplit(null);
              setShowCustomSplitModal(true);
            }}
            title="Design a custom periodized workout split"
          >
            <div className="program-bg-gradient" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06), transparent 70%)' }} />
            <div className="program-content">
              <span className="program-tag" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>+ ARCHITECT</span>
              <h3 className="program-title">Build Custom Split</h3>
              <p className="program-subtitle">Configure days, exercises, sets &amp; reps</p>
            </div>
            <button
              className="program-play-btn"
              style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              onClick={(e) => {
                e.stopPropagation();
                setEditingCustomSplit(null);
                setShowCustomSplitModal(true);
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Recent Workout Activity Section */}
        <div className="home-section-header" style={{ marginTop: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="home-section-title">RECENT WORKOUTS</h2>
          </div>
          {resolvedWorkouts && resolvedWorkouts.length > 0 && (
            <button className="home-view-all-link" onClick={() => navigate('/profile')}>
              View all ({resolvedWorkouts.length})
            </button>
          )}
        </div>

        {resolvedWorkouts && resolvedWorkouts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {resolvedWorkouts.slice(0, 4).map((workout, idx) => (
              <div
                key={workout.id || idx}
                style={{
                  background: 'var(--surface, #1B1C1E)',
                  border: workout.isPRDay ? '1px solid rgba(255, 179, 0, 0.45)' : '1px solid var(--border, #2A2B2E)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: workout.isPRDay ? '0 4px 20px rgba(255, 179, 0, 0.08)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header Row: Title, Date, and PR Day Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary, #E4E6E9)', letterSpacing: '-0.01em' }}>
                      {(workout.title || 'WORKOUT SESSION').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #767472)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {workout.date} {workout.time ? `• ${workout.time}` : ''}
                    </div>
                  </div>

                  {workout.isPRDay || (workout.prCount > 0) ? (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 179, 0, 0.25), rgba(255, 140, 0, 0.15))',
                        border: '1px solid rgba(255, 180, 0, 0.55)',
                        color: '#FFB300',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 0 12px rgba(255, 179, 0, 0.25)',
                      }}
                    >
                      ⚡ PR DAY {workout.prCount > 1 ? `(${workout.prCount} PRs)` : ''}
                    </span>
                  ) : (
                    <span
                      style={{
                        background: 'rgba(21, 143, 242, 0.12)',
                        border: '1px solid rgba(21, 143, 242, 0.3)',
                        color: 'var(--accent, #158FF2)',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      ✓ COMPLETED
                    </span>
                  )}
                </div>

                {/* Key Metrics 4-Column Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                    background: 'var(--surface-secondary, #141517)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle, #232427)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted, #767472)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      VOLUME
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent, #158FF2)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {(workout.volumeKg || 0).toLocaleString()} kg
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted, #767472)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      TIME
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #E4E6E9)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {workout.duration || `${Math.round((workout.durationSec || 600) / 60)}m`}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted, #767472)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      SETS
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #E4E6E9)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {workout.setsCount || 0} sets
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted, #767472)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      FORM
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#30D158', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {workout.avgFormScore || 95}%
                    </div>
                  </div>
                </div>

                {/* Exercises Included Breakdown */}
                {workout.exercises && workout.exercises.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted, #767472)', fontWeight: 700, letterSpacing: '0.04em' }}>
                      EXERCISES PERFORMED
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {workout.exercises.map((ex, exI) => (
                        <span
                          key={exI}
                          style={{
                            fontSize: '11px',
                            background: 'var(--surface-elevated, #232427)',
                            border: ex.isPR ? '1px solid rgba(255, 179, 0, 0.45)' : '1px solid var(--border, #2A2B2E)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            color: 'var(--text-primary, #E4E6E9)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{ex.title || ex.key}</span>
                          <span style={{ color: 'var(--text-muted, #767472)', fontSize: '10px' }}>
                            ({ex.setsCount || 1} {ex.setsCount === 1 ? 'set' : 'sets'}{ex.volume ? ` • ${ex.volume.toLocaleString()} kg` : ''})
                          </span>
                          {ex.isPR && <span style={{ color: '#FFB300', fontSize: '10px' }}>🏆 PR</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* PR achievement notes */}
                {workout.prList && workout.prList.length > 0 && (
                  <div
                    style={{
                      background: 'rgba(255, 179, 0, 0.08)',
                      border: '1px dashed rgba(255, 179, 0, 0.3)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      color: '#FFB300',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🏆</span>
                    <span><strong>New PR:</strong> {workout.prList.join(' • ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '24px 16px',
              background: 'var(--surface, #1B1C1E)',
              border: '1px solid var(--border, #2A2B2E)',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '28px' }}>🏋️‍♂️</span>
            <h4 style={{ margin: '8px 0 4px', color: 'var(--text-primary, #E4E6E9)', fontSize: '13px' }}>
              NO WORKOUTS RECORDED YET
            </h4>
            <p style={{ color: 'var(--text-muted, #767472)', fontSize: '11px', maxWidth: '320px', margin: '0 auto 14px' }}>
              Complete your first workout session to begin tracking volume, consistency, and muscular progression.
            </p>
            <button
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '11px' }}
              onClick={() => navigate('/workout')}
            >
              + START A WORKOUT
            </button>
          </div>
        )}

        {/* Focus Anatomical Targets */}
        <div className="home-section-header" style={{ marginTop: '28px' }}>
          <h2 className="home-section-title">FOCUS TARGETS</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {activeFocus === 'all' ? 'All Groups' : activeFocus.toUpperCase()}
          </span>
        </div>

        <div className="focus-targets-row">
          {focusCategories.map((cat) => (
            <div
              key={cat.id}
              className={`focus-target-item ${activeFocus === cat.id ? 'active' : ''}`}
              onClick={() => setActiveFocus(activeFocus === cat.id ? 'all' : cat.id)}
              title={`Filter exercises by ${cat.label}`}
            >
              <div className={`focus-circle ${activeFocus === cat.id ? 'active' : ''}`}>
                <span className="focus-icon">{cat.icon}</span>
              </div>
              <span className="focus-label">{cat.label}</span>
            </div>
          ))}
        </div>

        {/* Your Exercises (Quick Start & Biomechanical Guidance) */}
        <div className="home-section-header" style={{ marginTop: '28px' }}>
          <h2 className="home-section-title">YOUR EXERCISES</h2>
          <button className="home-view-all-link" onClick={() => navigate('/workout')}>
            Library ↗
          </button>
        </div>

        <div className="your-exercises-grid">
          {filteredCurated.length === 0 ? (
            <div style={{ gridColumn: 'span 2', padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No exercises found for current filters.
            </div>
          ) : (
            filteredCurated.map((ex) => (
              <div key={ex.key} className="quick-exercise-card">
                <div className="quick-ex-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{ex.icon}</span>
                    <h4 className="quick-ex-name">{ex.name}</h4>
                  </div>
                  <div className="quick-ex-meta">
                    <span>⏱️ {ex.duration}</span>
                    <span>🔥 {ex.cal}</span>
                    <span style={{ color: 'var(--accent)' }}>• {ex.equipment}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '10px' }}
                    onClick={() => {
                      setAceModalKey(ex.key);
                      setShowAceModal(true);
                    }}
                    title="View ACE Form Coaching Guide"
                  >
                    FORM
                  </button>
                  <button
                    className="btn-primary quick-start-btn"
                    onClick={() => handleLaunchExercise(ex.key)}
                    title="Launch Live Biomechanical Camera Tracking"
                  >
                    START
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MODAL 1: HEALTH OVERVIEW & BIOMETRICS HUB ─────────────── */}
      {showHealthModal && (
        <div className="ace-modal-backdrop" onClick={() => setShowHealthModal(false)}>
          <div className="ace-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="ace-modal-header">
              <div>
                <div className="brand-subtitle">BIOMETRIC TELEMETRY</div>
                <h2 className="ace-title">DAILY HEALTH & METRICS</h2>
              </div>
              <button className="ace-close-btn" onClick={() => setShowHealthModal(false)}>✕</button>
            </div>

            <div className="ace-tab-pane">
              {/* Detailed Progress Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="telemetry-stat-card">
                  <div className="telemetry-card-top">
                    <span className="telemetry-card-title">🔥 ACTIVE CALORIES BURNED</span>
                    <span className="telemetry-card-val">
                      {calories} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {caloriesGoal} kcal</span>
                    </span>
                  </div>
                  <div className="telemetry-progress-track">
                    <div className="telemetry-progress-fill coral" style={{ width: `${Math.min(100, Math.round(calRatio * 100))}%` }} />
                  </div>
                </div>

                <div className="telemetry-stat-card">
                  <div className="telemetry-card-top">
                    <span className="telemetry-card-title">👣 STEP COUNTER</span>
                    <span className="telemetry-card-val">
                      {steps.toLocaleString()} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {stepsGoal.toLocaleString()} steps</span>
                    </span>
                  </div>
                  <div className="telemetry-progress-track">
                    <div className="telemetry-progress-fill purple" style={{ width: `${Math.min(100, Math.round(stepsRatio * 100))}%` }} />
                  </div>
                </div>

                <div className="telemetry-stat-card">
                  <div className="telemetry-card-top">
                    <span className="telemetry-card-title">⏱️ ACTIVE WORKOUT TIME</span>
                    <span className="telemetry-card-val">
                      {activeMinutes} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {timeGoal} min</span>
                    </span>
                  </div>
                  <div className="telemetry-progress-track">
                    <div className="telemetry-progress-fill lime" style={{ width: `${Math.min(100, Math.round(timeRatio * 100))}%` }} />
                  </div>
                </div>

                <div className="telemetry-stat-card">
                  <div className="telemetry-card-top">
                    <span className="telemetry-card-title">💧 HYDRATION VOLUME</span>
                    <span className="telemetry-card-val">
                      {dailyHealth?.waterMl || 1750} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {dailyHealth?.waterGoal || 2500} ml</span>
                    </span>
                  </div>
                  <div className="telemetry-progress-track">
                    <div
                      className="telemetry-progress-fill cyan"
                      style={{ width: `${Math.min(100, Math.round(((dailyHealth?.waterMl || 1750) / (dailyHealth?.waterGoal || 2500)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Log Action Buttons */}
              <div style={{ marginTop: '18px' }}>
                <span className="brand-subtitle">QUICK LOG ACTIVITY</span>
                <div className="quick-log-row">
                  <button
                    className="quick-log-btn"
                    onClick={() => {
                      logManualActivity({ type: 'steps', value: 500 });
                      triggerToast('+500 Steps Logged');
                    }}
                  >
                    👣 +500 Steps
                  </button>
                  <button
                    className="quick-log-btn"
                    onClick={() => {
                      logManualActivity({ type: 'calories', value: 100 });
                      triggerToast('+100 Kcal Logged');
                    }}
                  >
                    🔥 +100 Kcal
                  </button>
                  <button
                    className="quick-log-btn"
                    onClick={() => {
                      logManualActivity({ type: 'activeMinutes', value: 15 });
                      triggerToast('+15 Min Active Time Logged');
                    }}
                  >
                    ⏱️ +15 Min
                  </button>
                  <button
                    className="quick-log-btn"
                    onClick={() => {
                      logManualActivity({ type: 'water', value: 250 });
                      triggerToast('+250 ml Water Logged');
                    }}
                  >
                    💧 +250 ml
                  </button>
                </div>
              </div>

              {/* Configure Daily Targets */}
              <form onSubmit={handleSaveGoals} style={{ marginTop: '20px' }}>
                <span className="brand-subtitle">ADJUST DAILY TARGET GOALS</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CALORIES (Kcal)</label>
                    <input
                      type="number"
                      className="weight-input"
                      style={{ width: '100%', marginTop: '4px' }}
                      value={targetForm.caloriesGoal}
                      onChange={(e) => setTargetForm({ ...targetForm, caloriesGoal: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>STEPS</label>
                    <input
                      type="number"
                      className="weight-input"
                      style={{ width: '100%', marginTop: '4px' }}
                      value={targetForm.stepsGoal}
                      onChange={(e) => setTargetForm({ ...targetForm, stepsGoal: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ACTIVE (Min)</label>
                    <input
                      type="number"
                      className="weight-input"
                      style={{ width: '100%', marginTop: '4px' }}
                      value={targetForm.timeGoal}
                      onChange={(e) => setTargetForm({ ...targetForm, timeGoal: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '14px', width: '100%' }}>
                  SAVE DAILY TARGETS
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: PROGRAM SWITCHER MODAL ──────────────────────── */}
      {showProgramsModal && (
        <div className="ace-modal-backdrop" onClick={() => setShowProgramsModal(false)}>
          <div className="ace-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="ace-modal-header">
              <div>
                <div className="brand-subtitle">TRAINING ARCHITECTURE</div>
                <h2 className="ace-title">SELECT WORKOUT PROGRAM</h2>
              </div>
              <button className="ace-close-btn" onClick={() => setShowProgramsModal(false)}>✕</button>
            </div>

            <div className="ace-tab-pane">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...defaultSplits, ...(customSplits || [])].map((split) => {
                  const isActive = split.id === activeSplitId;
                  return (
                    <div
                      key={split.id}
                      className="telemetry-stat-card"
                      style={{
                        borderColor: isActive ? 'var(--accent)' : undefined,
                        background: isActive ? 'rgba(48, 209, 88, 0.06)' : undefined,
                      }}
                    >
                      <div className="telemetry-card-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>{split.name}</span>
                          {isActive && (
                            <span className="search-tag-chip" style={{ color: '#30D158', borderColor: '#30D158' }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {split.daysPerWeek} Days / Week
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 10px' }}>
                        {split.description}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {split.isCustom && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '11px' }}
                            onClick={() => {
                              setEditingCustomSplit(split);
                              setShowProgramsModal(false);
                              setShowCustomSplitModal(true);
                            }}
                          >
                            EDIT
                          </button>
                        )}
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: '11px' }}
                          onClick={() => {
                            setActiveSplitId(split.id);
                            setShowProgramsModal(false);
                            navigate('/workout');
                          }}
                        >
                          {isActive ? 'GO TO WORKOUT' : 'ACTIVATE PROGRAM'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer with Create Action */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Want a tailored workout schedule?</span>
                <button
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '11px' }}
                  onClick={() => {
                    setShowProgramsModal(false);
                    setEditingCustomSplit(null);
                    setShowCustomSplitModal(true);
                  }}
                >
                  ⚡ BUILD CUSTOM SPLIT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM SPLIT ARCHITECT MODAL ───────────────────────── */}
      <CustomSplitModal
        isOpen={showCustomSplitModal}
        onClose={() => setShowCustomSplitModal(false)}
        editingSplit={editingCustomSplit}
      />

      {/* ── HEALTH DATA INTEGRATION HUB (GOOGLE FIT & HEALTH CONNECT) ── */}
      <HealthConnectModal
        isOpen={showHealthConnectModal}
        onClose={() => setShowHealthConnectModal(false)}
      />

      {/* ── MODAL 4: ATHLETE PROFILE MODAL ───────────────────────── */}
      {showProfileModal && (
        <div className="ace-modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="ace-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="ace-modal-header">
              <div>
                <div className="brand-subtitle">ATHLETE DOSSIER</div>
                <h2 className="ace-title">ATHLETE PROFILE</h2>
              </div>
              <button className="ace-close-btn" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>

            <div className="ace-tab-pane">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                  }}
                >
                  🧔🏻
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>{athleteProfile?.name || 'Athlete'}</h3>
                  <p style={{ fontSize: '11px', color: 'var(--accent)' }}>
                    Level {lvl} Athlete • {currExp} XP • {streak} Day Streak 🔥
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '18px' }}>
                <div className="telemetry-stat-card">
                  <span className="telemetry-card-title">TOTAL SESSIONS LOGGED</span>
                  <span className="telemetry-card-val">{sessionHistory?.length || 0}</span>
                </div>
                <div className="telemetry-stat-card">
                  <span className="telemetry-card-title">ACTIVE STREAK</span>
                  <span className="telemetry-card-val" style={{ color: '#FF9F0A' }}>{streak} Days</span>
                </div>
              </div>

              <form onSubmit={handleSaveProfile}>
                <span className="brand-subtitle">EDIT BIOMETRIC SPECS</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>FULL NAME</label>
                    <input
                      type="text"
                      className="weight-input"
                      style={{ width: '100%', marginTop: '4px', textAlign: 'left' }}
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>BODY WEIGHT (KG)</label>
                      <input
                        type="number"
                        className="weight-input"
                        style={{ width: '100%', marginTop: '4px' }}
                        value={profileForm.weightKg}
                        onChange={(e) => setProfileForm({ ...profileForm, weightKg: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>STATURE HEIGHT (CM)</label>
                      <input
                        type="number"
                        className="weight-input"
                        style={{ width: '100%', marginTop: '4px' }}
                        value={profileForm.heightCm}
                        onChange={(e) => setProfileForm({ ...profileForm, heightCm: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '12px', width: '100%' }}>
                    SAVE ATHLETE PROFILE
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: ACE FORM REFERENCE MODAL ────────────────────── */}
      <AceReferenceModal
        exerciseKey={aceModalKey}
        isOpen={showAceModal}
        onClose={() => setShowAceModal(false)}
      />

      {/* ── MODAL 6: MOBILE HARDWARE RUN & STEP TRACKER MODAL ──────── */}
      <MobileRunTrackerModal
        isOpen={showPedometerModal}
        onClose={() => setShowPedometerModal(false)}
        isSupported={sensorSupported}
        permissionState={sensorPerm}
        isTracking={isSensorTracking}
        isSimulating={isSensorSimulating}
        motionData={motionData}
        requestSensorPermission={requestSensorPermission}
        startTracking={startSensorTracking}
        stopTracking={stopSensorTracking}
        startSimulation={startSensorSim}
        stopSimulation={stopSensorSim}
      />

      {/* ── MODAL 7: SYSTEM DEVICE PERMISSIONS MODAL ──────────────── */}
      <AppPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        requestSensorPermission={requestSensorPermission}
        startSensorTracking={startSensorTracking}
      />



      {/* ── TOAST NOTIFICATION ───────────────────────────────────── */}
      {toastMessage && (
        <div className="sync-toast-banner">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
