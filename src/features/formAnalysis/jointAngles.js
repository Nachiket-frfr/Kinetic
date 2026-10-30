/**
 * Joint Angle Calculator — Vector Trigonometry
 *
 * Calculates the angle at joint B formed by points A → B → C.
 * Uses: angle = arccos( dot(BA, BC) / (|BA| * |BC|) )
 */

/**
 * Calculate the angle (degrees) at point B, between rays BA and BC.
 * All points are MediaPipe landmark objects: { x, y, z, visibility }
 * Coordinates are normalised [0..1] relative to image dimensions.
 */
export function calcAngle(A, B, C) {
  const BAx = A.x - B.x;
  const BAy = A.y - B.y;
  const BAz = (A.z ?? 0) - (B.z ?? 0);

  const BCx = C.x - B.x;
  const BCy = C.y - B.y;
  const BCz = (C.z ?? 0) - (B.z ?? 0);

  const dot    = BAx * BCx + BAy * BCy + BAz * BCz;
  const magBA  = Math.sqrt(BAx ** 2 + BAy ** 2 + BAz ** 2);
  const magBC  = Math.sqrt(BCx ** 2 + BCy ** 2 + BCz ** 2);

  if (magBA === 0 || magBC === 0) return 0;

  // Clamp to [-1, 1] to prevent NaN from floating-point drift
  const cosTheta = Math.min(1, Math.max(-1, dot / (magBA * magBC)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Extract all tracked joint angles from a landmark set for a given exercise.
 *
 * @param {Array}  landmarks   33-item MediaPipe landmark array
 * @param {Object} exerciseDef exercises.json entry for the selected exercise
 * @returns {Object}  { primaryAngle, leftElbow, rightElbow, leftKnee, rightKnee, leftHip, rightHip }
 */
export function getJointAngles(landmarks, exerciseDef) {
  if (!landmarks || landmarks.length < 33) return null;

  const lm = landmarks;

  // Named shortcuts for readability
  const L_SHOULDER = lm[11], R_SHOULDER = lm[12];
  const L_ELBOW    = lm[13], R_ELBOW    = lm[14];
  const L_WRIST    = lm[15], R_WRIST    = lm[16];
  const L_HIP      = lm[23], R_HIP      = lm[24];
  const L_KNEE     = lm[25], R_KNEE     = lm[26];
  const L_ANKLE    = lm[27], R_ANKLE    = lm[28];

  const angles = {
    leftElbow:  calcAngle(L_SHOULDER, L_ELBOW,  L_WRIST),
    rightElbow: calcAngle(R_SHOULDER, R_ELBOW,  R_WRIST),
    leftKnee:   calcAngle(L_HIP,      L_KNEE,   L_ANKLE),
    rightKnee:  calcAngle(R_HIP,      R_KNEE,   R_ANKLE),
    leftHip:    calcAngle(L_SHOULDER, L_HIP,    L_KNEE),
    rightHip:   calcAngle(R_SHOULDER, R_HIP,    R_KNEE),
    leftShoulder:  calcAngle(L_ELBOW,    L_SHOULDER, L_HIP),
    rightShoulder: calcAngle(R_ELBOW,    R_SHOULDER, R_HIP),
  };

  // Derive primary angle from exercise definition
  if (exerciseDef) {
    const { A, B, C } = exerciseDef.landmarks;
    angles.primaryAngle = calcAngle(lm[A], lm[B], lm[C]);

    // Average left+right for bilateral exercises
    const joint = exerciseDef.primaryJoint;
    if (joint === 'knee') {
      angles.primaryAngle = (angles.leftKnee + angles.rightKnee) / 2;
    } else if (joint === 'elbow') {
      angles.primaryAngle = (angles.leftElbow + angles.rightElbow) / 2;
    } else if (joint === 'hip') {
      angles.primaryAngle = (angles.leftHip + angles.rightHip) / 2;
    }
  }

  return angles;
}

/**
 * Check a single form constraint.
 * Returns the error message if the constraint is violated, null otherwise.
 */
export function checkFormConstraint(landmarks, constraint) {
  if (!landmarks || !constraint) return null;
  const { joints, threshold, message } = constraint;
  if (!joints || joints.length < 3) return null;

  const [iA, iB, iC] = joints;
  const angle = calcAngle(landmarks[iA], landmarks[iB], landmarks[iC]);

  // Threshold direction: if angle < threshold → form error
  // (all constraints are of the "angle should not be below threshold" type)
  return angle < threshold ? message : null;
}
