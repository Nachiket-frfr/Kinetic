import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getExpNeeded, Consistency } from '../features/gamification/levelsMath.js';
import defaultSplits from '../data/workoutSplits.json' with { type: 'json' };

const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Gamification ──────────────────────────────────────
      lvl: 1,
      currExp: 0,
      streak: 0,
      completedDates: [],
      firstLoginDate: new Date().toISOString().slice(0, 10),
      didLevelUp: false,

      addExp: (amount) => {
        const { lvl, currExp } = get();
        let newExp = currExp + amount;
        let newLvl = lvl;
        let needed = getExpNeeded(newLvl);
        let leveled = false;
        while (newExp >= needed) {
          newExp -= needed;
          newLvl += 1;
          needed = getExpNeeded(newLvl);
          leveled = true;
        }
        set({ lvl: newLvl, currExp: newExp });
        if (leveled) {
          set({ didLevelUp: false });
          setTimeout(() => set({ didLevelUp: true }), 10);
        }
      },

      logSession: (dateStr, yesterdayStr) => {
        const { completedDates, streak, lvl } = get();
        if (completedDates.includes(dateStr)) {
          const xp = Math.max(50, Math.round(Consistency(lvl, streak) * 0.5));
          get().addExp(xp);
          return;
        }
        const yesterdayDone = completedDates.includes(yesterdayStr);
        const nextStreak = yesterdayDone ? streak + 1 : 1;
        const xp = Consistency(lvl, nextStreak);
        set({ completedDates: [...completedDates, dateStr], streak: nextStreak });
        get().addExp(xp);
      },

      clearLevelUp: () => set({ didLevelUp: false }),

      resetGamification: (todayStr) => set({
        lvl: 1,
        currExp: 0,
        streak: 0,
        completedDates: [],
        didLevelUp: false,
        firstLoginDate: todayStr,
      }),

      clearAllData: () => set({
        lvl: 1,
        currExp: 0,
        streak: 0,
        completedDates: [],
        didLevelUp: false,
        firstLoginDate: new Date().toISOString().slice(0, 10),
        activeSplitId: 'ppl-6day',
        activeDayIndex: 0,
        customSplits: [],
        completedDaySets: {},
        sessionHistory: [],
        muscleFatigue: {},
        dailyHealth: {
          date: new Date().toISOString().slice(0, 10),
          caloriesBurned: 0,
          caloriesGoal: 500,
          steps: 0,
          stepsGoal: 10000,
          activeMinutes: 0,
          timeGoal: 60,
          heartRate: null,
          watchConnected: false,
          batteryLevel: null,
          waterMl: 0,
          waterGoal: 2500,
          lastSyncTime: null,
          activeHealthSource: 'NONE',
        },
        athleteProfile: {
          name: '',
          title: '',
          weightKg: null,
          heightCm: null,
        },
        weightHistory: [],
        progressPhotos: [],
        measurements: {
          currentWeightKg: null,
          currentWaistCm: null,
          goalWeightKg: null,
        },
        exercisePRs: {},
        activeWorkoutSession: null,
        completedWorkouts: [],
        appPermissions: {
          healthWellness: false,
          notifications: false,
          physicalActivity: false,
          hasCompletedOnboarding: false,
          lastSyncedAt: null,
        },
        macroGoals: {
          calories: 2200,
          proteinGrams: 165,
          carbsGrams: 220,
          fatGrams: 73,
          waterLiters: 3.0,
          tdee: 2450,
          bmr: 1720,
          goalType: 'maintain',
          dietPreset: 'high_protein',
          activityMultiplier: 1.55,
          gender: 'male',
          age: 26,
          bodyFatPercent: null,
          mealsPerDay: 4,
        },
      }),

      // ── Workout Splits & Day Plans ────────────────────────
      activeSplitId: 'ppl-6day',
      activeDayIndex: 0,
      customSplits: [],

      setActiveSplitId: (id) => set({ activeSplitId: id, activeDayIndex: 0 }),
      setActiveDayIndex: (idx) => set({ activeDayIndex: idx }),

      saveCustomSplit: (newSplit) => {
        set((state) => {
          const exists = state.customSplits.some(s => s.id === newSplit.id);
          const updated = exists
            ? state.customSplits.map(s => s.id === newSplit.id ? newSplit : s)
            : [...state.customSplits, newSplit];
          return { customSplits: updated, activeSplitId: newSplit.id };
        });
      },

      deleteCustomSplit: (splitId) => {
        set((state) => {
          const remaining = state.customSplits.filter(s => s.id !== splitId);
          return {
            customSplits: remaining,
            activeSplitId: state.activeSplitId === splitId ? 'ppl-6day' : state.activeSplitId,
            activeDayIndex: 0
          };
        });
      },

      getActiveSplit: () => {
        const { activeSplitId, customSplits } = get();
        const custom = customSplits.find(s => s.id === activeSplitId);
        if (custom) return custom;
        return defaultSplits.find(s => s.id === activeSplitId) || defaultSplits[0];
      },

      addExerciseToCurrentDay: (dayIndex, newExercise) => {
        set((state) => {
          const current = state.getActiveSplit();
          const updatedDays = current.days.map((day, dIdx) => {
            if (dIdx !== dayIndex) return day;
            return {
              ...day,
              isRest: false,
              exercises: [...(day.exercises || []), newExercise]
            };
          });

          const updatedSplit = {
            ...current,
            isCustom: true,
            days: updatedDays
          };

          const exists = state.customSplits.some(s => s.id === updatedSplit.id);
          const newCustoms = exists
            ? state.customSplits.map(s => s.id === updatedSplit.id ? updatedSplit : s)
            : [...state.customSplits, updatedSplit];

          return {
            customSplits: newCustoms,
            activeSplitId: updatedSplit.id
          };
        });
      },

      removeExerciseFromCurrentDay: (dayIndex, exerciseIndex) => {
        set((state) => {
          const current = state.getActiveSplit();
          const updatedDays = current.days.map((day, dIdx) => {
            if (dIdx !== dayIndex) return day;
            return {
              ...day,
              exercises: day.exercises.filter((_, exIdx) => exIdx !== exerciseIndex)
            };
          });

          const updatedSplit = {
            ...current,
            isCustom: true,
            days: updatedDays
          };

          const exists = state.customSplits.some(s => s.id === updatedSplit.id);
          const newCustoms = exists
            ? state.customSplits.map(s => s.id === updatedSplit.id ? updatedSplit : s)
            : [...state.customSplits, updatedSplit];

          return {
            customSplits: newCustoms,
            activeSplitId: updatedSplit.id
          };
        });
      },

      // ── Workout Session Tracking ──────────────────────────
      selectedExercise: null,
      setSelectedExercise: (ex) => set({ selectedExercise: ex }),

      // ── Active Live Workout Studio Session (Persistent across page navigation) ──
      activeWorkoutSession: null,
      setActiveWorkoutSession: (sessionOrUpdater) =>
        set((state) => ({
          activeWorkoutSession:
            typeof sessionOrUpdater === 'function'
              ? sessionOrUpdater(state.activeWorkoutSession)
              : sessionOrUpdater,
        })),
      clearActiveWorkoutSession: () => set({ activeWorkoutSession: null }),

      // ── Completed Workouts History (Rich Summary with Volume, PR status, exercises) ──
      completedWorkouts: [],
      recordCompletedWorkout: (workoutSummary) =>
        set((state) => {
          const todayStr = workoutSummary.date || new Date().toISOString().slice(0, 10);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().slice(0, 10);

          const { completedDates, streak, lvl } = state;
          let nextStreak = streak;
          let nextCompletedDates = completedDates;
          if (!completedDates.includes(todayStr)) {
            const yesterdayDone = completedDates.includes(yesterdayStr);
            nextStreak = yesterdayDone ? streak + 1 : 1;
            nextCompletedDates = [...completedDates, todayStr];
          }
          const xp = Consistency(lvl, nextStreak);
          let newExp = state.currExp + xp;
          let newLvl = lvl;
          let needed = getExpNeeded(newLvl);
          let leveled = false;
          while (newExp >= needed) {
            newExp -= needed;
            newLvl += 1;
            needed = getExpNeeded(newLvl);
            leveled = true;
          }

          const currentHealth = state.dailyHealth || {};
          const calEst = Math.max(30, Math.round((workoutSummary.volumeKg || 0) * 0.05 + (workoutSummary.setsCount || 0) * 8));

          return {
            completedWorkouts: [workoutSummary, ...(state.completedWorkouts || [])],
            activeWorkoutSession: null,
            completedDates: nextCompletedDates,
            streak: nextStreak,
            lvl: newLvl,
            currExp: newExp,
            didLevelUp: leveled ? true : state.didLevelUp,
            dailyHealth: {
              ...currentHealth,
              caloriesBurned: (currentHealth.caloriesBurned || 0) + calEst,
              activeMinutes: (currentHealth.activeMinutes || 0) + Math.max(10, Math.round((workoutSummary.durationSec || 600) / 60)),
            },
          };
        }),

      completedDaySets: {},
      incrementCompletedSet: (key, dateStr = new Date().toISOString().slice(0, 10)) => {
        const token = `${dateStr}_${key}`;
        set((state) => ({
          completedDaySets: {
            ...state.completedDaySets,
            [token]: (state.completedDaySets[token] || 0) + 1
          }
        }));
      },

      // ── Daily Health & Biometric Telemetry (Clean defaults, zero fake steps) ──
      dailyHealth: {
        date: new Date().toISOString().slice(0, 10),
        caloriesBurned: 0,
        caloriesGoal: 500,
        steps: 0,
        stepsGoal: 10000,
        activeMinutes: 0,
        timeGoal: 60,
        heartRate: null,
        watchConnected: false,
        batteryLevel: null,
        waterMl: 0,
        waterGoal: 2500,
        lastSyncTime: null,
        activeHealthSource: 'NONE', // 'NONE' | 'GOOGLE_FIT' | 'HEALTH_CONNECT' | 'DEVICE_HARDWARE'
      },

      athleteProfile: {
        name: '',
        title: '',
        weightKg: null,
        heightCm: null,
      },

      updateDailyHealth: (partial) =>
        set((state) => ({
          dailyHealth: { ...state.dailyHealth, ...partial }
        })),

      logManualActivity: ({ type, value }) =>
        set((state) => {
          const current = state.dailyHealth || {};
          const updated = { ...current };
          const num = Math.max(0, Number(value) || 0);
          if (type === 'calories') {
            updated.caloriesBurned = (updated.caloriesBurned || 0) + num;
          } else if (type === 'steps') {
            updated.steps = (updated.steps || 0) + num;
          } else if (type === 'activeMinutes') {
            updated.activeMinutes = (updated.activeMinutes || 0) + num;
          } else if (type === 'water') {
            updated.waterMl = (updated.waterMl || 0) + num;
          }
          return { dailyHealth: updated };
        }),

      recordStep: ({ isRunning = false } = {}) =>
        set((state) => {
          const current = state.dailyHealth || {};
          const calPerStep = isRunning ? 0.065 : 0.042;
          const currentSteps = current.steps || 0;
          const currentCal = current.caloriesBurned || 0;
          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            dailyHealth: {
              ...current,
              steps: currentSteps + 1,
              caloriesBurned: Math.round((currentCal + calPerStep) * 10) / 10,
              lastSyncTime: `Hardware Sensor (${nowTime})`,
              activeHealthSource: 'DEVICE_HARDWARE'
            }
          };
        }),

      updateAthleteProfile: (partial) =>
        set((state) => ({
          athleteProfile: { ...state.athleteProfile, ...partial }
        })),

      setMacroGoals: (goals) =>
        set((state) => {
          const updated = { ...(state.macroGoals || {}), ...goals };
          return {
            macroGoals: updated,
            dailyHealth: {
              ...(state.dailyHealth || {}),
              caloriesGoal: updated.calories || state.dailyHealth?.caloriesGoal || 2200,
            }
          };
        }),

      // ── Session History & PR Engine ────────────────────────
      sessionHistory: [],

      saveSession: (session) =>
        set((state) => {
          const calEst = Math.max(5, Math.round((session.reps || 10) * 0.5 + (session.weight || 0) * 0.05));
          const currentHealth = state.dailyHealth || {};

          // Dynamic Personal Record (PR) evaluation
          const exKey = session.exercise || 'unknown';
          const weight = Number(session.weight) || 0;
          const reps = Number(session.reps) || 1;
          const volume = weight * reps;
          const est1RM = weight > 0 ? Math.round(weight * (1 + reps / 30)) : 0;

          const currentPR = state.exercisePRs?.[exKey] || { maxWeight: 0, maxVolume: 0, oneRepMax: 0 };
          const isNewWeightPR = weight > (currentPR.maxWeight || 0);
          const isNew1RMPR = est1RM > (currentPR.oneRepMax || 0);
          const isNewVolumePR = volume > (currentPR.maxVolume || 0);

          const updatedPRs = {
            ...(state.exercisePRs || {}),
            [exKey]: {
              maxWeight: Math.max(currentPR.maxWeight || 0, weight),
              maxVolume: Math.max(currentPR.maxVolume || 0, volume),
              oneRepMax: Math.max(currentPR.oneRepMax || 0, est1RM),
              lastAchievedAt: new Date().toISOString(),
            }
          };

          return {
            sessionHistory: [...state.sessionHistory, { ...session, isPR: isNewWeightPR || isNew1RMPR || isNewVolumePR }],
            exercisePRs: updatedPRs,
            dailyHealth: {
              ...currentHealth,
              caloriesBurned: (currentHealth.caloriesBurned || 0) + calEst,
              activeMinutes: (currentHealth.activeMinutes || 0) + 2,
            }
          };
        }),

      // ── Muscle Fatigue State ─────────────────────────────
      muscleFatigue: {},

      updateMuscleFatigue: (muscleUpdates) =>
        set((state) => ({
          muscleFatigue: { ...state.muscleFatigue, ...muscleUpdates },
        })),

      // ── App Permissions Hub ──────────────────────────────
      appPermissions: {
        healthWellness: false,
        notifications: false,
        physicalActivity: false,
        hasCompletedOnboarding: false,
        lastSyncedAt: null,
      },

      setAppPermission: (key, value) =>
        set((state) => ({
          appPermissions: {
            ...(state.appPermissions || {}),
            [key]: value,
          },
        })),

      completePermissionsOnboarding: () =>
        set((state) => ({
          appPermissions: {
            ...(state.appPermissions || {}),
            hasCompletedOnboarding: true,
          },
        })),

      // ── Profile & Measurements (Zero fake entries) ─────────
      weightHistory: [],
      progressPhotos: [],
      measurements: {
        currentWeightKg: null,
        currentWaistCm: null,
        goalWeightKg: null,
      },

      addWeightEntry: (entry) =>
        set((state) => {
          const newEntry = {
            date: entry.date || new Date().toISOString().slice(0, 10),
            weightKg: Number(entry.weightKg),
            waistCm: entry.waistCm ? Number(entry.waistCm) : null,
          };
          const updated = [...state.weightHistory, newEntry].sort((a, b) => a.date.localeCompare(b.date));
          return {
            weightHistory: updated,
            measurements: {
              ...state.measurements,
              currentWeightKg: newEntry.weightKg,
              currentWaistCm: newEntry.waistCm || state.measurements.currentWaistCm,
            },
          };
        }),

      deleteWeightEntry: (dateStr) =>
        set((state) => {
          const remaining = state.weightHistory.filter((w) => w.date !== dateStr);
          const latest = remaining[remaining.length - 1];
          return {
            weightHistory: remaining,
            measurements: {
              ...state.measurements,
              currentWeightKg: latest?.weightKg || null,
              currentWaistCm: latest?.waistCm || null,
            },
          };
        }),

      addProgressPhoto: (photo) =>
        set((state) => ({
          progressPhotos: [
            ...state.progressPhotos,
            {
              id: `photo-${Date.now()}`,
              date: photo.date || new Date().toISOString().slice(0, 10),
              dataUri: photo.dataUri,
              caption: photo.caption || '',
            },
          ],
        })),

      removeProgressPhoto: (photoId) =>
        set((state) => ({
          progressPhotos: state.progressPhotos.filter((p) => p.id !== photoId),
        })),

      updateMeasurements: (partial) =>
        set((state) => ({
          measurements: { ...state.measurements, ...partial },
        })),

      syncDeviceTelemetry: ({ steps = 0, calories = 0, bpm = null, source = 'NONE' } = {}) =>
        set((state) => {
          const current = state.dailyHealth || {};
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            dailyHealth: {
              ...current,
              steps: Number(steps) || 0,
              caloriesBurned: Number(calories) || current.caloriesBurned || 0,
              heartRate: bpm || current.heartRate,
              lastSyncTime: `Synced ${nowStr}`,
              activeHealthSource: source,
            },
            appPermissions: {
              ...(state.appPermissions || {}),
              lastSyncedAt: new Date().toISOString(),
            },
          };
        }),

      // ── Personal Records (Empty by default, built strictly from user's workouts) ──
      exercisePRs: {},

      updateExercisePR: (exerciseKey, { weight, volume, reps }) =>
        set((state) => {
          const current = state.exercisePRs?.[exerciseKey] || { maxWeight: 0, maxVolume: 0, oneRepMax: 0 };
          const est1RM = Math.round((weight || 0) * (1 + (reps || 1) / 30));
          return {
            exercisePRs: {
              ...(state.exercisePRs || {}),
              [exerciseKey]: {
                maxWeight: Math.max(current.maxWeight || 0, weight || 0),
                maxVolume: Math.max(current.maxVolume || 0, volume || 0),
                oneRepMax: Math.max(current.oneRepMax || 0, est1RM),
                lastAchievedAt: new Date().toISOString(),
              },
            },
          };
        }),
    }),
    {
      name: 'replog-storage',
      version: 2,
      migrate: (persistedState, _version) => {
        if (!persistedState) return persistedState;
        const cleanState = { ...persistedState };
        // Purge legacy mock athlete profile
        if (cleanState.athleteProfile?.name === 'Rishabh S.' || cleanState.athleteProfile?.title?.includes('POWERLIFTER')) {
          cleanState.athleteProfile = { name: '', title: '', weightKg: null, heightCm: null };
        }
        // Purge legacy mock PRs
        if (cleanState.exercisePRs) {
          const prs = cleanState.exercisePRs;
          if (prs['barbell-bench-press']?.maxWeight === 120 && prs['barbell-squat']?.maxWeight === 160) {
            cleanState.exercisePRs = {};
          }
        }
        // Purge legacy mock weight history
        if (Array.isArray(cleanState.weightHistory) && cleanState.weightHistory.length === 6 && cleanState.weightHistory[0]?.weightKg === 74.2) {
          cleanState.weightHistory = [];
          cleanState.measurements = { currentWeightKg: null, currentWaistCm: null, goalWeightKg: null };
        }
        // Purge mock steps if no active health source
        if (cleanState.dailyHealth?.steps > 0 && (!cleanState.dailyHealth?.activeHealthSource || cleanState.dailyHealth?.activeHealthSource === 'NONE')) {
          cleanState.dailyHealth = {
            ...cleanState.dailyHealth,
            steps: 0,
            caloriesBurned: 0,
            activeMinutes: 0,
            activeHealthSource: 'NONE',
          };
        }
        return cleanState;
      },
      partialize: (state) => ({
        lvl: state.lvl,
        currExp: state.currExp,
        streak: state.streak,
        completedDates: state.completedDates,
        firstLoginDate: state.firstLoginDate,
        activeSplitId: state.activeSplitId,
        activeDayIndex: state.activeDayIndex,
        customSplits: state.customSplits,
        completedDaySets: state.completedDaySets,
        sessionHistory: state.sessionHistory,
        activeWorkoutSession: state.activeWorkoutSession,
        completedWorkouts: state.completedWorkouts,
        muscleFatigue: state.muscleFatigue,
        dailyHealth: state.dailyHealth,
        athleteProfile: state.athleteProfile,
        appPermissions: state.appPermissions,
        weightHistory: state.weightHistory,
        progressPhotos: state.progressPhotos,
        measurements: state.measurements,
        exercisePRs: state.exercisePRs,
      }),
    }
  )
);

export default useAppStore;
