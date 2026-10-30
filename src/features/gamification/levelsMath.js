const baseExp = 100;
const factor = 1.5;

/**
 * XP earned per session.
 * Scales with level and streak; streak bonus is logarithmically capped.
 */
export function Consistency(level, nStreak) {
  const amountGain = Math.floor(
    (25 * Math.pow(level, 1.127)) * (1 + nStreak / (7 * Math.log(level + 1)))
  );
  return amountGain;
}

/**
 * XP required to advance from a given level.
 */
export function getExpNeeded(level) {
  return Math.floor(baseExp * Math.pow(level, factor));
}
