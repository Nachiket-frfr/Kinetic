import React from 'react';
import useAppStore from '../../store/useAppStore';

export default function WeeklyBarChart() {
  const { sessionHistory, completedDates } = useAppStore();

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Map current week dates
  const now = new Date();
  const currentDay = (now.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDay);

  const weekData = daysOfWeek.map((label, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateStr = d.toISOString().slice(0, 10);
    const daySessions = sessionHistory?.filter((s) => s.date === dateStr) || [];
    const hasWorkout = Boolean(completedDates?.includes(dateStr) || daySessions.length > 0);
    
    // Calculate actual volume from real logged sets
    const volume = daySessions.reduce((acc, s) => {
      return acc + (Number(s.weight) || 0) * (Number(s.reps) || 0);
    }, 0);

    return {
      day: label,
      fullName: fullDayNames[idx],
      dateStr,
      hasWorkout,
      volume,
      isToday: idx === currentDay,
    };
  });

  const maxVolume = Math.max(...weekData.map((w) => w.volume), 100);
  const totalWeekVolume = weekData.reduce((acc, w) => acc + w.volume, 0);
  const workoutDaysCount = weekData.filter((w) => w.hasWorkout).length;

  return (
    <div className="weekly-barchart-card">
      <div className="barchart-header">
        <div>
          <span className="brand-subtitle">THIS WEEK</span>
          <h4 className="barchart-title">WEEKLY ACTIVITY &amp; VOLUME</h4>
        </div>
        <div className="barchart-metric-badge">
          <span className="barchart-badge-val">{workoutDaysCount} / 7 DAYS</span>
        </div>
      </div>

      <div className="barchart-bars-container">
        {weekData.map((item, idx) => {
          const heightPct = item.volume > 0 ? Math.max(18, Math.round((item.volume / maxVolume) * 100)) : 8;
          const isTrained = item.hasWorkout;

          return (
            <div key={idx} className={`barchart-col ${item.isToday ? 'is-today' : ''}`}>
              <div className="barchart-bar-track">
                <div
                  className={`barchart-bar-fill ${isTrained ? 'active-trained' : 'rest-day'}`}
                  style={{ height: `${heightPct}%` }}
                >
                  {isTrained && <span className="barchart-bar-glow" />}
                </div>
              </div>
              <span className={`barchart-day-label ${item.isToday ? 'today-label' : ''}`}>
                {item.day}
              </span>
            </div>
          );
        })}
      </div>

      <div className="barchart-footer-summary">
        <div className="barchart-footer-stat">
          <span className="stat-caption">WEEKLY VOLUME</span>
          <span className="stat-num" style={{ color: 'var(--accent, #158FF2)' }}>
            {totalWeekVolume.toLocaleString()} KG
          </span>
        </div>
        <div className="barchart-footer-stat">
          <span className="stat-caption">CONSISTENCY</span>
          <span className="stat-num" style={{ color: 'var(--success, #35C77A)' }}>
            {Math.round((workoutDaysCount / 7) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
