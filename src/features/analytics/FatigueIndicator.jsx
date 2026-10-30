import React from 'react';
import { FATIGUE_LEVEL } from './fatigueEngine';

export default function FatigueIndicator({ fatigue }) {
  if (!fatigue) return null;

  const { dropPercent, level, baseline, current, recommendation, rpe } = fatigue;

  const getBadgeColor = () => {
    switch (level) {
      case FATIGUE_LEVEL.CRITICAL:
        return { bg: 'rgba(255, 92, 108, 0.1)', text: '#FF5C6C', border: 'rgba(255, 92, 108, 0.3)' };
      case FATIGUE_LEVEL.HIGH:
        return { bg: 'rgba(255, 180, 84, 0.1)', text: '#FFB454', border: 'rgba(255, 180, 84, 0.3)' };
      case FATIGUE_LEVEL.MODERATE:
        return { bg: 'rgba(69, 230, 242, 0.1)', text: '#45E6F2', border: 'rgba(69, 230, 242, 0.3)' };
      default:
        return { bg: 'rgba(85, 214, 138, 0.1)', text: '#55D68A', border: 'rgba(85, 214, 138, 0.3)' };
    }
  };

  const colors = getBadgeColor();

  return (
    <div className="fatigue-indicator-box" style={{ borderColor: colors.border }}>
      <div className="fatigue-indicator-top">
        <div className="fatigue-badge-row">
          <span
            className="fatigue-status-tag"
            style={{
              background: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`
            }}
          >
            {level} FATIGUE
          </span>
          <span className="fatigue-drop-metric">
            VELOCITY LOSS: <strong style={{ color: colors.text }}>{dropPercent}%</strong>
          </span>
        </div>

        <div className="fatigue-rpe-tag">
          EST. RPE <strong style={{ color: '#F2F6FA' }}>{rpe}</strong>
        </div>
      </div>

      <div className="fatigue-recommendation-text">
        {recommendation}
      </div>
    </div>
  );
}
