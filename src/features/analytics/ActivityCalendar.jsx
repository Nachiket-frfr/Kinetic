import React, { useState } from 'react';
import useAppStore from '../../store/useAppStore';

export default function ActivityCalendar() {
  const { completedDates, sessionHistory, completedWorkouts = [] } = useAppStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Build calendar matrix
  const daysArray = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  // Check if a day has an actual completed workout from user records
  const isDayTrained = (dayNum) => {
    if (!dayNum) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return Boolean(
      completedDates?.includes(dateStr) ||
      completedWorkouts?.some((w) => w.date === dateStr) ||
      sessionHistory?.some((s) => s.date === dateStr)
    );
  };

  // Monthly count
  let monthlyWorkoutCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (isDayTrained(d)) monthlyWorkoutCount++;
  }

  const selectedDayDateStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null;
  const selectedDayWorkouts = selectedDayDateStr
    ? completedWorkouts?.filter((w) => w.date === selectedDayDateStr)
    : [];
  const selectedDaySessions = selectedDayDateStr
    ? sessionHistory?.filter((s) => s.date === selectedDayDateStr)
    : [];

  return (
    <div className="activity-calendar-card">
      {/* Calendar Header with Controls */}
      <div className="calendar-header-bar">
        <div>
          <span className="brand-subtitle">TRAINING LOG</span>
          <h4 className="calendar-month-title">
            {monthNames[month]} {year}
          </h4>
        </div>

        <div className="calendar-nav-controls">
          <button type="button" className="btn-calendar-nav" onClick={handlePrevMonth} title="Previous Month">
            ‹
          </button>
          <button type="button" className="btn-calendar-nav" onClick={handleNextMonth} title="Next Month">
            ›
          </button>
        </div>
      </div>

      {/* Weekday Labels Header */}
      <div className="calendar-weekdays-row">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
          <span key={idx} className="calendar-weekday-cell">{day}</span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="calendar-days-grid">
        {daysArray.map((dayNum, idx) => {
          if (!dayNum) {
            return <div key={`empty-${idx}`} className="calendar-day-cell empty" />;
          }

          const trained = isDayTrained(dayNum);
          const isSelected = selectedDay === dayNum;

          return (
            <div
              key={`day-${dayNum}`}
              className={`calendar-day-cell ${trained ? 'is-trained' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedDay(dayNum)}
            >
              <div className={`day-number-bubble ${trained ? 'trained-bubble' : ''}`}>
                {dayNum}
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Summary Strip */}
      <div className="calendar-summary-strip">
        <div className="cal-stat-item">
          <span className="cal-stat-icon">🏋️‍♂️</span>
          <span className="cal-stat-text">
            <strong>{monthlyWorkoutCount} WORKOUTS</strong> IN {monthNames[month].slice(0, 3)}
          </span>
        </div>
        <div className="cal-legend">
          <span className="legend-dot" />
          <span className="legend-text">COMPLETED SESSION</span>
        </div>
      </div>

      {/* Selected Day Details Drawer */}
      {selectedDay && (
        <div className="calendar-day-detail-box">
          <div className="detail-box-top">
            <span className="detail-date-tag">
              {monthNames[month]} {selectedDay}, {year}
            </span>
            <button className="btn-close-subtle" onClick={() => setSelectedDay(null)}>✕</button>
          </div>

          {selectedDayWorkouts && selectedDayWorkouts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              {selectedDayWorkouts.map((workout, wIdx) => (
                <div key={workout.id || wIdx} className="day-logged-info" style={{ border: workout.isPRDay ? '1px solid rgba(255, 179, 0, 0.4)' : undefined }}>
                  <div className="logged-workout-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {workout.isPRDay || (workout.prCount > 0) ? (
                        <span
                          style={{
                            background: 'linear-gradient(135deg, rgba(255, 179, 0, 0.25), rgba(255, 140, 0, 0.15))',
                            border: '1px solid rgba(255, 180, 0, 0.5)',
                            color: '#FFB300',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          ⚡ PR DAY {workout.prCount > 1 ? `(${workout.prCount} PRs)` : ''}
                        </span>
                      ) : (
                        <span className="workout-badge-blue">LOGGED SESSION</span>
                      )}
                      <h5 className="workout-day-title" style={{ margin: 0 }}>
                        {(workout.title || 'WORKOUT').toUpperCase()}
                      </h5>
                    </div>
                    {workout.time && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {workout.time}
                      </span>
                    )}
                  </div>

                  <div className="logged-stats-row" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <span>⚡ {(workout.volumeKg || 0).toLocaleString()} kg Volume</span>
                    <span>✓ {workout.setsCount || 0} Sets</span>
                    {workout.duration && <span>⏱ {workout.duration}</span>}
                    {workout.avgFormScore && <span>★ {workout.avgFormScore}% Form</span>}
                  </div>

                  {workout.exercises && workout.exercises.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {workout.exercises.map((ex, eIdx) => (
                        <span
                          key={eIdx}
                          style={{
                            fontSize: '10px',
                            background: 'var(--surface-elevated, #232427)',
                            border: ex.isPR ? '1px solid rgba(255, 179, 0, 0.4)' : '1px solid var(--border)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {ex.title || ex.key} ({ex.setsCount || 1}s{ex.volume ? ` • ${ex.volume.toLocaleString()}kg` : ''}) {ex.isPR ? '🏆' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {workout.prList && workout.prList.length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '10px', color: '#FFB300' }}>
                      🏆 <strong>New PR:</strong> {workout.prList.join(' • ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : selectedDaySessions && selectedDaySessions.length > 0 ? (
            <div className="day-logged-info">
              <div className="logged-workout-header">
                <span className="workout-badge-blue">LOGGED SESSION</span>
                <h5 className="workout-day-title">
                  {selectedDaySessions[0]?.exercise ? selectedDaySessions[0].exercise.toUpperCase() : 'WORKOUT SESSION'}
                </h5>
              </div>
              <div className="logged-stats-row">
                <span>✓ {selectedDaySessions.length} Sets Logged</span>
                <span>
                  ⚡ {selectedDaySessions.reduce((acc, s) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0).toLocaleString()} kg Volume
                </span>
                {selectedDaySessions[0]?.formScore && (
                  <span>★ {selectedDaySessions[0].formScore}% Form</span>
                )}
              </div>
            </div>
          ) : isDayTrained(selectedDay) ? (
            <div className="day-logged-info">
              <div className="logged-workout-header">
                <span className="workout-badge-blue">COMPLETED SESSION</span>
                <h5 className="workout-day-title">Workout Completed</h5>
              </div>
            </div>
          ) : (
            <div className="day-rest-info">
              <span>No workout recorded.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
