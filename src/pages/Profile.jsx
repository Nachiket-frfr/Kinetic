import React, { useState, useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import MuscleRadarChart from '../features/analytics/MuscleRadarChart';
import MuscleHeatmap from '../features/analytics/MuscleHeatmap';
import WeeklyBarChart from '../features/analytics/WeeklyBarChart';
import LevelUpModal from '../features/gamification/LevelUpModal';
import { getExpNeeded } from '../features/gamification/levels';
import CalendarHeatmap from 'react-calendar-heatmap';
import { Tooltip } from 'react-tooltip';
import 'react-calendar-heatmap/dist/styles.css';
import aceExercises from '../data/aceExercises.json';
import exercisesData from '../data/exercises.json';

/* ── Helpers ── */
const MUSCLE_MAP = {};
Object.entries(aceExercises).forEach(([key, ex]) => {
  const muscles = [...(ex.primaryMuscles || []), ...(ex.secondaryMuscles || [])];
  MUSCLE_MAP[key] = muscles.map(m => m.toLowerCase());
});

// Map exercises from exercisesData as well
Object.entries(exercisesData).forEach(([key, ex]) => {
  if (!MUSCLE_MAP[key]) {
    const cat = (ex.category || '').toLowerCase();
    const list = [];
    if (cat.includes('chest') || cat.includes('push')) list.push('pectoralis major', 'triceps');
    if (cat.includes('back') || cat.includes('pull')) list.push('latissimus dorsi', 'biceps');
    if (cat.includes('shoulder')) list.push('deltoids', 'triceps');
    if (cat.includes('leg') || cat.includes('squat')) list.push('quadriceps', 'glutes');
    if (cat.includes('core') || cat.includes('abs')) list.push('rectus abdominis', 'obliques');
    MUSCLE_MAP[key] = list;
  }
});

// Short key aliases
MUSCLE_MAP['bench-press'] = MUSCLE_MAP['bench-press'] || ['pectoralis major', 'triceps', 'deltoids'];
MUSCLE_MAP['barbell-bench-press'] = MUSCLE_MAP['barbell-bench-press'] || ['pectoralis major', 'triceps', 'deltoids'];
MUSCLE_MAP['squat'] = MUSCLE_MAP['squat'] || ['quadriceps', 'gluteus maximus', 'hamstrings'];
MUSCLE_MAP['pushup'] = MUSCLE_MAP['pushup'] || ['pectoralis major', 'triceps', 'deltoids'];
MUSCLE_MAP['deadlift'] = MUSCLE_MAP['deadlift'] || ['erector spinae', 'hamstrings', 'glutes', 'trapezius'];
MUSCLE_MAP['shoulderPress'] = MUSCLE_MAP['shoulderPress'] || ['deltoids', 'triceps'];
MUSCLE_MAP['bicepCurl'] = MUSCLE_MAP['bicepCurl'] || ['biceps', 'forearms'];

const MUSCLE_GROUPS = {
  back:      ['latissimus dorsi', 'lats', 'rhomboids', 'trapezius', 'traps', 'erector spinae', 'back'],
  chest:     ['pectoralis major', 'pectoralis minor', 'pectorals', 'chest'],
  core:      ['rectus abdominis', 'obliques', 'transverse abdominis', 'abdominals', 'core', 'abs'],
  shoulders: ['deltoids', 'anterior deltoid', 'posterior deltoid', 'lateral deltoid', 'shoulders', 'deltoid'],
  arms:      ['biceps', 'triceps', 'brachialis', 'forearms', 'biceps brachii', 'triceps brachii', 'arms'],
  legs:      ['quadriceps', 'hamstrings', 'glutes', 'gluteus maximus', 'calves', 'hip flexors', 'adductors', 'legs'],
};

function classifyMuscle(muscleName) {
  const lower = muscleName.toLowerCase();
  for (const [group, keywords] of Object.entries(MUSCLE_GROUPS)) {
    if (keywords.some(kw => lower.includes(kw))) return group;
  }
  return null;
}

function computeMuscleDistribution(sessions, daysBack = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const dist = { back: 0, chest: 0, core: 0, shoulders: 0, arms: 0, legs: 0 };
  sessions.forEach(s => {
    if (s.date < cutoffStr) return;
    const volume = (s.reps || 1) * (s.weight || 1);
    const muscles = MUSCLE_MAP[s.exercise] || [];
    muscles.forEach(m => {
      const group = classifyMuscle(m);
      if (group) dist[group] += volume;
    });
  });

  const max = Math.max(...Object.values(dist), 1);
  const normalized = {};
  for (const k of Object.keys(dist)) normalized[k] = Math.round((dist[k] / max) * 100);
  return normalized;
}

function formatDuration(sessions) {
  const totalMin = sessions.length * 3;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

const getLocalDateStr = (d = new Date()) => {
  const dateObj = new Date(d);
  return [
    dateObj.getFullYear(),
    String(dateObj.getMonth() + 1).padStart(2, '0'),
    String(dateObj.getDate()).padStart(2, '0'),
  ].join('-');
};

/* ── Weight Chart (mini line chart) ── */
function WeightChart({ history, period }) {
  if (!history || history.length === 0) {
    return <div className="profile-chart-empty">No weight data yet</div>;
  }

  const cutoff = new Date();
  if (period === '3m') cutoff.setMonth(cutoff.getMonth() - 3);
  else if (period === '6m') cutoff.setMonth(cutoff.getMonth() - 6);
  else cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const filtered = history.filter(e => e.date >= cutoffStr).sort((a, b) => a.date.localeCompare(b.date));
  if (filtered.length === 0) return <div className="profile-chart-empty">No data in this period</div>;

  const weights = filtered.map(e => e.weightKg);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;

  const W = 320, H = 120, PAD = 30;
  const plotW = W - PAD * 2;
  const plotH = H - PAD;

  const points = filtered.map((e, i) => {
    const x = PAD + (filtered.length === 1 ? plotW / 2 : (i / (filtered.length - 1)) * plotW);
    const y = PAD / 2 + plotH - ((e.weightKg - minW) / range) * plotH;
    return { x, y, entry: e };
  });

  const ticks = [minW, (minW + maxW) / 2, maxW].map(v => Math.round(v * 10) / 10);

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="weight-chart-svg">
      {ticks.map((t, i) => {
        const y = PAD / 2 + plotH - ((t - minW) / range) * plotH;
        return (
          <g key={i}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD - 4} y={y} textAnchor="end" fill="#62626F" fontSize="9" dominantBaseline="central" fontFamily="-apple-system, sans-serif">{t}kg</text>
          </g>
        );
      })}
      {points.length > 1 && (
        <polyline
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#158FF2"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#158FF2" stroke="#000000" strokeWidth="2" />
      ))}
      {filtered.length > 0 && (
        <>
          <text x={points[0].x} y={H + 10} textAnchor="middle" fill="#62626F" fontSize="9" fontFamily="-apple-system, sans-serif">
            {filtered[0].date.slice(5).replace('-', '/')}
          </text>
          {filtered.length > 1 && (
            <text x={points[points.length - 1].x} y={H + 10} textAnchor="middle" fill="#62626F" fontSize="9" fontFamily="-apple-system, sans-serif">
              {filtered[filtered.length - 1].date.slice(5).replace('-', '/')}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

/* ══════════════════════════════════════
   PROFILE PAGE
   ══════════════════════════════════════ */
export default function Profile() {
  const {
    athleteProfile,
    updateAthleteProfile,
    sessionHistory,
    completedWorkouts = [],
    completedDates,
    streak,
    lvl,
    currExp,
    didLevelUp,
    clearLevelUp,
    logSession,
    weightHistory = [],
    progressPhotos = [],
    measurements = {},
    addWeightEntry,
    deleteWeightEntry,
    addProgressPhoto,
    removeProgressPhoto,
    clearAllData,
  } = useAppStore();

  const expNeed = getExpNeeded(lvl);

  const [activeTab, setActiveTab] = useState('stats');
  const [measureTab, setMeasureTab] = useState('weight');
  const [chartPeriod, setChartPeriod] = useState('3m');
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWaist, setNewWaist] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(athleteProfile?.name || 'Athlete');
  const [profileBio, setProfileBio] = useState(athleteProfile?.title || '');

  // Date helpers for heatmap & log session
  const todayStr = useMemo(() => getLocalDateStr(), []);
  const yesterStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getLocalDateStr(y);
  }, []);
  const isTodayDone = completedDates.includes(todayStr);

  // Activity Heatmap data — past 12 months
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
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

  // Compute muscle distribution
  const currentDist = useMemo(() => computeMuscleDistribution(sessionHistory, 30), [sessionHistory]);
  const previousDist = useMemo(() => computeMuscleDistribution(sessionHistory, 60), [sessionHistory]);

  // Workouts summaries for Profile (from completedWorkouts or synthesized from sessionHistory)
  const resolvedWorkouts = useMemo(() => {
    if (completedWorkouts && completedWorkouts.length > 0) {
      return completedWorkouts;
    }
    if (!sessionHistory || sessionHistory.length === 0) return [];

    const groupsByDate = {};
    sessionHistory.forEach((s) => {
      const d = s.date || 'Historical';
      if (!groupsByDate[d]) {
        groupsByDate[d] = {
          id: `synth-${d}`,
          date: d,
          time: 'Logged Session',
          title: `${(s.exercise || 'Workout').toUpperCase()} SESSION`,
          duration: `${Math.max(10, Math.round(sessionHistory.length * 2.5))} min`,
          durationSec: sessionHistory.length * 150,
          volumeKg: 0,
          setsCount: 0,
          isPRDay: false,
          prCount: 0,
          exercises: {},
          avgFormScore: 94,
        };
      }
      const g = groupsByDate[d];
      const vol = (Number(s.weight) || 0) * (Number(s.reps) || 0);
      g.volumeKg += vol;
      g.setsCount += 1;
      const exKey = s.exercise || 'General';
      if (!g.exercises[exKey]) {
        g.exercises[exKey] = {
          key: exKey,
          title: (s.exercise || 'Exercise').toUpperCase(),
          setsCount: 0,
          volume: 0,
          bestWeight: 0,
        };
      }
      g.exercises[exKey].setsCount += 1;
      g.exercises[exKey].volume += vol;
      g.exercises[exKey].bestWeight = Math.max(g.exercises[exKey].bestWeight, Number(s.weight) || 0);
    });

    return Object.values(groupsByDate).map((g) => ({
      ...g,
      exercises: Object.values(g.exercises),
    })).reverse();
  }, [completedWorkouts, sessionHistory]);

  // Summary stats
  const stats = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

    const recent = sessionHistory.filter(s => s.date >= cutoff);
    const rawVolume = recent.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);
    const completedVol = completedWorkouts.reduce((acc, w) => acc + (w.volumeKg || 0), 0);
    const totalVolume = Math.max(rawVolume, completedVol);
    const totalSets = Math.max(recent.length, completedWorkouts.reduce((acc, w) => acc + (w.setsCount || 0), 0));
    const uniqueDates = new Set([...recent.map(s => s.date), ...completedWorkouts.map(w => w.date)]);
    const workouts = Math.max(uniqueDates.size, completedWorkouts.length);
    const duration = formatDuration(recent);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const prevCutoff = sixtyDaysAgo.toISOString().slice(0, 10);
    const prev = sessionHistory.filter(s => s.date >= prevCutoff && s.date < cutoff);
    const prevVolume = prev.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);
    const prevSets = prev.length;
    const prevWorkouts = new Set(prev.map(s => s.date)).size;

    const prDaysCount = completedWorkouts.filter(w => w.isPRDay || (w.prCount > 0)).length;
    const totalPRs = completedWorkouts.reduce((acc, w) => acc + (w.prCount || 0), 0);

    return {
      workouts, duration, totalVolume, totalSets,
      volumeDelta: totalVolume - prevVolume,
      setsDelta: totalSets - prevSets,
      workoutsDelta: workouts - prevWorkouts,
      prDaysCount,
      totalPRs,
    };
  }, [sessionHistory, completedWorkouts]);

  const handleSaveWeight = () => {
    const wt = parseFloat(newWeight);
    if (isNaN(wt) || wt <= 0) return;
    const entry = { weightKg: wt, waistCm: newWaist ? parseFloat(newWaist) : null };
    if (addWeightEntry) addWeightEntry(entry);
    setNewWeight('');
    setNewWaist('');
    setShowAddWeight(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (addProgressPhoto) {
        addProgressPhoto({ dataUri: reader.result, caption: '' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    updateAthleteProfile({ name: profileName.trim(), title: profileBio.trim() });
    setEditingProfile(false);
  };

  const formatDelta = (val) => {
    if (val > 0) return <span className="delta-up">↑ {val.toLocaleString()}</span>;
    if (val < 0) return <span className="delta-down">↓ {Math.abs(val).toLocaleString()}</span>;
    return <span className="delta-flat">→ 0</span>;
  };

  return (
    <div className="page-profile">
      <div className="app-card">
        {/* ── Level Up Animation (GSAP) ── */}
        <LevelUpModal level={lvl} triggerAnim={didLevelUp} onComplete={clearLevelUp} />

        {/* ── Profile Header ── */}
        <div className="profile-header">
          <div className="profile-avatar">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21c0-4.418-3.582-7-8-7s-8 2.582-8 7" />
            </svg>
          </div>
          <div className="profile-info">
            {editingProfile ? (
              <div className="profile-edit-form">
                <input className="profile-name-input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Name" />
                <input className="profile-bio-input" value={profileBio} onChange={e => setProfileBio(e.target.value)} placeholder="Bio / Title" />
                <div className="profile-edit-actions">
                  <button className="btn-sm-primary" onClick={handleSaveProfile}>Save</button>
                  <button className="btn-sm-secondary" onClick={() => setEditingProfile(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="profile-name">{athleteProfile?.name || 'Athlete'}</h2>
                <p className="profile-bio">{athleteProfile?.title || 'Fitness Enthusiast'}</p>
                <div className="profile-meta-row">
                  <span className="profile-meta-chip">🔥 {streak} day streak</span>
                  <span className="profile-meta-chip">⚡ Level {lvl}</span>
                </div>
              </>
            )}
          </div>
          {!editingProfile && (
            <button className="profile-edit-btn" onClick={() => setEditingProfile(true)}>Edit</button>
          )}
        </div>

        {/* ── XP Progress Bar ── */}
        <div className="profile-xp-section">
          <div className="profile-xp-header">
            <span className="profile-xp-label">LEVEL {lvl} → {lvl + 1}</span>
            <span className="profile-xp-numbers">{currExp.toLocaleString()} / {expNeed.toLocaleString()} XP</span>
          </div>
          <div className="profile-xp-track">
            <div className="profile-xp-fill" style={{ width: `${Math.min(100, Math.max(1, (currExp / expNeed) * 100))}%` }}>
              <div className="profile-xp-shimmer" />
            </div>
          </div>
          <div className="profile-xp-footer">
            <span className="profile-xp-remaining">{remainingXp.toLocaleString()} XP to next level</span>
            <span className="profile-xp-pct">{Math.round((currExp / expNeed) * 100)}%</span>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="profile-tabs">
          <button className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Statistics</button>
          <button className={`profile-tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>Activity</button>
          <button className={`profile-tab ${activeTab === 'measurements' ? 'active' : ''}`} onClick={() => setActiveTab('measurements')}>Measurements</button>
          <button className={`profile-tab ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => setActiveTab('photos')}>Photos</button>
        </div>

        {/* ── Tab Content ── */}
        <div className="profile-content">

          {/* ══ STATISTICS TAB ══ */}
          {activeTab === 'stats' && (
            <div className="profile-stats-section">
              {/* Weekly Activity Bar Chart (Screen 24) */}
              <WeeklyBarChart />

              {/* Anatomical Muscle Heatmap (Screen 21, 26) */}
              <MuscleHeatmap />

              {/* Muscle Distribution Radar Chart */}
              <div className="profile-section-card">
                <div className="profile-section-header">
                  <h3 className="profile-section-title">Muscle Distribution</h3>
                  <span className="profile-period-badge">Last 30 days</span>
                </div>
                <MuscleRadarChart current={currentDist} previous={previousDist} />
              </div>

              {/* Summary Stats Grid */}
              <div className="profile-stats-grid">
                <div className="profile-stat-card">
                  <span className="profile-stat-label">Workouts</span>
                  <span className="profile-stat-value">{stats.workouts}</span>
                  <span className="profile-stat-delta">{formatDelta(stats.workoutsDelta)}</span>
                </div>
                <div className="profile-stat-card">
                  <span className="profile-stat-label">Duration</span>
                  <span className="profile-stat-value">{stats.duration}</span>
                  <span className="profile-stat-delta" style={{ color: 'var(--text-muted)' }}>est.</span>
                </div>
                <div className="profile-stat-card">
                  <span className="profile-stat-label">Volume</span>
                  <span className="profile-stat-value">
                    {stats.totalVolume > 1000 ? `${Math.round(stats.totalVolume / 1000)}k kg` : `${stats.totalVolume} kg`}
                  </span>
                  <span className="profile-stat-delta">{formatDelta(stats.volumeDelta)}</span>
                </div>
                <div className="profile-stat-card">
                  <span className="profile-stat-label">Sets</span>
                  <span className="profile-stat-value">{stats.totalSets}</span>
                  <span className="profile-stat-delta">{formatDelta(stats.setsDelta)}</span>
                </div>
                <div className="profile-stat-card">
                  <span className="profile-stat-label">PR Days</span>
                  <span className="profile-stat-value" style={{ color: stats.prDaysCount > 0 ? '#FFB300' : undefined }}>
                    {stats.prDaysCount}
                  </span>
                  <span className="profile-stat-delta" style={{ color: '#FFB300' }}>
                    {stats.totalPRs > 0 ? `${stats.totalPRs} PRs Broken` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ══ ACTIVITY TAB ══ */}
          {activeTab === 'activity' && (
            <div className="profile-activity-section">
              {/* Log Session Button */}
              <div className="profile-section-card">
                <div className="profile-section-header">
                  <h3 className="profile-section-title">Today's Session</h3>
                  <button
                    className={`btn-sm-primary ${isTodayDone ? 'btn-done' : ''}`}
                    onClick={() => logSession(todayStr, yesterStr)}
                    disabled={isTodayDone}
                    style={isTodayDone ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
                  >
                    {isTodayDone ? '✓ LOGGED' : '+ LOG SESSION'}
                  </button>
                </div>

                <div className="profile-stats-grid" style={{ marginTop: 8 }}>
                  <div className="profile-stat-card">
                    <span className="profile-stat-label">Total Sessions</span>
                    <span className="profile-stat-value">{completedDates.length}</span>
                  </div>
                  <div className="profile-stat-card">
                    <span className="profile-stat-label">Current Streak</span>
                    <span className="profile-stat-value">{streak} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>days</span></span>
                  </div>
                </div>
              </div>

              {/* Activity Heatmap */}
              <div className="profile-section-card">
                <div className="profile-section-header">
                  <h3 className="profile-section-title">Activity Calendar</h3>
                  <span className="profile-period-badge">LAST 12 MONTHS</span>
                </div>

                <div className="activity-grid-wrap">
                  <CalendarHeatmap
                    startDate={startDate}
                    endDate={endDate}
                    values={heatmapValues}
                    horizontal={true}
                    showMonthLabels={true}
                    showWeekdayLabels={true}
                    gutterSize={3}
                    monthLabels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
                    weekdayLabels={['', 'Mon', '', 'Wed', '', 'Fri', '']}
                    classForValue={(value) => {
                      if (!value?.date) return 'color-empty';
                      const ds = getLocalDateStr(value.date);
                      return completedDates.includes(ds) ? 'color-scale-4' : 'color-empty';
                    }}
                    transformDayElement={(element, value) => {
                      if (!value?.date) return element;
                      const ds = getLocalDateStr(value.date);
                      const done = completedDates.includes(ds);
                      const today = ds === todayStr;

                      return React.cloneElement(element, {
                        'data-tooltip-id': 'heatmap-tip',
                        'data-tooltip-content': done ? `${ds} • Session Completed` : today ? `${ds} • Today` : ds,
                        style: {
                          fill: done ? '#158FF2' : today ? 'var(--surface-elevated)' : 'var(--surface)',
                          stroke: done ? '#158FF2' : today ? '#158FF2' : 'var(--border)',
                          strokeWidth: today ? '1.5px' : '0.5px',
                          cursor: today && !isTodayDone ? 'pointer' : 'default',
                          pointerEvents: today ? 'auto' : 'none',
                          rx: '2px',
                          ry: '2px',
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
              </div>

              {/* Completed Workout Sessions List */}
              <div className="profile-section-card">
                <div className="profile-section-header">
                  <h3 className="profile-section-title">Workout History &amp; Summaries</h3>
                  <span className="profile-period-badge">
                    {resolvedWorkouts.length} SESSIONS RECORDED
                  </span>
                </div>

                {resolvedWorkouts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    {resolvedWorkouts.map((workout, idx) => (
                      <div
                        key={workout.id || idx}
                        style={{
                          background: 'var(--surface-secondary, #141517)',
                          border: workout.isPRDay ? '1px solid rgba(255, 179, 0, 0.45)' : '1px solid var(--border, #2A2B2E)',
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary, #E4E6E9)' }}>
                              {(workout.title || 'WORKOUT SESSION').toUpperCase()}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #767472)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                              {workout.date} {workout.time ? `• ${workout.time}` : ''}
                            </div>
                          </div>

                          {workout.isPRDay || (workout.prCount > 0) ? (
                            <span
                              style={{
                                background: 'linear-gradient(135deg, rgba(255, 179, 0, 0.25), rgba(255, 140, 0, 0.15))',
                                border: '1px solid rgba(255, 180, 0, 0.55)',
                                color: '#FFB300',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '14px',
                                fontFamily: 'var(--font-mono)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              ⚡ PR DAY {workout.prCount > 1 ? `(${workout.prCount} PRs)` : ''}
                            </span>
                          ) : (
                            <span
                              style={{
                                background: 'rgba(21, 143, 242, 0.1)',
                                border: '1px solid rgba(21, 143, 242, 0.25)',
                                color: 'var(--accent, #158FF2)',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              ✓ COMPLETED
                            </span>
                          )}
                        </div>

                        {/* 4 Metrics Strip */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '6px',
                            background: 'var(--surface, #1B1C1E)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #232427)',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>VOLUME</div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent, #158FF2)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                              {(workout.volumeKg || 0).toLocaleString()} kg
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TIME</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                              {workout.duration || `${Math.round((workout.durationSec || 600) / 60)}m`}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SETS</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                              {workout.setsCount || 0}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>FORM</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#30D158', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                              {workout.avgFormScore || 95}%
                            </div>
                          </div>
                        </div>

                        {/* Exercise breakdown */}
                        {workout.exercises && workout.exercises.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {workout.exercises.map((ex, exI) => (
                              <span
                                key={exI}
                                style={{
                                  fontSize: '10px',
                                  background: 'var(--surface-elevated, #232427)',
                                  border: ex.isPR ? '1px solid rgba(255, 179, 0, 0.45)' : '1px solid var(--border, #2A2B2E)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>{ex.title || ex.key}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                                  ({ex.setsCount || 1}s{ex.volume ? ` • ${ex.volume.toLocaleString()}kg` : ''})
                                </span>
                                {ex.isPR && <span style={{ color: '#FFB300', fontSize: '9px' }}>🏆 PR</span>}
                              </span>
                            ))}
                          </div>
                        )}

                        {workout.prList && workout.prList.length > 0 && (
                          <div
                            style={{
                              background: 'rgba(255, 179, 0, 0.08)',
                              border: '1px dashed rgba(255, 179, 0, 0.3)',
                              borderRadius: '4px',
                              padding: '5px 8px',
                              fontSize: '10px',
                              color: '#FFB300',
                            }}
                          >
                            🏆 <strong>New PR:</strong> {workout.prList.join(' • ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No completed workouts recorded yet.
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="profile-actions-row">
                <button
                  className="btn-sm-secondary"
                  onClick={() => {
                    clearLevelUp();
                    setTimeout(() => useAppStore.setState({ didLevelUp: true }), 10);
                  }}
                >
                  ⚡ TEST LEVEL UP
                </button>
                <button
                  className="btn-sm-secondary"
                  style={{ color: '#FF453A', borderColor: 'rgba(255,69,58,0.3)' }}
                  onClick={() => {
                    if (window.confirm('Reset all fitness data, workouts, and measurements back to clean factory state?')) {
                      clearAllData();
                    }
                  }}
                >
                  RESET ALL DATA
                </button>
              </div>
            </div>
          )}

          {/* ══ MEASUREMENTS TAB ══ */}
          {activeTab === 'measurements' && (
            <div className="profile-measurements-section">
              {/* Current Weight Display */}
              <div className="profile-current-measure">
                <div>
                  <span className="profile-current-value">
                    {measurements?.currentWeightKg || '—'}kg
                  </span>
                  {weightHistory.length > 0 && (
                    <span className="profile-current-date">
                      {' '}{weightHistory[weightHistory.length - 1]?.date?.replace(/-/g, ' ')}
                    </span>
                  )}
                </div>
                <div className="profile-period-selector">
                  {['3m', '6m', '1y'].map(p => (
                    <button
                      key={p}
                      className={`profile-period-btn ${chartPeriod === p ? 'active' : ''}`}
                      onClick={() => setChartPeriod(p)}
                    >
                      {p === '3m' ? 'Last 3 months' : p === '6m' ? 'Last 6 months' : 'Last year'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight Chart */}
              <div className="profile-chart-wrap">
                <WeightChart history={weightHistory} period={chartPeriod} />
              </div>

              {/* Weight / Waist Toggle */}
              <div className="measure-toggle-row">
                <button className={`measure-toggle-btn ${measureTab === 'weight' ? 'active' : ''}`} onClick={() => setMeasureTab('weight')}>Weight</button>
                <button className={`measure-toggle-btn ${measureTab === 'waist' ? 'active' : ''}`} onClick={() => setMeasureTab('waist')}>Waist</button>
              </div>

              {/* Weight History */}
              <div className="profile-section-card">
                <div className="profile-section-header">
                  <h3 className="profile-section-title">
                    {measureTab === 'weight' ? 'Weight History' : 'Waist History'}
                  </h3>
                  <button className="btn-sm-primary" onClick={() => setShowAddWeight(true)}>+ Add</button>
                </div>

                {showAddWeight && (
                  <div className="add-weight-form">
                    <div className="add-weight-fields">
                      <label className="add-weight-label">
                        <span>Weight (kg)</span>
                        <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="add-weight-input" placeholder="55" autoFocus />
                      </label>
                      <label className="add-weight-label">
                        <span>Waist (cm)</span>
                        <input type="number" step="0.1" value={newWaist} onChange={e => setNewWaist(e.target.value)} className="add-weight-input" placeholder="optional" />
                      </label>
                    </div>
                    <div className="add-weight-actions">
                      <button className="btn-sm-primary" onClick={handleSaveWeight}>Save</button>
                      <button className="btn-sm-secondary" onClick={() => setShowAddWeight(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                <div className="weight-history-list">
                  {[...weightHistory].reverse().map((entry, i) => (
                    <div key={i} className="weight-history-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="weight-history-date">{entry.date}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="weight-history-value">
                          {measureTab === 'weight' ? `${entry.weightKg}kg` : entry.waistCm ? `${entry.waistCm}cm` : '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteWeightEntry(entry.date)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#FF453A',
                            cursor: 'pointer',
                            fontSize: '13px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            lineHeight: 1,
                          }}
                          title="Delete entry"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {weightHistory.length === 0 && (
                    <div className="weight-history-empty">No entries yet. Tap "+ Add" to log your first measurement.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ PHOTOS TAB ══ */}
          {activeTab === 'photos' && (
            <div className="profile-photos-section">
              <div className="profile-section-card">
                <div className="profile-section-header">
                  <h3 className="profile-section-title">Progress Pictures</h3>
                  <label className="btn-sm-primary" style={{ cursor: 'pointer' }}>
                    + Add Photo
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  </label>
                </div>

                {progressPhotos.length === 0 ? (
                  <div className="photos-empty-state">
                    <span style={{ fontSize: 32, opacity: 0.4 }}>📷</span>
                    <p>Track your transformation. Add progress photos to see changes over time.</p>
                  </div>
                ) : (
                  <div className="photos-grid">
                    {progressPhotos.map((photo) => (
                      <div key={photo.id} className="photo-card">
                        <img src={photo.dataUri} alt="Progress" className="photo-img" />
                        <div className="photo-date-overlay">{photo.date}</div>
                        <button className="photo-delete-btn" onClick={() => removeProgressPhoto && removeProgressPhoto(photo.id)} title="Remove photo">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
