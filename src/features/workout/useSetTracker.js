import { useState, useEffect, useRef } from 'react';
import useAppStore from '../../store/useAppStore';

/**
 * useSetTracker — Manages ongoing workout set lifecycles, rest timers,
 * fatigue velocity logging, and persistence.
 */
export function useSetTracker(exerciseKey, targetSets = 3, targetReps = 10) {
  const { incrementCompletedSet, saveSession, updateMuscleFatigue } = useAppStore();

  const [currentSet, setCurrentSet] = useState(1);
  const [completedSets, setCompletedSets] = useState([]);
  const [isResting, setIsResting] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [restRemaining, setRestRemaining] = useState(90);
  const [timeUnderTension, setTimeUnderTension] = useState(0);

  const tutTimerRef = useRef(null);
  const restTimerRef = useRef(null);

  // Time Under Tension counter during active set
  useEffect(() => {
    if (!isResting) {
      tutTimerRef.current = setInterval(() => {
        setTimeUnderTension((t) => t + 1);
      }, 1000);
    } else {
      if (tutTimerRef.current) clearInterval(tutTimerRef.current);
    }
    return () => {
      if (tutTimerRef.current) clearInterval(tutTimerRef.current);
    };
  }, [isResting]);

  // Rest countdown timer
  useEffect(() => {
    if (isResting && restRemaining > 0) {
      restTimerRef.current = setInterval(() => {
        setRestRemaining((r) => {
          if (r <= 1) {
            clearInterval(restTimerRef.current);
            setIsResting(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isResting, restRemaining]);

  const finishSet = ({ reps, weight, velocities = [], formScore = 100, customRestSeconds = 90 }) => {
    const setData = {
      setNumber: currentSet,
      reps,
      weight: parseFloat(weight) || 0,
      velocities,
      formScore,
      tut: timeUnderTension,
      timestamp: Date.now()
    };

    setCompletedSets((prev) => [...prev, setData]);
    setCurrentSet((prev) => prev + 1);
    setTimeUnderTension(0);

    // Save session set to store
    saveSession({
      date: new Date().toISOString().slice(0, 10),
      exercise: exerciseKey,
      setNumber: currentSet,
      reps,
      weight: parseFloat(weight) || 0,
      velocities,
      formScore,
      tut: timeUnderTension,
      timestamp: Date.now()
    });

    // Trigger rest period
    setRestDuration(customRestSeconds);
    setRestRemaining(customRestSeconds);
    setIsResting(true);

    if (exerciseKey) {
      incrementCompletedSet(exerciseKey);
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestRemaining(0);
  };

  const addRestTime = (seconds = 30) => {
    setRestRemaining((r) => r + seconds);
    setRestDuration((d) => d + seconds);
  };

  return {
    currentSet,
    completedSets,
    isResting,
    restRemaining,
    restDuration,
    timeUnderTension,
    finishSet,
    skipRest,
    addRestTime
  };
}
