import React, { useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { Tooltip } from 'react-tooltip';
import 'react-calendar-heatmap/dist/styles.css';
import { useNavigate } from 'react-router-dom';

import LevelShow from '../features/gamification/LevelUpModal';
import { LevelExp, getExpNeeded } from '../features/gamification/levels';
import useAppStore from '../store/useAppStore';

const getLocalDateStr = (d = new Date()) => {
  const dateObj = new Date(d);
  return [
    dateObj.getFullYear(),
    String(dateObj.getMonth() + 1).padStart(2, '0'),
    String(dateObj.getDate()).padStart(2, '0'),
  ].join('-');
};

export default function Dashboard() {
  const navigate = useNavigate();
  const todayStr = useMemo(() => getLocalDateStr(), []);
  const yesterStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getLocalDateStr(y);
  }, []);

  const {
    lvl,
    currExp,
    streak,
    completedDates,
    firstLoginDate,
    didLevelUp,
    clearLevelUp,
    logSession,
    resetGamification,
    getActiveSplit,
  } = useAppStore();

  const expNeed = getExpNeeded(lvl);
  const isTodayDone = completedDates.includes(todayStr);
  const activeSplit = getActiveSplit();

  // Heatmap window: past 30 days up to 1 year forward
  const { startDate, endDate } = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const end = new Date();
    end.setDate(end.getDate() + 335);
    return { startDate: start, endDate: end };
  }, []);

  const heatmapValues = useMemo(() => {
    const vals = [];
    let cur = new Date(startDate);
    while (cur <= endDate) {
      vals.push({ date: new Date(cur) });
      cur.setDate(cur.getDate() + 1);
    }
    return vals;
  }, [startDate, endDate]);

  const remainingXp = Math.max(0, expNeed - currExp);

  return (
    <div className="page-dashboard">
      <div className="app-card">
        {/* Top System Header */}
        <header className="app-header">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <div className="brand-name">REPLOG</div>
              <div className="brand-subtitle">FITNESS OS</div>
            </div>
          </div>

          <div className="system-status-indicator">
            <span className="status-dot" />
            <span>SYSTEM ACTIVE</span>
            <span className="status-separator">/</span>
            <span className="system-date">{firstLoginDate}</span>
          </div>
        </header>

        {/* Level Up Celebration & Animation Canvas */}
        <LevelShow level={lvl} triggerAnim={didLevelUp} onComplete={clearLevelUp} />

        {/* Minimal Level & XP Block */}
        <div className="dashboard-level-section">
          <div className="level-badge-clean">
            <span className="level-label-small">LEVEL</span>
            <span className="level-number-huge">{String(lvl).padStart(2, '0')}</span>
          </div>

          <div className="xp-container-clean">
            <div className="xp-meta-row">
              <span className="xp-title-clean">EXPERIENCE PROGRESS</span>
              <span className="xp-ratio-mono">
                <strong>{currExp.toLocaleString()}</strong> / {expNeed.toLocaleString()} XP
              </span>
            </div>

            <div className="xp-bar-track-clean">
              <div
                className="xp-bar-fill-clean"
                style={{ width: `${Math.min(100, Math.max(1, (currExp / expNeed) * 100))}%` }}
              />
            </div>

            <div className="xp-sub-row">
              <span className="xp-remaining-clean">
                {remainingXp.toLocaleString()} XP TO LEVEL {lvl + 1}
              </span>
              <span className="xp-pct-clean">
                {Math.round((currExp / expNeed) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Primary Metrics Grid (Today, Session, Streak, Next Level) */}
        <div className="dashboard-metrics-grid">
          <div className="metric-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="metric-label">CURRENT SPLIT</span>
              <span className="status-dot" style={{ width: '4px', height: '4px' }} />
            </div>
            <div className="metric-value-clean" style={{ fontSize: '1.1rem', color: '#F4F7FA', letterSpacing: '0.01em' }}>
              {activeSplit?.name || 'Standard Split'}
            </div>
            <span className="metric-caption">PROGRAMMED PROTOCOL</span>
          </div>

          <div className="metric-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="metric-label">TOTAL SESSIONS</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SYS:LOG</span>
            </div>
            <div className="metric-value-clean">
              {String(completedDates.length).padStart(2, '0')}
            </div>
            <span className="metric-caption">COMPLETED WORKOUTS</span>
          </div>

          <div className="metric-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="metric-label">CURRENT STREAK</span>
              <span style={{ fontSize: '9px', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>+100% ACT</span>
            </div>
            <div className="metric-value-clean">
              {String(streak).padStart(2, '0')} <span className="metric-unit">DAYS</span>
            </div>
            <span className="metric-caption">CONSISTENCY SCORE</span>
          </div>

          <div className="metric-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="metric-label">NEXT MILESTONE</span>
              <span style={{ fontSize: '9px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>LVL {lvl + 1}</span>
            </div>
            <div className="metric-value-clean" style={{ color: 'var(--accent)' }}>
              +{remainingXp.toLocaleString()} <span className="metric-unit">XP</span>
            </div>
            <span className="metric-caption">PROGRESS THRESHOLD</span>
          </div>
        </div>

        {/* Activity Section Header */}
        <div className="section-header" style={{ marginTop: '32px' }}>
          <div className="section-title-group">
            <span className="section-dot" />
            <div>
              <h3 className="section-title">ACTIVITY</h3>
              <p className="section-subtitle">LAST 30 DAYS / YEAR PROGRESSION</p>
            </div>
          </div>

          <div className="section-actions">
            <button
              className="btn-secondary"
              onClick={() => navigate('/workout')}
            >
              WORKOUT HUB →
            </button>
            <button
              className={`btn-primary ${isTodayDone ? 'btn-primary--done' : ''}`}
              onClick={() => logSession(todayStr, yesterStr)}
              disabled={isTodayDone}
            >
              {isTodayDone ? '✓ SESSION LOGGED' : '+ LOG SESSION'}
            </button>
          </div>
        </div>

        {/* Activity Heatmap Grid */}
        <div className="activity-grid-wrap">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={heatmapValues}
            transformDayElement={(element, value) => {
              if (!value?.date) return element;
              const ds = getLocalDateStr(value.date);
              const done = completedDates.includes(ds);
              const today = ds === todayStr;

              return React.cloneElement(element, {
                'data-tooltip-id': 'heatmap-tip',
                'data-tooltip-content': done ? `${ds} • Session Completed` : today ? `${ds} • Today (Click to log)` : ds,
                style: {
                  fill: done ? 'var(--accent)' : today ? 'var(--surface-elevated)' : 'var(--surface)',
                  stroke: done ? 'var(--accent)' : today ? 'var(--accent)' : 'var(--border)',
                  strokeWidth: today ? '1.5px' : '0.5px',
                  cursor: today && !isTodayDone ? 'pointer' : 'default',
                  pointerEvents: today ? 'auto' : 'none',
                  rx: '3px',
                  ry: '3px',
                  opacity: done ? 1 : today ? 0.85 : 0.45,
                  transition: 'all 0.15s ease-out',
                },
                onClick: () => logSession(ds, yesterStr),
              });
            }}
          />

          <div className="heatmap-legend-clean">
            <span className="legend-label">INTENSITY</span>
            <div className="legend-cells">
              <span className="legend-cell" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
              <span className="legend-cell" style={{ background: 'var(--cyan-mid)', border: '1px solid var(--border)' }} />
              <span className="legend-cell" style={{ background: 'var(--accent-glow)', border: '1px solid var(--border)' }} />
              <span className="legend-cell" style={{ background: 'var(--accent)' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-meta">
            <span className="footer-system-label">FITNESS OS</span>
            <span className="footer-version">v2.4.0 — PRODUCTION</span>
          </div>

          <div className="footer-actions">
            <button
              className="btn-text"
              onClick={() => {
                clearLevelUp();
                setTimeout(() => useAppStore.setState({ didLevelUp: true }), 10);
              }}
            >
              TEST LEVEL CELEBRATION
            </button>
            <button
              className="btn-danger-subtle"
              onClick={() => resetGamification(todayStr)}
            >
              RESET DATA
            </button>
          </div>
        </footer>
      </div>

      <Tooltip
        id="heatmap-tip"
        style={{
          backgroundColor: '#121821',
          color: '#F2F6FA',
          border: '1px solid #1C2633',
          borderRadius: '8px',
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
          padding: '6px 10px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        }}
      />
    </div>
  );
}
