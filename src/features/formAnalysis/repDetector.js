/**
 * Rep Detector — Phase-change based repetition counting.
 *
 * State machine: IDLE → DOWN → UP → (rep complete, back to DOWN)
 *
 * For all supported exercises the primary joint angle follows:
 *   HIGH (rest) → LOW (bottom of movement) → HIGH (rest) = 1 rep
 *
 * Examples:
 *   Squat    knee: 170° → 90° → 170°
 *   Curl   elbow: 160° → 40° → 160°
 *   Push-up elbow: 160° → 80° → 160°
 */

const PHASE = {
  IDLE: 'IDLE',
  DOWN: 'DOWN',   // angle decreasing toward bottom
  UP:   'UP',     // angle increasing back toward top
};

/**
 * Create a new rep detector instance for a given exercise.
 *
 * @param {Object} repPhase   { down: number, up: number } from exercises.json
 *   down = angle at the bottom of the movement (e.g. 90 for squat)
 *   up   = angle at the top of the movement   (e.g. 160 for squat)
 */
export function createRepDetector(repPhase) {
  const bottomAngle = Math.min(repPhase.down, repPhase.up);
  const topAngle    = Math.max(repPhase.down, repPhase.up);
  const range       = topAngle - bottomAngle;

  // Hysteresis thresholds — avoid false triggers on noise
  const downTrigger = bottomAngle + range * 0.30;  // must go BELOW this → "down"
  const upTrigger   = topAngle   - range * 0.20;   // must come ABOVE this → rep counted

  return {
    phase:        PHASE.IDLE,
    repCount:     0,
    velocity:     0,             // degrees/second during concentric phase
    downTrigger,
    upTrigger,
    lastAngle:    null,
    lastTime:     null,
    conAngleSum:  0,             // sum of angle changes during concentric for velocity calc
    conTimeSum:   0,             // sum of time deltas during concentric
    repVelocities: [],           // list of per-rep velocities for fatigue analysis
  };
}

/**
 * Feed a new angle sample into the detector.
 *
 * @param {Object} detector  Created by createRepDetector()
 * @param {number} angle     Current primary joint angle (degrees)
 * @param {number} timestamp Current time (ms, from performance.now())
 * @returns {{ repComplete: boolean, phase: string, velocity: number, repCount: number }}
 */
export function updateRepDetector(detector, angle, timestamp) {
  const dt = detector.lastTime !== null
    ? (timestamp - detector.lastTime) / 1000
    : 0;

  const dAngle = detector.lastAngle !== null
    ? angle - detector.lastAngle
    : 0;

  detector.lastAngle = angle;
  detector.lastTime  = timestamp;

  let repComplete = false;

  switch (detector.phase) {
    case PHASE.IDLE:
    case PHASE.UP:
      // Waiting for angle to drop below downTrigger
      if (angle < detector.downTrigger) {
        detector.phase       = PHASE.DOWN;
        detector.conAngleSum = 0;
        detector.conTimeSum  = 0;
      }
      break;

    case PHASE.DOWN:
      // Accumulate concentric movement data for velocity
      if (dAngle > 0) {
        // angle is rising → concentric phase starting
        detector.conAngleSum += Math.abs(dAngle);
        detector.conTimeSum  += dt;
      }

      // Angle has returned above upTrigger → rep complete
      if (angle > detector.upTrigger) {
        detector.repCount++;
        detector.phase = PHASE.UP;
        repComplete    = true;

        // Calculate rep velocity (degrees/sec during concentric)
        if (detector.conTimeSum > 0) {
          detector.velocity = detector.conAngleSum / detector.conTimeSum;
          detector.repVelocities.push(detector.velocity);
        }
      }
      break;
  }

  return {
    repComplete,
    phase:     detector.phase,
    velocity:  Math.round(detector.velocity),
    repCount:  detector.repCount,
  };
}

/**
 * Reset the detector for a new set (keeps repVelocities for fatigue analysis).
 */
export function resetRepDetector(detector) {
  const prevVelocities = [...detector.repVelocities];
  Object.assign(detector, {
    phase:       PHASE.IDLE,
    repCount:    0,
    velocity:    0,
    lastAngle:   null,
    lastTime:    null,
    conAngleSum: 0,
    conTimeSum:  0,
    repVelocities: [],
  });
  return prevVelocities;
}
