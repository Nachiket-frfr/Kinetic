import React from 'react';

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

/**
 * Futuristic XP progress bar with shimmer animation.
 */
export function LevelExp({ userLvl, curr, expNeed }) {
  const pct = Math.min(100, (curr / expNeed) * 100);
  const pctDisplay = Math.round(pct);

  return (
    <div className="xp-section">
      <div className="xp-header">
        <div className="xp-label-group">
          <span className="xp-label">EXPERIENCE</span>
          <span className="xp-level-tag">LVL {userLvl} → LVL {userLvl + 1}</span>
        </div>
        <div className="xp-nums">
          <span className="xp-curr">{curr.toLocaleString()}</span>
          <span className="xp-sep"> / </span>
          <span className="xp-need">{expNeed.toLocaleString()} XP</span>
        </div>
      </div>

      <div className="xp-track">
        <div className="xp-fill" style={{ width: `${Math.max(pct, 0.5)}%` }}>
          <div className="xp-shimmer" />
        </div>
      </div>

      <div className="xp-footer">
        <span className="xp-pct">{pctDisplay}% COMPLETE</span>
        <span className="xp-rem">{(expNeed - curr).toLocaleString()} XP remaining</span>
      </div>
    </div>
  );
}