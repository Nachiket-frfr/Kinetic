/**
 * Body connections for MediaPipe Pose Landmarker (33 landmarks).
 * Each pair [a, b] draws a bone between landmark a and landmark b.
 */
export const POSE_CONNECTIONS = [
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

// Key landmark indices used for joint angle calculations
export const LANDMARKS = {
  LEFT_SHOULDER:  11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW:     13,
  RIGHT_ELBOW:    14,
  LEFT_WRIST:     15,
  RIGHT_WRIST:    16,
  LEFT_HIP:       23,
  RIGHT_HIP:      24,
  LEFT_KNEE:      25,
  RIGHT_KNEE:     26,
  LEFT_ANKLE:     27,
  RIGHT_ANKLE:    28,
};

/**
 * Draw pose skeleton onto a canvas element with live angle overlays and form feedback coloring.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLVideoElement} video
 * @param {Array} landmarks
 * @param {Object} [analysis] { primaryAngle, primaryJointIndex, hasViolation }
 */
export function drawPose(canvas, video, landmarks, analysis = null) {
  const ctx = canvas.getContext('2d');
  canvas.width  = video.videoWidth  || canvas.clientWidth;
  canvas.height = video.videoHeight || canvas.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const W = canvas.width;
  const H = canvas.height;

  if (!landmarks?.length) return;

  const hasViolation = analysis?.hasViolation || false;
  const primaryAngle = analysis?.primaryAngle != null ? Math.round(analysis.primaryAngle) : null;
  const jointIndex   = analysis?.primaryJointIndex || null;

  // ── Bone connections ──────────────────────────────────────────
  for (const [a, b] of POSE_CONNECTIONS) {
    const lmA = landmarks[a];
    const lmB = landmarks[b];
    if (!lmA || !lmB) continue;
    if ((lmA.visibility ?? 1) < 0.45 || (lmB.visibility ?? 1) < 0.45) continue;

    // Default colors: cyan (left) / purple (right). If form error on tracked joints, highlight red!
    const isPrimaryBone = jointIndex && (a === jointIndex || b === jointIndex);
    const isLeft = a >= 11 && a % 2 === 1;

    let strokeStyle = isLeft ? 'rgba(0, 245, 255, 0.75)' : 'rgba(168, 85, 247, 0.75)';
    let shadowColor = isLeft ? '#00f5ff' : '#a855f7';

    if (isPrimaryBone) {
      if (hasViolation) {
        strokeStyle = 'rgba(239, 68, 68, 0.95)';
        shadowColor = '#ef4444';
      } else {
        strokeStyle = 'rgba(16, 185, 129, 0.95)';
        shadowColor = '#10b981';
      }
    }

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth   = isPrimaryBone ? 4 : 2.5;
    ctx.shadowBlur  = isPrimaryBone ? 12 : 6;
    ctx.shadowColor = shadowColor;

    ctx.beginPath();
    ctx.moveTo(lmA.x * W, lmA.y * H);
    ctx.lineTo(lmB.x * W, lmB.y * H);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  // ── Landmark dots ─────────────────────────────────────────────
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if ((lm.visibility ?? 1) < 0.45) continue;
    if (i <= 10) continue; // skip face dots

    const isTargetJoint = jointIndex && i === jointIndex;
    const isLeft = i % 2 === 1;

    let fillStyle   = isLeft ? '#00f5ff' : '#a855f7';
    let shadowColor = isLeft ? '#00f5ff' : '#a855f7';
    let radius = 5;

    if (isTargetJoint) {
      radius = 8;
      fillStyle = hasViolation ? '#ef4444' : '#10b981';
      shadowColor = hasViolation ? '#ef4444' : '#10b981';
    }

    ctx.beginPath();
    ctx.arc(lm.x * W, lm.y * H, radius, 0, Math.PI * 2);
    ctx.fillStyle   = fillStyle;
    ctx.shadowBlur  = isTargetJoint ? 14 : 8;
    ctx.shadowColor = shadowColor;
    ctx.fill();
    ctx.shadowBlur  = 0;

    // Draw live angle label right on the target joint
    if (isTargetJoint && primaryAngle !== null) {
      const textX = lm.x * W + 14;
      const textY = lm.y * H + 4;

      ctx.save();
      // Un-mirror canvas context for text rendering so text isn't flipped backwards
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      const label = `${primaryAngle}°`;
      const textWidth = ctx.measureText(label).width;

      // Pill background
      ctx.fillStyle = 'rgba(4, 4, 12, 0.85)';
      ctx.strokeStyle = hasViolation ? '#ef4444' : '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(textX - 4, textY - 14, textWidth + 8, 18, 4);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = hasViolation ? '#ef4444' : '#10b981';
      ctx.fillText(label, textX, textY);
      ctx.restore();
    }
  }
}

export function clearCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
