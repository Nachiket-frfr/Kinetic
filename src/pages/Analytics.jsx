import React, { useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import VolumeChart from '../features/analytics/VolumeChart';
import OneRMChart from '../features/analytics/OneRMChart';
import MuscleHeatmap from '../features/analytics/MuscleHeatmap';

export default function Analytics() {
  const { sessionHistory, muscleFatigue, completedDates, streak, lvl } = useAppStore();

  const totalVolume = useMemo(() => {
    return sessionHistory.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);
  }, [sessionHistory]);

  const avgAccuracy = useMemo(() => {
    if (!sessionHistory.length) return 0;
    const sum = sessionHistory.reduce((acc, s) => acc + (s.formScore || 100), 0);
    return Math.round(sum / sessionHistory.length);
  }, [sessionHistory]);

  return (
    <div className="page-analytics">
      <div className="app-card">
        {/* Header */}
        <header className="app-header">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <div className="brand-name">ANALYTICS</div>
              <div className="brand-subtitle">BIOMECHANICAL PERFORMANCE ENGINE</div>
            </div>
          </div>

          <div className="system-status-indicator">
            <span className="status-dot" />
            <span>REAL-TIME TELEMETRY</span>
          </div>
        </header>

        {/* Top Summary Metrics */}
        <div className="dashboard-metrics-grid">
          <div className="metric-block">
            <span className="metric-label">ATHLETE LEVEL</span>
            <div className="metric-value-clean">
              {String(lvl).padStart(2, '0')}
            </div>
            <span className="metric-caption">PROGRESS TIER</span>
          </div>

          <div className="metric-block">
            <span className="metric-label">ACTIVE STREAK</span>
            <div className="metric-value-clean">
              {String(streak).padStart(2, '0')} <span className="metric-unit">DAYS</span>
            </div>
            <span className="metric-caption">CONSISTENCY</span>
          </div>

          <div className="metric-block">
            <span className="metric-label">VOLUME TONNAGE</span>
            <div className="metric-value-clean">
              {totalVolume > 0 ? totalVolume.toLocaleString() : '—'} <span className="metric-unit">KG</span>
            </div>
            <span className="metric-caption">LIFETIME LOAD</span>
          </div>

          <div className="metric-block">
            <span className="metric-label">AVG FORM ACCURACY</span>
            <div className="metric-value-clean" style={{ color: avgAccuracy >= 80 ? 'var(--success)' : avgAccuracy > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
              {avgAccuracy > 0 ? `${avgAccuracy}%` : '—'}
            </div>
            <span className="metric-caption">KINEMATIC QUALITY</span>
          </div>
        </div>

        {/* Charts Section */}
        <div className="analytics-sections-stack">
          <VolumeChart sessions={sessionHistory} />
          <OneRMChart sessions={sessionHistory} />
          <MuscleHeatmap fatigueState={muscleFatigue} />
        </div>
      </div>
    </div>
  );
}
