import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';

export default function WorkoutSummaryModal({
  isOpen,
  onClose,
  workoutData = {},
  onShareToFeed
}) {
  const { logSession, recordCompletedWorkout } = useAppStore();

  const [workoutTitle, setWorkoutTitle] = useState(workoutData.title || 'Workout Session');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const durationStr = workoutData.duration || '0m';
  const volumeKg = workoutData.volumeKg || 0;
  const setsCount = workoutData.setsCount || 0;
  const prsCount = workoutData.prsCount || 0;
  const formScore = workoutData.formScore || 100;

  const handleSave = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const summaryRecord = {
      id: `workout-${Date.now()}`,
      date: todayStr,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      title: workoutTitle || workoutData.splitDayName || workoutData.title || 'Workout Session',
      splitDayName: workoutData.splitDayName || workoutTitle || workoutData.title || 'Workout Session',
      duration: durationStr,
      durationSec: workoutData.durationSec || 0,
      volumeKg: volumeKg,
      setsCount: setsCount,
      repsCount: workoutData.repsCount || 0,
      isPRDay: Boolean(prsCount > 0),
      prCount: prsCount,
      prDetails: workoutData.prDetails || null,
      prList: workoutData.prList || [],
      exercises: workoutData.exercises || [],
      avgFormScore: formScore,
    };

    if (recordCompletedWorkout) {
      recordCompletedWorkout(summaryRecord);
    } else {
      logSession(todayStr, yesterdayStr);
    }

    setIsSaved(true);

    if (onShareToFeed) onShareToFeed();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="ace-modal-backdrop" onClick={onClose}>
      <div className="ace-modal-content workout-summary-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Celebration Header */}
        <div className="summary-celebration-banner">
          <div className="summary-trophy-icon">🏆</div>
          <span className="summary-badge-tag">SESSION CONCLUDED</span>
          <h2 className="summary-main-title">WORKOUT COMPLETE!</h2>
          <p className="summary-subtitle">Outstanding volume output and kinematic form compliance.</p>
        </div>

        {/* Core Metrics Grid */}
        <div className="summary-metrics-grid">
          <div className="summary-metric-card">
            <span className="summary-metric-label">TOTAL VOLUME</span>
            <span className="summary-metric-val" style={{ color: 'var(--accent, #158FF2)' }}>
              {volumeKg.toLocaleString()} KG
            </span>
          </div>
          <div className="summary-metric-card">
            <span className="summary-metric-label">TIME</span>
            <span className="summary-metric-val">{durationStr}</span>
          </div>
          <div className="summary-metric-card">
            <span className="summary-metric-label">SETS</span>
            <span className="summary-metric-val">{setsCount}</span>
          </div>
          <div className="summary-metric-card">
            <span className="summary-metric-label">FORM ACCURACY</span>
            <span className="summary-metric-val" style={{ color: 'var(--success, #35C77A)' }}>
              {formScore}%
            </span>
          </div>
        </div>

        {/* PR Achievement Callout */}
        {prsCount > 0 && (
          <div className="summary-pr-callout">
            <span className="pr-callout-icon">⚡</span>
            <div>
              <div className="pr-callout-title">{prsCount} NEW PERSONAL RECORD{prsCount > 1 ? 'S' : ''} ACHIEVED!</div>
              <div className="pr-callout-desc">{workoutData.prDetails || 'New personal best load or volume recorded for this exercise.'}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="summary-actions-row">
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            DISMISS
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ flex: 2 }}
            onClick={handleSave}
            disabled={isSaved}
          >
            {isSaved ? '✓ WORKOUT SAVED!' : 'COMPLETE & SAVE WORKOUT'}
          </button>
        </div>
      </div>
    </div>
  );
}
