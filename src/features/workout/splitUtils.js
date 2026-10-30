import defaultSplits from '../../data/workoutSplits.json';

/**
 * Resolves a human-friendly split day title for any workout (new, completed, or historical).
 * e.g. "Push (Chest, Shoulders, Triceps)", "Pull (Back, Biceps, Rear Delts)", "Legs (Quads, Hamstrings, Calves)"
 */
export function getSplitDayTitleForWorkout(workout, activeSplit = null, customSplits = []) {
  if (!workout) return 'Workout Session';

  // 1. If explicit splitDayName is already stored
  if (workout.splitDayName && workout.splitDayName !== 'Workout' && workout.splitDayName !== 'Day 1') {
    return workout.splitDayName;
  }

  // 2. If workout has a specific non-generic title already
  const title = workout.title || '';
  const upper = title.trim().toUpperCase();
  const genericTitles = [
    'WORKOUT SESSION',
    'WORKOUT',
    'RECORDED SESSION',
    'LOGGED SESSION',
    'LIVE WORKOUT',
    'LIVE SESSION',
    'RECENT WORKOUT'
  ];
  if (title && !genericTitles.includes(upper) && !upper.endsWith(' SESSION')) {
    return title;
  }

  // 3. Extract exercise keys from this workout
  const exKeys = [];
  if (Array.isArray(workout.exercises)) {
    workout.exercises.forEach((e) => {
      const k = typeof e === 'string' ? e : e.key || e.exerciseKey;
      if (k) exKeys.push(k.toLowerCase());
    });
  } else if (workout.exercise) {
    exKeys.push(String(workout.exercise).toLowerCase());
  }

  // 4. Check active split days first, then other default & custom splits
  const allSplits = [activeSplit, ...defaultSplits, ...(customSplits || [])].filter(Boolean);

  let bestDayName = null;
  let maxMatches = 0;

  for (const split of allSplits) {
    const days = split.days || [];
    for (const day of days) {
      if (day.isRest) continue;
      const plannedKeys = (day.exercises || []).map((e) => (e.exerciseKey || '').toLowerCase());
      const matchCount = exKeys.filter((k) => plannedKeys.includes(k)).length;
      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        bestDayName = day.name;
      }
    }
    if (maxMatches >= 2) break;
  }

  if (bestDayName && maxMatches > 0) {
    return bestDayName;
  }

  // 5. Anatomical rule-based fallback matching standard workout splits
  const combinedStr = exKeys.join(' ');
  if (/squat|lunge|leg|calf|quad|hamstring|glute/i.test(combinedStr)) {
    return 'Legs (Quads, Hamstrings, Calves)';
  }
  if (/push|chest|bench|press|tricep|dip/i.test(combinedStr)) {
    return 'Push (Chest, Shoulders, Triceps)';
  }
  if (/pull|deadlift|row|bicep|chin|curl/i.test(combinedStr)) {
    return 'Pull (Back, Biceps, Rear Delts)';
  }
  if (/abs|core|crunch|plank/i.test(combinedStr)) {
    return 'Core & Abdominals';
  }

  return title || 'Workout Session';
}
