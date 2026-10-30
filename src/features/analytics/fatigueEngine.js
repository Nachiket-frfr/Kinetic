/**
 * Fatigue Engine
 * Tracks concentric velocity drop-off across repetitions within a set
 */

export const FATIGUE_LEVEL = {
  OPTIMAL: 'OPTIMAL',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export function calculateFatigue(repVelocities = []) {
  if (!repVelocities || repVelocities.length === 0) {
    return {
      dropPercent: 0,
      level: FATIGUE_LEVEL.OPTIMAL,
      baseline: 0,
      current: 0,
      recommendation: 'First rep establishes baseline velocity.',
      rpe: 6.0,
    };
  }

  const sample = repVelocities.slice(0, Math.min(3, repVelocities.length));
  const baseline = Math.max(...sample);
  const current = repVelocities[repVelocities.length - 1];

  if (baseline <= 0) {
    return {
      dropPercent: 0,
      level: FATIGUE_LEVEL.OPTIMAL,
      baseline: 0,
      current: 0,
      recommendation: 'Ready.',
      rpe: 6.0,
    };
  }

  const rawDrop = ((baseline - current) / baseline) * 100;
  const dropPercent = Math.max(0, Math.round(rawDrop));

  let level = FATIGUE_LEVEL.OPTIMAL;
  let recommendation = 'Explosive drive maintained.';
  let rpe = 6.5;

  if (dropPercent >= 35) {
    level = FATIGUE_LEVEL.CRITICAL;
    recommendation = 'Velocity loss >35%. Rack weight to avoid form breakdown.';
    rpe = 9.5;
  } else if (dropPercent >= 20) {
    level = FATIGUE_LEVEL.HIGH;
    recommendation = 'Fatigue >20%. Maintain strict core and joint alignment.';
    rpe = 8.5;
  } else if (dropPercent >= 10) {
    level = FATIGUE_LEVEL.MODERATE;
    recommendation = 'Mild fatigue. Good working intensity.';
    rpe = 7.5;
  }

  return {
    dropPercent,
    level,
    baseline: Math.round(baseline),
    current: Math.round(current),
    recommendation,
    rpe,
  };
}
