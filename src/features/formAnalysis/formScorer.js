/**
 * Form Scorer — Real-time form quality evaluation.
 *
 * Evaluates threshold-based form constraints from exercises.json on every frame.
 * Tracks violations vs. total frames to compute a running accuracy score.
 * Also surfaces the currently active form error for immediate feedback.
 */

/**
 * Create a new form scorer for a given exercise.
 * @param {Object} exerciseDef  exercises.json entry
 */
export function createFormScorer(exerciseDef) {
  const checks = Object.entries(exerciseDef?.formChecks ?? {}).map(([key, check]) => ({
    key,
    ...check,
  }));

  return {
    checks,
    totalFrames:     0,
    violationFrames: 0,
    activeErrors:    [],     // currently triggered errors this frame
    errorCounts:     {},     // { errorKey: count } for post-session review
    score:           100,
  };
}

/**
 * Evaluate all form checks for the current frame.
 *
 * @param {Object} scorer      Created by createFormScorer()
 * @param {Array}  landmarks   Smoothed MediaPipe landmarks
 * @returns {{ score: number, activeErrors: string[], hasViolation: boolean }}
 */
export function evaluateForm(scorer, landmarks) {
  if (!landmarks || landmarks.length < 33) {
    return { score: scorer.score, activeErrors: [], hasViolation: false };
  }

  const activeErrors = [];
  let hasViolation   = false;

  for (const check of scorer.checks) {
    const { joints, threshold, message, key } = check;
    if (!joints || joints.length < 3) continue;

    const [iA, iB, iC] = joints;
    const lmA = landmarks[iA];
    const lmB = landmarks[iB];
    const lmC = landmarks[iC];

    // Skip if landmark visibility is too low
    if (
      (lmA.visibility ?? 1) < 0.4 ||
      (lmB.visibility ?? 1) < 0.4 ||
      (lmC.visibility ?? 1) < 0.4
    ) continue;

    const dx_AB = lmA.x - lmB.x, dy_AB = lmA.y - lmB.y;
    const dx_CB = lmC.x - lmB.x, dy_CB = lmC.y - lmB.y;
    const dot   = dx_AB * dx_CB + dy_AB * dy_CB;
    const magAB = Math.sqrt(dx_AB ** 2 + dy_AB ** 2);
    const magCB = Math.sqrt(dx_CB ** 2 + dy_CB ** 2);

    if (magAB === 0 || magCB === 0) continue;

    const cosTheta = Math.min(1, Math.max(-1, dot / (magAB * magCB)));
    const angle    = (Math.acos(cosTheta) * 180) / Math.PI;

    if (angle < threshold) {
      hasViolation = true;
      activeErrors.push(message);
      scorer.errorCounts[key] = (scorer.errorCounts[key] ?? 0) + 1;
    }
  }

  scorer.totalFrames++;
  if (hasViolation) scorer.violationFrames++;

  scorer.activeErrors = activeErrors;
  scorer.score        = scorer.totalFrames > 0
    ? Math.round((1 - scorer.violationFrames / scorer.totalFrames) * 100)
    : 100;

  return {
    score:        scorer.score,
    activeErrors,
    hasViolation,
    errorCounts:  { ...scorer.errorCounts },
  };
}

/**
 * Reset scorer for a new set.
 */
export function resetFormScorer(scorer) {
  scorer.totalFrames     = 0;
  scorer.violationFrames = 0;
  scorer.activeErrors    = [];
  scorer.errorCounts     = {};
  scorer.score           = 100;
}

/**
 * Get a summary of form quality after a set.
 * Returns top errors ranked by frequency and overall score.
 */
export function getFormSummary(scorer) {
  const errors = Object.entries(scorer.errorCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([key, count]) => ({ key, count, pct: Math.round((count / scorer.totalFrames) * 100) }));

  return { score: scorer.score, errors, totalFrames: scorer.totalFrames };
}
