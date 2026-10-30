import React, { useMemo } from 'react';
import formTips from '../../data/formTips.json';

export default function RestTimer({
  restRemaining,
  restDuration,
  exerciseKey,
  onSkip,
  onAdd30,
}) {
  const percent = restDuration > 0
    ? Math.max(0, Math.min(100, Math.round(((restDuration - restRemaining) / restDuration) * 100)))
    : 0;

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const tip = useMemo(() => {
    const exTips = formTips[exerciseKey]?.tips;
    if (exTips && exTips.length > 0) {
      return exTips[Math.floor(Math.random() * exTips.length)];
    }
    const general = formTips.general || [];
    return general[Math.floor(Math.random() * general.length)] || 'Breathe deeply and prepare for the next set.';
  }, [exerciseKey]);

  const minutes = Math.floor(restRemaining / 60);
  const seconds = restRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="rest-timer-box">
      <div className="rest-timer-header">
        <span className="status-dot" style={{ background: 'var(--accent)' }} />
        <span>RECOVERY INTERVAL</span>
      </div>

      <div className="rest-ring-container">
        <svg width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="75"
            cy="75"
            r={radius}
            stroke="#1C2633"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="75"
            cy="75"
            r={radius}
            stroke="#45E6F2"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
        </svg>

        <div className="rest-ring-center">
          <span className="rest-countdown-value">{timeFormatted}</span>
          <span className="rest-countdown-label">REMAINING</span>
        </div>
      </div>

      <div className="rest-tip-container">
        <strong style={{ color: 'var(--accent)', marginRight: '6px' }}>CUE:</strong>
        {tip}
      </div>

      <div className="rest-controls-row">
        <button className="btn-secondary" onClick={onAdd30}>
          + 30 SEC
        </button>
        <button className="btn-primary" onClick={onSkip}>
          SKIP REST → NEXT SET
        </button>
      </div>
    </div>
  );
}
