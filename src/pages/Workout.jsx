import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import PoseCanvas from '../features/pose/PoseCanvas';
import FormFeedback from '../features/formAnalysis/FormFeedback';
import AceReferenceModal from '../components/AceReferenceModal';
import CustomSplitModal from '../components/CustomSplitModal';
import { getJointAngles } from '../features/formAnalysis/jointAngles';
import { createRepDetector, updateRepDetector, resetRepDetector } from '../features/formAnalysis/repDetector';
import { createFormScorer, evaluateForm, resetFormScorer } from '../features/formAnalysis/formScorer';
import { speakFeedback } from '../features/formAnalysis/voiceCoach';
import exercises from '../data/exercises.json';
import aceExercises from '../data/aceExercises.json';
import defaultSplits from '../data/workoutSplits.json';
import RestTimer from '../features/workout/RestTimer';
import FatigueIndicator from '../features/analytics/FatigueIndicator';
import { calculateFatigue } from '../features/analytics/fatigueEngine';
import useWakeLock from '../features/sensors/useWakeLock';
import triggerHaptic from '../features/sensors/useHaptics';
import SetLoggerTable from '../features/workout/SetLoggerTable';
import WorkoutSummaryModal from '../components/WorkoutSummaryModal';
import { getSplitDayTitleForWorkout } from '../features/workout/splitUtils';

const ALL_EXERCISES = Object.entries(aceExercises).map(([key, val]) => ({
  key,
  title: val.title || key,
  category: val.category || 'General',
  equipment: val.equipment || 'Standard',
  difficulty: val.difficulty || 'Intermediate',
}));

export default function Workout() {
  const navigate = useNavigate();
  const {
    selectedExercise,
    setSelectedExercise,
    activeSplitId,
    setActiveSplitId,
    activeDayIndex,
    setActiveDayIndex,
    customSplits,
    deleteCustomSplit,
    getActiveSplit,
    addExerciseToCurrentDay,
    removeExerciseFromCurrentDay,
    completedDaySets,
    incrementCompletedSet,
    saveSession,
    updateMuscleFatigue,
    exercisePRs,
    sessionHistory,
    activeWorkoutSession,
    setActiveWorkoutSession,
    clearActiveWorkoutSession,
    recordCompletedWorkout,
  } = useAppStore();

  // Navigation tab in Workout view: 'plan' | 'splits' | 'library'
  const [workoutView, setWorkoutView] = useState('plan');

  // Multi-Exercise Active Workout State synchronized with Zustand (persists across navigation)
  const activeWorkoutExercises = activeWorkoutSession?.exercises || [];
  const activeExerciseKey = activeWorkoutSession?.activeExerciseKey || null;
  const completedWorkoutSets = activeWorkoutSession?.completedSets || [];
  const isCameraActive = activeWorkoutSession?.isCameraActive ?? true;
  const workoutElapsed = activeWorkoutSession?.elapsedSeconds || 0;

  const updateSession = useCallback((updater) => {
    setActiveWorkoutSession((prev) => {
      const base = prev || {
        isActive: true,
        exercises: [],
        activeExerciseKey: null,
        completedSets: [],
        isCameraActive: true,
        elapsedSeconds: 0,
      };
      if (typeof updater === 'function') {
        return updater(base);
      }
      return { ...base, ...updater };
    });
  }, [setActiveWorkoutSession]);

  const setIsCameraActive = useCallback((val) => {
    updateSession((prev) => ({
      ...prev,
      isCameraActive: typeof val === 'function' ? val(prev?.isCameraActive ?? true) : val,
    }));
  }, [updateSession]);

  // Live exercise picker modal during active workout
  const [showAddExToWorkoutModal, setShowAddExToWorkoutModal] = useState(false);
  const [workoutExSearch, setWorkoutExSearch] = useState('');
  const [workoutExCategory, setWorkoutExCategory] = useState('ALL');

  // Ongoing split quick-add exercise modal state
  const [showAddToPlanModal, setShowAddToPlanModal] = useState(false);
  const [planExSearch, setPlanExSearch] = useState('');
  const [planExCategory, setPlanExCategory] = useState('ALL');

  // Custom split modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingSplit, setEditingSplit] = useState(null);

  // ACE reference modal state
  const [showAceModal, setShowAceModal] = useState(false);
  const [aceModalKey, setAceModalKey] = useState('squat');

  // Exercise library search & filter
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Live analysis state
  const [repCount, setRepCount] = useState(0);
  const [phase, setPhase] = useState('IDLE');
  const [velocity, setVelocity] = useState(0);
  const [formScore, setFormScore] = useState(100);
  const [formErrors, setFormErrors] = useState([]);
  const [primaryAngle, setPrimaryAngle] = useState(null);

  // Fatigue tracking state
  const [repVelocities, setRepVelocities] = useState([]);
  const [currentFatigue, setCurrentFatigue] = useState(null);

  // Rest timer state
  const [isResting, setIsResting] = useState(false);
  const [restRemaining, setRestRemaining] = useState(90);
  const [restDuration, setRestDuration] = useState(90);
  const restTimerRef = useRef(null);

  // Hevy Active Workout State (Summary Modal)
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Viewport / Orientation detector (Landscape vs Portrait)
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > window.innerHeight && window.innerWidth >= 860;
  });

  useEffect(() => {
    const updateOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight && window.innerWidth >= 860;
      setIsLandscape(landscape);
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  // Stopwatch timer during active workout
  useEffect(() => {
    if (!activeWorkoutSession?.isActive || activeWorkoutExercises.length === 0) return;
    const interval = setInterval(() => {
      setActiveWorkoutSession((prev) =>
        prev ? { ...prev, elapsedSeconds: (prev.elapsedSeconds || 0) + 1 } : null
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkoutSession?.isActive, activeWorkoutExercises.length, setActiveWorkoutSession]);

  const formatStopwatch = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Detector + scorer refs
  const detectorRef = useRef(null);
  const scorerRef = useRef(null);

  // Keep screen awake during workouts (Samsung & mobile device optimization)
  useWakeLock(activeWorkoutExercises.length > 0);

  // Active Split & Day
  const currentSplit = getActiveSplit();
  const currentDays = currentSplit?.days || [];
  const currentDay = currentDays[activeDayIndex] || currentDays[0] || { name: 'Day 1', exercises: [] };

  // ── Helper to build session exercise data structure ────────────
  const buildExerciseSessionData = useCallback((key, defaultWeight = 20, defaultReps = 10, defaultSets = 3) => {
    const aceInfo = aceExercises[key] || {};
    const exDef = exercises[key] || {};
    const prevRecord = sessionHistory?.filter((s) => s.exercise === key).slice(-1)[0];
    const w = defaultWeight ? Number(defaultWeight) : (prevRecord ? Number(prevRecord.weight) : 20);
    const r = defaultReps ? Number(defaultReps) : (prevRecord ? Number(prevRecord.reps) : 10);
    const prevStr = prevRecord ? `${prevRecord.weight} kg × ${prevRecord.reps}` : `${w} kg × ${r}`;

    const numSets = Number(defaultSets) || 3;
    const initialSets = Array.from({ length: numSets }, (_, i) => ({
      setNumber: i + 1,
      prev: prevStr,
      weight: w,
      reps: r,
      completed: false,
    }));

    return {
      exerciseKey: key,
      title: aceInfo.title || exDef.display || key,
      category: aceInfo.category || exDef.category || 'General',
      equipment: aceInfo.equipment || exDef.equipment || 'Standard',
      targetSets: numSets,
      targetReps: r,
      targetWeight: w,
      restSeconds: 90,
      sets: initialSets,
    };
  }, [sessionHistory]);

  // ── Switch Active Camera Tracking to Another Exercise ──────────
  const switchActiveExercise = useCallback((key) => {
    updateSession({ activeExerciseKey: key });
    setSelectedExercise(key);

    const exDef = exercises[key] || {
      primaryJoint: 'knee',
      landmarks: { A: 23, B: 25, C: 27 },
      repPhase: { down: 90, up: 165 },
      formChecks: {}
    };

    detectorRef.current = createRepDetector(exDef.repPhase);
    scorerRef.current = createFormScorer(exDef);
    setRepCount(0);
    setPhase('IDLE');
    setVelocity(0);
    setFormScore(100);
    setFormErrors([]);
    setPrimaryAngle(null);
    setRepVelocities([]);
    setCurrentFatigue(null);
    speakFeedback(`Tracking ${aceExercises[key]?.title || exDef.display || key}`, true);
    triggerHaptic('light');
  }, [setSelectedExercise, updateSession]);

  // ── Start a multi-exercise live workout session ────────────────
  const handleStartWorkout = useCallback((exerciseList, initialKey = null, splitContext = null) => {
    if (!exerciseList || exerciseList.length === 0) return;
    const firstKey = initialKey || exerciseList[0].exerciseKey;
    const resolvedDayName =
      splitContext?.dayName ||
      currentDay?.name ||
      getSplitDayTitleForWorkout({ exercises: exerciseList }, currentSplit, customSplits);
    const resolvedSplitName = splitContext?.splitName || currentSplit?.name;

    setActiveWorkoutSession({
      isActive: true,
      exercises: exerciseList,
      activeExerciseKey: firstKey,
      completedSets: [],
      isCameraActive: true,
      elapsedSeconds: 0,
      splitName: resolvedSplitName,
      splitDayName: resolvedDayName,
      splitDayNumber: splitContext?.dayNumber || currentDay?.dayNumber || (activeDayIndex + 1),
    });
    setSelectedExercise(firstKey);

    const exDef = exercises[firstKey] || {
      primaryJoint: 'knee',
      landmarks: { A: 23, B: 25, C: 27 },
      repPhase: { down: 90, up: 165 },
      formChecks: {}
    };
    detectorRef.current = createRepDetector(exDef.repPhase);
    scorerRef.current = createFormScorer(exDef);
    setRepCount(0);
    setPhase('IDLE');
    setVelocity(0);
    setFormScore(100);
    setFormErrors([]);
    setPrimaryAngle(null);
    setRepVelocities([]);
    setCurrentFatigue(null);
    setIsResting(false);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
  }, [setSelectedExercise, setActiveWorkoutSession, currentDay?.name, currentDay?.dayNumber, currentSplit, customSplits, activeDayIndex]);

  // ── Add an exercise to active workout on the fly ───────────────
  const handleAddExerciseToWorkout = useCallback((key) => {
    const newEx = buildExerciseSessionData(key);
    updateSession((prev) => ({
      ...prev,
      exercises: [...(prev.exercises || []), newEx],
      activeExerciseKey: key,
    }));
    setShowAddExToWorkoutModal(false);
    setWorkoutExSearch('');
    triggerHaptic('medium');
    switchActiveExercise(key);
  }, [buildExerciseSessionData, switchActiveExercise, updateSession]);

  // Compatibility: if selectedExercise was set from external page
  useEffect(() => {
    if (!selectedExercise) return;
    if (!activeWorkoutSession || activeWorkoutExercises.length === 0) {
      const initial = buildExerciseSessionData(selectedExercise);
      handleStartWorkout([initial], selectedExercise);
    } else if (activeWorkoutSession?.isActive && activeWorkoutExercises.length > 0) {
      const exists = activeWorkoutExercises.some((e) => e.exerciseKey === selectedExercise);
      if (exists) {
        if (activeExerciseKey !== selectedExercise) {
          switchActiveExercise(selectedExercise);
        }
      } else {
        handleAddExerciseToWorkout(selectedExercise);
      }
    }
  }, [selectedExercise, activeWorkoutSession?.isActive, activeWorkoutExercises.length]);

  // Re-establish pose detector on mount/switch if active session already exists
  useEffect(() => {
    if (activeExerciseKey && !detectorRef.current) {
      const exDef = exercises[activeExerciseKey] || {
        primaryJoint: 'knee',
        landmarks: { A: 23, B: 25, C: 27 },
        repPhase: { down: 90, up: 165 },
        formChecks: {}
      };
      detectorRef.current = createRepDetector(exDef.repPhase);
      scorerRef.current = createFormScorer(exDef);
    }
  }, [activeExerciseKey]);

  // ── Remove an exercise from active workout ─────────────────────
  const handleRemoveExerciseFromWorkout = useCallback((key) => {
    updateSession((prev) => {
      const remaining = (prev.exercises || []).filter((e) => e.exerciseKey !== key);
      let nextActive = prev.activeExerciseKey;
      if (prev.activeExerciseKey === key) {
        if (remaining.length > 0) {
          nextActive = remaining[0].exerciseKey;
          switchActiveExercise(remaining[0].exerciseKey);
        } else {
          nextActive = null;
          setSelectedExercise(null);
        }
      }
      return {
        ...prev,
        exercises: remaining,
        activeExerciseKey: nextActive,
        isActive: remaining.length > 0,
      };
    });
    triggerHaptic('light');
  }, [activeExerciseKey, switchActiveExercise, setSelectedExercise, updateSession]);

  // ── Update field in an exercise set ────────────────────────────
  const handleUpdateExerciseSetField = useCallback((exKey, setIndex, field, val) => {
    updateSession((prev) => ({
      ...prev,
      exercises: (prev.exercises || []).map((ex) => {
        if (ex.exerciseKey !== exKey) return ex;
        const updated = ex.sets.map((s, i) => (i === setIndex ? { ...s, [field]: val } : s));
        return { ...ex, sets: updated };
      }),
    }));
  }, [updateSession]);

  // ── Add set to an exercise ────────────────────────────────────
  const handleAddSetToExercise = useCallback((exKey) => {
    updateSession((prev) => ({
      ...prev,
      exercises: (prev.exercises || []).map((ex) => {
        if (ex.exerciseKey !== exKey) return ex;
        const last = ex.sets[ex.sets.length - 1] || { weight: 20, reps: 10 };
        const newSet = {
          setNumber: ex.sets.length + 1,
          prev: `${last.weight} kg × ${last.reps}`,
          weight: last.weight,
          reps: last.reps,
          completed: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }),
    }));
  }, [updateSession]);

  // ── Per-frame landmark callback from PoseCanvas ─────────────────
  const handleLandmarks = useCallback((landmarks, now = performance.now()) => {
    if (!activeExerciseKey) return null;
    const exDef = exercises[activeExerciseKey] || {
      primaryJoint: 'knee',
      landmarks: { A: 23, B: 25, C: 27 },
      repPhase: { down: 90, up: 165 },
      formChecks: {}
    };
    if (!detectorRef.current || !scorerRef.current) return null;

    const angles = getJointAngles(landmarks, exDef);
    if (!angles?.primaryAngle) return null;

    setPrimaryAngle(angles.primaryAngle);

    const repResult = updateRepDetector(detectorRef.current, angles.primaryAngle, now);
    setRepCount(repResult.repCount);
    setPhase(repResult.phase);
    setVelocity(repResult.velocity);

    if (repResult.repComplete) {
      speakFeedback(`Rep ${repResult.repCount}`, true);
      triggerHaptic('medium');
      if (repResult.velocity > 0) {
        setRepVelocities((prev) => {
          const updated = [...prev, repResult.velocity];
          const fatigue = calculateFatigue(updated);
          setCurrentFatigue(fatigue);
          return updated;
        });
      }
    }

    const formResult = evaluateForm(scorerRef.current, landmarks);
    setFormScore(formResult.score);
    setFormErrors(formResult.activeErrors);

    if (formResult.hasViolation && formResult.activeErrors.length > 0) {
      speakFeedback(formResult.activeErrors[0]);
      triggerHaptic('heavy');
    }

    return {
      primaryAngle: angles.primaryAngle,
      primaryJointIndex: exDef.landmarks?.B || null,
      hasViolation: formResult.hasViolation,
      formScore: formResult.score,
      activeErrors: formResult.activeErrors
    };
  }, [activeExerciseKey]);

  // ── Complete a set for an exercise (Live HUD & Manual Sync) ────
  const handleCompleteSetForExercise = useCallback((exKey, override = null) => {
    const currentEx = activeWorkoutExercises.find((e) => e.exerciseKey === exKey);
    if (!currentEx) return;

    const isCurrentActive = exKey === activeExerciseKey;
    const uncompletedIdx = currentEx.sets.findIndex((s) => !s.completed);
    const activeSetNum = override?.setNumber || (uncompletedIdx !== -1 ? uncompletedIdx + 1 : currentEx.sets.length);
    const targetRow = currentEx.sets.find((s) => s.setNumber === activeSetNum) || currentEx.sets[0];

    // Priority: live camera reps if active and counted > 0, else override, else table input
    const completedReps = override?.reps != null
      ? Number(override.reps)
      : (isCurrentActive && isCameraActive && repCount > 0 ? repCount : (Number(targetRow?.reps) || 10));

    const completedWeight = override?.weight != null
      ? Number(override.weight)
      : (parseFloat(targetRow?.weight) || 20);

    const setVolume = completedWeight * completedReps;

    let prevVelocities = [];
    if (isCurrentActive && detectorRef.current && scorerRef.current) {
      prevVelocities = resetRepDetector(detectorRef.current);
      resetFormScorer(scorerRef.current);
    }

    const setRecord = {
      date: new Date().toISOString().slice(0, 10),
      exercise: exKey,
      exerciseTitle: currentEx.title,
      setNumber: activeSetNum,
      reps: completedReps,
      weight: completedWeight,
      volume: setVolume,
      velocities: repVelocities.length > 0 ? repVelocities : prevVelocities,
      formScore: isCurrentActive ? formScore : 100,
      timestamp: Date.now()
    };

    saveSession(setRecord);

    // Update active workout session in Zustand store
    updateSession((prev) => ({
      ...prev,
      completedSets: [...(prev.completedSets || []), setRecord],
      exercises: (prev.exercises || []).map((ex) => {
        if (ex.exerciseKey !== exKey) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) =>
            s.setNumber === activeSetNum
              ? { ...s, reps: completedReps, weight: completedWeight, completed: true }
              : s
          )
        };
      })
    }));

    // Increment completed set counter for plan
    incrementCompletedSet(exKey);

    // Update muscle fatigue map
    const mapped = (aceExercises[exKey]?.category || exercises[exKey]?.category || '').toLowerCase();
    if (mapped.includes('chest') || exKey === 'pushup') {
      updateMuscleFatigue({ chest: 'HIGH', triceps: 'MODERATE' });
    } else if (mapped.includes('leg') || exKey === 'squat' || exKey === 'lunge') {
      updateMuscleFatigue({ quadriceps: 'HIGH', glutes: 'HIGH', hamstrings: 'MODERATE' });
    } else if (mapped.includes('back') || exKey === 'deadlift') {
      updateMuscleFatigue({ lowerBack: 'HIGH', hamstrings: 'HIGH', traps: 'MODERATE' });
    } else if (mapped.includes('shoulder') || exKey === 'shoulderPress') {
      updateMuscleFatigue({ shoulders: 'HIGH', triceps: 'MODERATE' });
    } else if (mapped.includes('arm') || exKey === 'bicepCurl') {
      updateMuscleFatigue({ biceps: 'HIGH', forearms: 'MODERATE' });
    }

    if (isCurrentActive) {
      setRepCount(0);
      setPhase('IDLE');
      setVelocity(0);
      setFormScore(100);
      setFormErrors([]);
      setRepVelocities([]);
      setCurrentFatigue(null);
    }

    triggerHaptic('medium');
    speakFeedback(`Set ${activeSetNum} completed`, true);

    // Start rest timer
    const restSecs = currentEx.restSeconds || 90;
    setRestDuration(restSecs);
    setRestRemaining(restSecs);
    setIsResting(true);

    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(restTimerRef.current);
          setIsResting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [
    activeWorkoutExercises,
    activeExerciseKey,
    isCameraActive,
    repCount,
    repVelocities,
    formScore,
    saveSession,
    updateSession,
    incrementCompletedSet,
    updateMuscleFatigue
  ]);

  // ── Toggle set checkbox in table ──────────────────────────────
  const handleToggleExerciseSet = useCallback((exKey, setInfo) => {
    if (setInfo.isCompleted) {
      handleCompleteSetForExercise(exKey, setInfo);
    } else {
      updateSession((prev) => ({
        ...prev,
        exercises: (prev.exercises || []).map((ex) => {
          if (ex.exerciseKey !== exKey) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s) => (s.setNumber === setInfo.setNumber ? { ...s, completed: false } : s))
          };
        }),
        completedSets: (prev.completedSets || []).filter(
          (s) => !(s.exercise === exKey && s.setNumber === setInfo.setNumber)
        ),
      }));
    }
  }, [handleCompleteSetForExercise, updateSession]);

  // ── Attempt to finish workout with validation ──────────────────
  const handleAttemptFinishWorkout = useCallback(() => {
    const allCompleted = activeWorkoutExercises.flatMap((ex) =>
      ex.sets
        .filter((s) => s.completed)
        .map((s) => ({
          ...s,
          exercise: ex.exerciseKey,
          exerciseTitle: ex.title,
          volume: (Number(s.weight) || 0) * (Number(s.reps) || 0),
        }))
    );

    if (allCompleted.length === 0) {
      alert('Please complete at least one set before finishing your workout.');
      return;
    }

    updateSession((prev) => ({ ...prev, completedSets: allCompleted }));
    setShowSummaryModal(true);
  }, [activeWorkoutExercises, updateSession]);

  // ── Conclude workout session ──────────────────────────────────
  const handleConcludeWorkoutSession = useCallback(() => {
    setShowSummaryModal(false);
    clearActiveWorkoutSession();
    setSelectedExercise(null);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setIsResting(false);
    navigate('/profile?tab=activity');
  }, [setSelectedExercise, clearActiveWorkoutSession, navigate]);

  // ── Cancel active workout session ─────────────────────────────
  const handleCancelWorkoutSession = useCallback(() => {
    if (window.confirm('Cancel this workout session? Unsaved progress will be discarded.')) {
      clearActiveWorkoutSession();
      setSelectedExercise(null);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      setIsResting(false);
    }
  }, [setSelectedExercise, clearActiveWorkoutSession]);

  const handleSkipRest = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setIsResting(false);
    setRestRemaining(0);
  }, []);

  const handleAddRest30 = useCallback(() => {
    setRestRemaining((r) => r + 30);
    setRestDuration((d) => d + 30);
  }, []);

  // All splits list (pre-built + custom)
  const allSplits = [...defaultSplits, ...customSplits];

  // Filtered exercises for the library view & modals
  const libraryCategories = ['ALL', ...new Set(ALL_EXERCISES.map((e) => e.category))];
  const filteredLibrary = ALL_EXERCISES.filter((ex) => {
    const matchSearch =
      ex.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      ex.category.toLowerCase().includes(librarySearch.toLowerCase()) ||
      ex.equipment.toLowerCase().includes(librarySearch.toLowerCase());
    const matchCat = selectedCategory === 'ALL' || ex.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // ────────────────────────────────────────────────────────────────
  // VIEW 1: ACTIVE LIVE WORKOUT STUDIO (LEFT: CAMERA HUD, RIGHT: EXERCISES)
  // ────────────────────────────────────────────────────────────────
  if (activeWorkoutExercises.length > 0) {
    const activeExData =
      activeWorkoutExercises.find((e) => e.exerciseKey === activeExerciseKey) ||
      activeWorkoutExercises[0] ||
      {};
    const activeExIndex = activeWorkoutExercises.findIndex((e) => e.exerciseKey === activeExerciseKey);
    const trackedUncompletedIdx = activeExData.sets?.findIndex((s) => !s.completed);
    const trackedActiveSetNum = trackedUncompletedIdx !== -1 && trackedUncompletedIdx != null
      ? trackedUncompletedIdx + 1
      : (activeExData.sets?.length || 1);
    const trackedCompletedSets = activeExData.sets?.filter((s) => s.completed).length || 0;

    return (
      <div className={`page-workout is-studio-active ${isLandscape ? 'mode-landscape' : 'mode-portrait'}`}>
        <div className="app-card studio-app-card">
          {/* Header with Stopwatch, Orientation Badge, Camera Toggle & Finish Button */}
          <header className="app-header active-workout-top-bar">
            <div className="brand">
              <span className="brand-dot" />
              <div>
                <div className="brand-name">LIVE WORKOUT STUDIO</div>
                <div className="brand-subtitle">
                  EXERCISE {Math.max(1, activeExIndex + 1)} OF {activeWorkoutExercises.length} • {activeExData.title?.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Live Stopwatch Center Badge & Responsive Orientation Indicator */}
            <div className="workout-top-center-group">
              <div className="workout-stopwatch-badge">
                <span className="stopwatch-icon">⏱</span>
                <span className="stopwatch-digits">{formatStopwatch(workoutElapsed)}</span>
              </div>
              <span className={`studio-orientation-tag ${isLandscape ? 'tag-landscape' : 'tag-portrait'}`}>
                {isLandscape ? '⤢ LANDSCAPE STUDIO' : '📱 PORTRAIT STUDIO'}
              </span>
            </div>

            <div className="header-actions">
              <button
                type="button"
                className={`btn-secondary ${isCameraActive ? 'active' : ''}`}
                style={{ fontSize: '10px', padding: '6px 10px' }}
                onClick={() => setIsCameraActive(!isCameraActive)}
                title="Toggle AI Pose Camera Tracking"
              >
                📹 {isCameraActive ? 'HIDE CAMERA' : 'CAMERA TRACK'}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '10px', padding: '6px 14px' }}
                onClick={handleAttemptFinishWorkout}
              >
                FINISH WORKOUT
              </button>
              <button
                type="button"
                className="btn-danger-subtle"
                style={{ fontSize: '10px', padding: '6px 10px' }}
                onClick={handleCancelWorkoutSession}
              >
                CANCEL
              </button>
            </div>
          </header>

          {/* ACE Reference Modal */}
          <AceReferenceModal
            exerciseKey={aceModalKey}
            isOpen={showAceModal}
            onClose={() => setShowAceModal(false)}
          />

          {/* ══ TWO-COLUMN STUDIO GRID: LEFT HUD + RIGHT EXERCISES ══ */}
          <div className={`workout-studio-grid ${isLandscape ? 'is-landscape' : 'is-portrait'}`}>
            {/* ── LEFT COLUMN: CAMERA HUD & KINEMATICS ── */}
            <div className="studio-left-hud">
              {/* Active Exercise Tracking Indicator Pill */}
              <div className="studio-tracking-pill">
                <div className="tracking-label-row">
                  <span className="tracking-pulse-dot" />
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      CAMERA HUD • TRACKING
                    </div>
                    <div className="tracking-exercise-title">
                      {activeExData.title?.toUpperCase() || activeExerciseKey?.toUpperCase()}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                  onClick={() => {
                    setAceModalKey(activeExerciseKey);
                    setShowAceModal(true);
                  }}
                >
                  FORM GUIDE
                </button>
              </div>

              {/* Camera + Live Pose Canvas HUD (when camera toggle is active) */}
              {isCameraActive ? (
                <>
                  <div className="studio-canvas-wrap">
                    <PoseCanvas
                      onLandmarks={handleLandmarks}
                      liveStats={{
                        formScore,
                        repCount,
                        phase,
                        activeErrors: formErrors,
                        primaryAngle
                      }}
                    />
                  </div>

                  <FormFeedback
                    errors={formErrors}
                    score={formScore}
                    repCount={repCount}
                    phase={phase}
                  />
                </>
              ) : (
                <div className="camera-standby-card">
                  <div className="camera-standby-icon">📹</div>
                  <div className="camera-standby-title">CAMERA STANDBY</div>
                  <p className="camera-standby-desc">
                    Turn on camera tracking to enable real-time kinematic pose analysis and live rep logging.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '11px', padding: '8px 16px' }}
                    onClick={() => setIsCameraActive(true)}
                  >
                    START CAMERA TRACKING
                  </button>
                </div>
              )}

              {/* Live Metrics Row */}
              <div className="hud-metrics-row">
                <div className="metric-block">
                  <span className="metric-label">REPETITIONS</span>
                  <div className="metric-value-clean" style={{ color: 'var(--accent)' }}>
                    {repCount}
                  </div>
                  <span className="metric-caption">ACTIVE COUNT</span>
                </div>
                <div className="metric-block">
                  <span className="metric-label">ACTIVE SET</span>
                  <div className="metric-value-clean">
                    {trackedActiveSetNum} / {activeExData.sets?.length || 3}
                  </div>
                  <span className="metric-caption">{trackedCompletedSets} COMPLETED</span>
                </div>
                <div className="metric-block">
                  <span className="metric-label">CONCENTRIC VELOCITY</span>
                  <div className="metric-value-clean" style={{ color: 'var(--accent-secondary)' }}>
                    {velocity > 0 ? `${velocity}°/s` : '—'}
                  </div>
                  <span className="metric-caption">EXPLOSIVENESS</span>
                </div>
                <div className="metric-block">
                  <span className="metric-label">FORM ACCURACY</span>
                  <div
                    className="metric-value-clean"
                    style={{
                      color:
                        formScore >= 80 ? 'var(--success)' : formScore >= 60 ? 'var(--warning)' : 'var(--danger)',
                    }}
                  >
                    {formScore}%
                  </div>
                  <span className="metric-caption">KINEMATIC SCORE</span>
                </div>
              </div>

              {/* Quick Set Complete Action for Active Tracked Exercise */}
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '11px', letterSpacing: '0.06em' }}
                onClick={() => handleCompleteSetForExercise(activeExerciseKey)}
              >
                ✓ COMPLETE SET {trackedActiveSetNum} ({activeExData.title?.toUpperCase()})
              </button>

              {/* Real-time Fatigue Indicator */}
              <FatigueIndicator fatigue={currentFatigue} />

              {/* Recovery Rest Timer Overlay / Block */}
              {isResting && (
                <RestTimer
                  restRemaining={restRemaining}
                  restDuration={restDuration}
                  exerciseKey={activeExerciseKey}
                  onSkip={handleSkipRest}
                  onAdd30={handleAddRest30}
                />
              )}
            </div>

            {/* ── RIGHT COLUMN: EXERCISE LIST WITH MANUAL LOGGERS ── */}
            <div className="studio-right-exercises">
              <div className="studio-exercises-header">
                <h3 className="studio-header-title">
                  WORKOUT EXERCISES ({activeWorkoutExercises.length})
                </h3>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '10px', padding: '6px 12px' }}
                  onClick={() => setShowAddExToWorkoutModal(true)}
                >
                  + ADD EXERCISE
                </button>
              </div>

              {/* Exercise Cards */}
              {activeWorkoutExercises.map((ex, exIdx) => {
                const isThisTracked = ex.exerciseKey === activeExerciseKey;
                const uncompletedIdx = ex.sets.findIndex((s) => !s.completed);
                const resolvedActiveIndex = uncompletedIdx === -1 ? ex.sets.length - 1 : uncompletedIdx;

                return (
                  <div
                    key={`${ex.exerciseKey}_${exIdx}`}
                    className={`studio-exercise-card ${isThisTracked ? 'is-active-tracking' : ''}`}
                    onClick={() => {
                      if (!isThisTracked) switchActiveExercise(ex.exerciseKey);
                    }}
                    style={{ cursor: isThisTracked ? 'default' : 'pointer' }}
                  >
                    <div className="studio-ex-header">
                      <div className="studio-ex-title-wrap">
                        <h4 className="studio-ex-title">{ex.title.toUpperCase()}</h4>
                        <div className="studio-ex-badges">
                          <span className="studio-ex-tag">{ex.category?.toUpperCase()}</span>
                          <span className="studio-ex-tag">{ex.equipment?.toUpperCase()}</span>
                          {isThisTracked ? (
                            <span className="live-camera-tag active-pulse">
                              📹 TRACKING LIVE
                            </span>
                          ) : (
                            <span className="studio-ex-tag" style={{ color: 'var(--accent, #158FF2)', borderColor: 'rgba(21,143,242,0.3)' }}>
                              👆 TAP TO TRACK
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="studio-ex-actions">
                        {!isThisTracked ? (
                          <button
                            type="button"
                            className="btn-track-switch"
                            onClick={(e) => {
                              e.stopPropagation();
                              switchActiveExercise(ex.exerciseKey);
                            }}
                            title="Switch Camera Pose Tracking to this exercise"
                          >
                            📹 TRACK WITH CAMERA
                          </button>
                        ) : (
                          <span className="btn-track-active">
                            ✓ TRACKED BY CAMERA
                          </span>
                        )}

                        <button
                          type="button"
                          className="btn-remove-ex"
                          title="Remove exercise from workout"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveExerciseFromWorkout(ex.exerciseKey);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Exercise-Specific Manual Set Logger Table */}
                    <SetLoggerTable
                      exerciseKey={ex.exerciseKey}
                      exerciseName={ex.title}
                      targetSets={ex.targetSets}
                      targetWeight={ex.targetWeight}
                      targetReps={ex.targetReps}
                      workoutSets={ex.sets}
                      activeSetIndex={resolvedActiveIndex}
                      liveReps={isThisTracked ? repCount : 0}
                      isCameraActive={isThisTracked && isCameraActive}
                      hideHeader={true}
                      onUpdateSetField={(setIdx, field, val) =>
                        handleUpdateExerciseSetField(ex.exerciseKey, setIdx, field, val)
                      }
                      onCompleteSet={(setInfo) =>
                        handleToggleExerciseSet(ex.exerciseKey, setInfo)
                      }
                      onAddSet={() => handleAddSetToExercise(ex.exerciseKey)}
                      onLaunchCamera={() => {
                        if (!isThisTracked) switchActiveExercise(ex.exerciseKey);
                        setIsCameraActive(true);
                      }}
                      onInteract={() => {
                        if (!isThisTracked) switchActiveExercise(ex.exerciseKey);
                      }}
                    />
                  </div>
                );
              })}

              {/* Dashed Add Exercise Button */}
              <button
                type="button"
                className="btn-dashed-add-studio"
                onClick={() => setShowAddExToWorkoutModal(true)}
              >
                + ADD EXERCISE TO THIS WORKOUT
              </button>

              {/* Bottom Finish Bar */}
              <div className="studio-finish-bar">
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px', fontSize: '11px', letterSpacing: '0.06em' }}
                  onClick={handleAttemptFinishWorkout}
                >
                  FINISH WORKOUT SESSION
                </button>
                <button
                  type="button"
                  className="btn-danger-subtle"
                  style={{ flex: 1, padding: '12px', fontSize: '11px' }}
                  onClick={handleCancelWorkoutSession}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>

          {/* Workout Summary Modal (Screen 27 Celebration) */}
          {(() => {
            const allSets = completedWorkoutSets.length > 0
              ? completedWorkoutSets
              : activeWorkoutExercises.flatMap((ex) =>
                  ex.sets.filter((s) => s.completed).map((s) => ({
                    ...s,
                    exercise: ex.exerciseKey,
                    volume: (Number(s.weight) || 0) * (Number(s.reps) || 0),
                  }))
                );

            const totalSessionVolume = allSets.reduce((acc, s) => acc + (s.volume || 0), 0);
            const totalSessionSets = allSets.length;
            const totalSessionReps = allSets.reduce((acc, s) => acc + (Number(s.reps) || 0), 0);
            const avgForm = allSets.length > 0
              ? Math.round(allSets.reduce((acc, s) => acc + (s.formScore || 100), 0) / allSets.length)
              : Math.round(formScore);

            // Compute PRs across exercises
            let prCount = 0;
            const prNotes = [];
            allSets.forEach((s) => {
              const currentPR = exercisePRs?.[s.exercise] || { maxWeight: 0 };
              if (s.weight > (currentPR.maxWeight || 0)) {
                prCount += 1;
                prNotes.push(`${s.exerciseTitle || s.exercise}: ${s.weight} kg`);
              }
            });

            const exSummaryList = activeWorkoutExercises.map((ex) => {
              const exSets = allSets.filter((s) => s.exercise === ex.exerciseKey);
              const bestW = exSets.reduce((max, s) => Math.max(max, Number(s.weight) || 0), 0);
              const exVol = exSets.reduce((acc, s) => acc + (s.volume || 0), 0);
              const curPR = exercisePRs?.[ex.exerciseKey] || { maxWeight: 0 };
              return {
                key: ex.exerciseKey,
                title: ex.title,
                setsCount: exSets.length,
                bestWeight: bestW,
                volume: exVol,
                isPR: bestW > (curPR.maxWeight || 0),
              };
            });

            return (
              <WorkoutSummaryModal
                isOpen={showSummaryModal}
                onClose={handleConcludeWorkoutSession}
                workoutData={{
                  title:
                    activeWorkoutSession?.splitDayName ||
                    currentDay?.name ||
                    getSplitDayTitleForWorkout({ exercises: activeWorkoutExercises }, currentSplit, customSplits),
                  splitDayName:
                    activeWorkoutSession?.splitDayName ||
                    currentDay?.name ||
                    getSplitDayTitleForWorkout({ exercises: activeWorkoutExercises }, currentSplit, customSplits),
                  duration: formatStopwatch(workoutElapsed),
                  durationSec: workoutElapsed,
                  volumeKg: totalSessionVolume,
                  setsCount: totalSessionSets,
                  repsCount: totalSessionReps,
                  prsCount: prCount,
                  prDetails: prNotes.length > 0 ? `New Personal Record: ${prNotes.join(', ')}` : null,
                  prList: prNotes,
                  exercises: exSummaryList,
                  formScore: avgForm,
                }}
                onShareToFeed={handleConcludeWorkoutSession}
              />
            );
          })()}

          {/* Modal to Add Exercise During Live Workout */}
          {showAddExToWorkoutModal && (
            <div className="ace-modal-backdrop" onClick={() => setShowAddExToWorkoutModal(false)}>
              <div className="ace-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="ace-modal-header">
                  <div>
                    <div className="brand-subtitle">ACTIVE SESSION</div>
                    <h3 className="ace-title">ADD EXERCISE TO WORKOUT</h3>
                  </div>
                  <button
                    type="button"
                    className="ace-close-btn"
                    onClick={() => setShowAddExToWorkoutModal(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="picker-search-bar">
                  <input
                    type="text"
                    className="clean-search-input"
                    placeholder="Search 80+ exercises..."
                    value={workoutExSearch}
                    onChange={(e) => setWorkoutExSearch(e.target.value)}
                    autoFocus
                  />
                  <div className="category-filter-chips" style={{ marginTop: '10px' }}>
                    {libraryCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`cat-chip-clean ${workoutExCategory === cat ? 'active' : ''}`}
                        onClick={() => setWorkoutExCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="picker-exercise-list">
                  {ALL_EXERCISES
                    .filter((e) => {
                      const matchQ =
                        e.title.toLowerCase().includes(workoutExSearch.toLowerCase()) ||
                        e.category.toLowerCase().includes(workoutExSearch.toLowerCase());
                      const matchC = workoutExCategory === 'ALL' || e.category === workoutExCategory;
                      return matchQ && matchC;
                    })
                    .map((ex) => (
                      <div
                        key={ex.key}
                        className="picker-exercise-item"
                        onClick={() => handleAddExerciseToWorkout(ex.key)}
                      >
                        <div>
                          <div className="picker-ex-title">{ex.title}</div>
                          <div className="picker-ex-meta">
                            <span className="item-tag-clean">{ex.category}</span>
                            <span className="item-tag-clean muted">{ex.equipment}</span>
                          </div>
                        </div>
                        <span className="btn-secondary" style={{ pointerEvents: 'none' }}>+ ADD</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // VIEW 2: WORKOUT HUB (PLAN, SPLITS, 80+ ACE LIBRARY)
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="page-workout">
      <div className="app-card">
        {/* Brand Header */}
        <header className="app-header">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <div className="brand-name">WORKOUT</div>
              <div className="brand-subtitle">{currentSplit?.name?.toUpperCase()}</div>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setEditingSplit(null);
                setShowCustomModal(true);
              }}
            >
              + CUSTOM SPLIT
            </button>
          </div>
        </header>

        {/* Quick Start Empty Workout (Hevy Screen 11) */}
        <div className="empty-workout-cta-card">
          <div className="empty-workout-info">
            <span className="brand-subtitle">QUICK WORKOUT</span>
            <h3 className="empty-workout-title">START AN EMPTY WORKOUT</h3>
            <p className="empty-workout-desc">Log sets, track live velocity &amp; analyze biomechanics on the fly.</p>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '10px 18px', fontSize: '11px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}
            onClick={() => handleStartWorkout([buildExerciseSessionData('bench-press', 60, 10, 3)], 'bench-press')}
          >
            + START EMPTY WORKOUT
          </button>
        </div>

        {/* Hero Athletic Banner matching Screen 2 of Reference Mockup */}
        <div className="workout-hero-banner">
          <div className="workout-hero-img-overlay" />
          <div className="workout-hero-inner">
            <div className="workout-hero-tag">FEATURED WORKOUT</div>
            <h2 className="workout-hero-title">Workout</h2>
            <p className="workout-hero-desc">{currentDay?.name} • {currentSplit?.name}</p>
          </div>
          <button
            className="workout-hero-play-btn"
            title="Start Today's Workout"
            onClick={() => {
              if (currentDay.exercises?.length > 0) {
                const sessionExs = currentDay.exercises.map((ex) =>
                  buildExerciseSessionData(ex.exerciseKey, ex.targetWeight, ex.targetReps, ex.targetSets)
                );
                handleStartWorkout(sessionExs, sessionExs[0].exerciseKey);
              }
            }}
          >
            ▶
          </button>
        </div>

        {/* Minimal Navigation Tabs */}
        <div className="workout-nav-tabs-clean">
          <button
            className={`tab-item-clean ${workoutView === 'plan' ? 'active' : ''}`}
            onClick={() => setWorkoutView('plan')}
          >
            TODAY'S PLAN
          </button>
          <button
            className={`tab-item-clean ${workoutView === 'splits' ? 'active' : ''}`}
            onClick={() => setWorkoutView('splits')}
          >
            ALL SPLITS ({allSplits.length})
          </button>
          <button
            className={`tab-item-clean ${workoutView === 'library' ? 'active' : ''}`}
            onClick={() => setWorkoutView('library')}
          >
            EXERCISE LIBRARY ({ALL_EXERCISES.length})
          </button>
        </div>

        {/* ── TAB 1: TODAY'S DAY-WISE PLAN ── */}
        {workoutView === 'plan' && (
          <div className="workout-plan-pane">
            {/* Horizontal Day Selector */}
            <div className="horizontal-day-selector">
              {currentDays.map((day, idx) => {
                const isSelected = idx === activeDayIndex;
                return (
                  <button
                    key={idx}
                    className={`day-selector-card ${isSelected ? 'selected' : ''} ${day.isRest ? 'is-rest' : ''}`}
                    onClick={() => setActiveDayIndex(idx)}
                  >
                    <span className="day-number-label">DAY {String(day.dayNumber).padStart(2, '0')}</span>
                    <span className="day-name-label">{day.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Current Day Subheader */}
            <div className="current-day-overview">
              <div>
                <div className="day-context-tag">
                  DAY {currentDay.dayNumber} OF {currentDays.length} · {currentSplit.name}
                </div>
                <h3 className="current-day-heading">{currentDay.name}</h3>
                <p className="current-day-focus-text">{currentDay.focus}</p>
              </div>

              <div className="day-overview-actions">
                {!currentDay.isRest && (
                  <span className="day-count-badge">
                    {currentDay.exercises?.length || 0} EXERCISES
                  </span>
                )}
                <button
                  className="btn-secondary"
                  onClick={() => setShowAddToPlanModal(true)}
                >
                  + ADD EXERCISE
                </button>
              </div>
            </div>

            {/* Day Exercises List */}
            {!currentDay.isRest ? (
              <div className="exercise-cards-list">
                {currentDay.exercises?.map((ex, exIdx) => {
                  const aceInfo = aceExercises[ex.exerciseKey] || {};
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const token = `${todayStr}_${ex.exerciseKey}`;
                  const completed = completedDaySets[token] || 0;

                  return (
                    <div key={exIdx} className="clean-exercise-card">
                      <div className="ex-card-main">
                        <div className="ex-card-title-row">
                          <h4 className="ex-card-title">{ex.name.toUpperCase()}</h4>
                          <span className="ex-card-muscle">
                            {aceInfo.primaryMuscles ? aceInfo.primaryMuscles.join(' · ').toUpperCase() : aceInfo.category?.toUpperCase() || 'GENERAL'}
                          </span>
                        </div>

                        <div className="ex-card-metadata">
                          <span className="metadata-item">
                            SETS <strong className="metadata-val">{completed} / {ex.targetSets}</strong>
                          </span>
                          <span className="metadata-item">
                            REPS <strong className="metadata-val">{ex.targetReps}</strong>
                          </span>
                          <span className="metadata-item">
                            LOAD <strong className="metadata-val">{ex.targetWeight} KG</strong>
                          </span>
                          <span className="metadata-item">
                            REST <strong className="metadata-val">{ex.restSeconds}S</strong>
                          </span>
                        </div>
                      </div>

                      <div className="ex-card-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setAceModalKey(ex.exerciseKey);
                            setShowAceModal(true);
                          }}
                        >
                          FORM
                        </button>
                        <button
                          className="btn-primary"
                          onClick={() => {
                            const sessionExs =
                              currentDay.exercises && currentDay.exercises.length > 0
                                ? currentDay.exercises.map((item) =>
                                    buildExerciseSessionData(item.exerciseKey, item.targetWeight, item.targetReps, item.targetSets)
                                  )
                                : [buildExerciseSessionData(ex.exerciseKey, ex.targetWeight, ex.targetReps, ex.targetSets)];
                            handleStartWorkout(sessionExs, ex.exerciseKey, {
                              splitName: currentSplit?.name,
                              dayName: currentDay?.name,
                              dayNumber: currentDay?.dayNumber,
                            });
                          }}
                        >
                          START TRACKING
                        </button>
                        <button
                          className="btn-icon-subtle"
                          title="Remove exercise from today's plan"
                          onClick={() => removeExerciseFromCurrentDay(activeDayIndex, exIdx)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  className="btn-dashed-add"
                  onClick={() => setShowAddToPlanModal(true)}
                >
                  + ADD EXERCISE TO TODAY'S WORKOUT
                </button>
              </div>
            ) : (
              <div className="rest-day-state">
                <span className="rest-day-indicator-dot" />
                <h4 className="rest-day-title">SCHEDULED RECOVERY & MUSCULAR REPAIR</h4>
                <p className="rest-day-desc">
                  Rest is essential for physiological supercompensation and central nervous system replenishment.
                  Focus on optimal hydration, protein synthesis, and mobility recovery.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setWorkoutView('library')}
                  >
                    MOBILITY EXERCISES
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => setShowAddToPlanModal(true)}
                  >
                    + ADD WORKOUT TO THIS DAY
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SPLITS DIRECTORY & MANAGER ── */}
        {workoutView === 'splits' && (
          <div className="splits-directory-pane">
            {/* Top Split Management Banner */}
            <div className="splits-top-actions-bar">
              <div>
                <div className="brand-subtitle">PERIODIZED SPLIT DIRECTORY</div>
                <h3 className="clean-section-heading" style={{ margin: 0 }}>TRAINING ROUTINES &amp; ARCHITECTURE</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Select an evidence-based split or customize your own periodized training routine.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '10px 18px', fontSize: '11px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => {
                  setEditingSplit(null);
                  setShowCustomModal(true);
                }}
              >
                <span>⚡</span>
                <span>BUILD CUSTOM SPLIT</span>
              </button>
            </div>

            <div className="splits-grid">
              {allSplits.map((split) => {
                const isActive = split.id === activeSplitId;

                return (
                  <div key={split.id} className={`split-card-clean ${isActive ? 'active' : ''}`}>
                    <div className="split-card-header">
                      <div>
                        {isActive && <span className="active-tag-clean">ACTIVE ROUTINE</span>}
                        <h4 className="split-title-clean">{split.name}</h4>
                        <p className="split-desc-clean">{split.description}</p>
                      </div>
                      <span className="split-days-tag">{split.daysPerWeek} DAYS / WEEK</span>
                    </div>

                    <div className="split-days-chips-row">
                      {split.days?.map((d, i) => (
                        <span key={i} className={`split-chip-clean ${d.isRest ? 'is-rest' : ''}`}>
                          D{d.dayNumber}: {d.name}
                        </span>
                      ))}
                    </div>

                    <div className="split-card-actions">
                      {split.isCustom && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              setEditingSplit(split);
                              setShowCustomModal(true);
                            }}
                          >
                            EDIT
                          </button>
                          <button
                            className="btn-danger-subtle"
                            onClick={() => deleteCustomSplit(split.id)}
                          >
                            DELETE
                          </button>
                        </div>
                      )}

                      {!isActive ? (
                        <button
                          className="btn-primary"
                          style={{ marginLeft: 'auto' }}
                          onClick={() => {
                            setActiveSplitId(split.id);
                            setWorkoutView('plan');
                          }}
                        >
                          ACTIVATE SPLIT
                        </button>
                      ) : (
                        <span className="split-active-status" style={{ marginLeft: 'auto' }}>
                          ✓ CURRENT ACTIVE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: COMPLETE 80+ ACE EXERCISE CATALOG ── */}
        {workoutView === 'library' && (
          <div className="exercise-library-pane">
            <div className="library-search-container">
              <input
                type="text"
                className="clean-search-input"
                placeholder="Search exercises by name, equipment, or muscle group..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
              />

              <div className="category-filter-chips">
                {libraryCategories.map((cat) => (
                  <button
                    key={cat}
                    className={`cat-chip-clean ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="library-cards-grid">
              {filteredLibrary.map((ex) => (
                <div key={ex.key} className="library-item-card">
                  <div className="library-item-info">
                    <h4 className="library-item-name">{ex.title.toUpperCase()}</h4>
                    <div className="library-item-tags">
                      <span className="item-tag-clean">{ex.category.toUpperCase()}</span>
                      <span className="item-tag-clean muted">{ex.equipment.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="library-item-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setAceModalKey(ex.key);
                        setShowAceModal(true);
                      }}
                    >
                      FORM
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => handleStartWorkout([buildExerciseSessionData(ex.key)], ex.key)}
                    >
                      TRACK
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        <CustomSplitModal
          isOpen={showCustomModal}
          onClose={() => setShowCustomModal(false)}
          editingSplit={editingSplit}
        />

        {/* Quick Add Exercise to Current Day Modal */}
        {showAddToPlanModal && (
          <div className="ace-modal-backdrop" onClick={() => setShowAddToPlanModal(false)}>
            <div className="ace-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="ace-modal-header">
                <div>
                  <div className="brand-subtitle">ROUTINE CONFIGURATION</div>
                  <h3 className="ace-title">ADD EXERCISE TO {currentDay.name.toUpperCase()}</h3>
                </div>
                <button className="ace-close-btn" onClick={() => setShowAddToPlanModal(false)}>✕</button>
              </div>

              <div className="picker-search-bar">
                <input
                  type="text"
                  className="clean-search-input"
                  placeholder="Search 80+ exercises..."
                  value={planExSearch}
                  onChange={(e) => setPlanExSearch(e.target.value)}
                />
                <div className="category-filter-chips" style={{ marginTop: '10px' }}>
                  {libraryCategories.map((cat) => (
                    <button
                      key={cat}
                      className={`cat-chip-clean ${planExCategory === cat ? 'active' : ''}`}
                      onClick={() => setPlanExCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="picker-exercise-list">
                {ALL_EXERCISES
                  .filter((e) => {
                    const matchQ = e.title.toLowerCase().includes(planExSearch.toLowerCase()) ||
                                   e.category.toLowerCase().includes(planExSearch.toLowerCase());
                    const matchC = planExCategory === 'ALL' || e.category === planExCategory;
                    return matchQ && matchC;
                  })
                  .map((ex) => (
                    <div
                      key={ex.key}
                      className="picker-exercise-item"
                      onClick={() => {
                        addExerciseToCurrentDay(activeDayIndex, {
                          exerciseKey: ex.key,
                          name: ex.title,
                          targetSets: 3,
                          targetReps: '10-12',
                          targetWeight: 20,
                          restSeconds: 90
                        });
                        setShowAddToPlanModal(false);
                      }}
                    >
                      <div>
                        <div className="picker-ex-title">{ex.title}</div>
                        <div className="picker-ex-meta">
                          <span className="item-tag-clean">{ex.category}</span>
                          <span className="item-tag-clean muted">{ex.equipment}</span>
                        </div>
                      </div>
                      <span className="btn-secondary" style={{ pointerEvents: 'none' }}>+ ADD</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
