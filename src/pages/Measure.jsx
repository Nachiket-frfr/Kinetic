import { useState, useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import ActivityCalendar from '../features/analytics/ActivityCalendar';
import WeightChart from '../features/analytics/WeightChart';
import MacrosCalculator from './MacrosCalculator';

export default function Measure() {
  const {
    weightHistory = [],
    measurements = {},
    addWeightEntry,
    deleteWeightEntry,
    progressPhotos = [],
    addProgressPhoto,
    removeProgressPhoto,
    completedWorkouts = [],
    sessionHistory = [],
  } = useAppStore();

  const totalVolume = useMemo(() => {
    const fromCompleted = completedWorkouts.reduce((acc, w) => acc + (w.volumeKg || 0), 0);
    const fromHistory = sessionHistory.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);
    return Math.max(fromCompleted, fromHistory);
  }, [completedWorkouts, sessionHistory]);

  const totalPRDays = useMemo(() => {
    return completedWorkouts.filter((w) => w.isPRDay || (w.prCount > 0)).length;
  }, [completedWorkouts]);

  const totalSessionsCount = useMemo(() => {
    const dates = new Set([...completedWorkouts.map((w) => w.date), ...sessionHistory.map((s) => s.date)]);
    return Math.max(dates.size, completedWorkouts.length);
  }, [completedWorkouts, sessionHistory]);

  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'weight' | 'photos'
  const [chartPeriod, setChartPeriod] = useState('3m');
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState(measurements?.currentWeightKg ? String(measurements.currentWeightKg) : '');
  const [newWaist, setNewWaist] = useState('');

  const handleSaveWeight = (e) => {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (!w || isNaN(w)) return;
    const waist = parseFloat(newWaist) || null;
    addWeightEntry({
      date: new Date().toISOString().slice(0, 10),
      weightKg: w,
      waistCm: waist,
    });
    setShowAddWeight(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      addProgressPhoto({
        date: new Date().toISOString().slice(0, 10),
        dataUri: reader.result,
        caption: 'Progress Update',
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page-measure">
      <div className="app-card">
        {/* Header */}
        <header className="app-header">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <div className="brand-name">MEASURE</div>
              <div className="brand-subtitle">ACTIVITY CALENDAR &amp; BIOMETRIC PROGRESSION</div>
            </div>
          </div>
        </header>

        {/* Measure Sub-Tabs */}
        <div className="workout-nav-tabs-clean" style={{ margin: '14px 0 18px' }}>
          <button
            type="button"
            className={`tab-item-clean ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            CALENDAR (SESSIONS)
          </button>
          <button
            type="button"
            className={`tab-item-clean ${activeTab === 'weight' ? 'active' : ''}`}
            onClick={() => setActiveTab('weight')}
          >
            BODY WEIGHT {measurements?.currentWeightKg ? `(${measurements.currentWeightKg} KG)` : ''}
          </button>
          <button
            type="button"
            className={`tab-item-clean ${activeTab === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            PROGRESS PHOTOS ({progressPhotos.length})
          </button>
          <button
            type="button"
            className={`tab-item-clean ${activeTab === 'macros' ? 'active' : ''}`}
            onClick={() => setActiveTab('macros')}
            style={{ color: activeTab === 'macros' ? '#30D158' : undefined }}
          >
            🥗 MACROS (TDEE)
          </button>
        </div>

        {/* TAB 1: MONTHLY ACTIVITY CALENDAR (Screen 37) */}
        {activeTab === 'calendar' && (
          <div className="measure-calendar-pane">
            {/* Quick Training Overview Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  background: 'var(--surface, #1B1C1E)',
                  border: '1px solid var(--border, #2A2B2E)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '9px', color: 'var(--text-muted, #767472)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  TOTAL SESSIONS
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #E4E6E9)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {totalSessionsCount}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--accent, #158FF2)', marginTop: '2px' }}>
                  WORKOUTS
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface, #1B1C1E)',
                  border: '1px solid var(--border, #2A2B2E)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '9px', color: 'var(--text-muted, #767472)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  VOLUME LIFTED
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent, #158FF2)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>KG</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted, #767472)', marginTop: '2px' }}>
                  TOTAL TONNAGE
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface, #1B1C1E)',
                  border: totalPRDays > 0 ? '1px solid rgba(255, 179, 0, 0.45)' : '1px solid var(--border, #2A2B2E)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '9px', color: 'var(--text-muted, #767472)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  PR DAYS
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: totalPRDays > 0 ? '#FFB300' : 'var(--text-primary, #E4E6E9)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {totalPRDays}
                </div>
                <div style={{ fontSize: '10px', color: totalPRDays > 0 ? '#FFB300' : 'var(--text-muted, #767472)', marginTop: '2px' }}>
                  ⚡ RECORD DAYS
                </div>
              </div>
            </div>

            <ActivityCalendar />
          </div>
        )}

        {/* TAB 2: WEIGHT MEASUREMENTS & LINE CHART (Screen 36) */}
        {activeTab === 'weight' && (
          <div className="measure-weight-pane">
            <div className="weight-overview-card">
              <div className="weight-stat-hero">
                <div>
                  <span className="brand-subtitle">CURRENT MASS</span>
                  <div className="weight-big-num">
                    {measurements?.currentWeightKg ? (
                      <>
                        {measurements.currentWeightKg} <span className="unit-label">KG</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '20px', color: 'var(--text-muted)' }}>NOT RECORDED</span>
                    )}
                  </div>
                  <span className="weight-goal-sub">
                    {measurements?.goalWeightKg ? `Target Goal: ${measurements.goalWeightKg} KG` : 'No target goal configured'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowAddWeight(true)}
                >
                  + LOG WEIGHT
                </button>
              </div>

              {/* Timeframe Selectors */}
              <div className="period-selector-row">
                {['3m', '6m', '1y', 'all'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`period-pill-btn ${chartPeriod === p ? 'active' : ''}`}
                    onClick={() => setChartPeriod(p)}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Line Chart */}
              <div className="weight-chart-container-box">
                <WeightChart history={weightHistory} period={chartPeriod} />
              </div>

              {/* Weight Log Form */}
              {showAddWeight && (
                <form className="add-weight-form" onSubmit={handleSaveWeight}>
                  <div className="add-weight-inputs-grid">
                    <div>
                      <label className="weight-label">WEIGHT (KG)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="clean-num-input"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                    <div>
                      <label className="weight-label">WAIST (CM, OPTIONAL)</label>
                      <input
                        type="number"
                        step="0.5"
                        className="clean-num-input"
                        value={newWaist}
                        onChange={(e) => setNewWaist(e.target.value)}
                        placeholder="78"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
                      SAVE ENTRY
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setShowAddWeight(false)}>
                      CANCEL
                    </button>
                  </div>
                </form>
              )}

              {/* Measurement History Table */}
              <div className="measurement-history-list">
                <div className="history-header">
                  <span>DATE</span>
                  <span>WEIGHT</span>
                  <span>WAIST</span>
                  <span style={{ textAlign: 'right' }}>ACTION</span>
                </div>
                {weightHistory.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No measurements recorded. Tap <strong>+ LOG WEIGHT</strong> to log your first bodyweight metric.
                  </div>
                ) : (
                  [...weightHistory].reverse().map((entry, idx) => (
                    <div key={idx} className="history-row">
                      <span className="history-date">{entry.date}</span>
                      <span className="history-val" style={{ color: 'var(--accent, #158FF2)' }}>
                        {entry.weightKg} kg
                      </span>
                      <span className="history-val">{entry.waistCm ? `${entry.waistCm} cm` : '—'}</span>
                      <button
                        type="button"
                        onClick={() => deleteWeightEntry && deleteWeightEntry(entry.date)}
                        title="Delete entry"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          textAlign: 'right',
                          padding: '2px 8px',
                          fontSize: '12px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROGRESS PHOTOS */}
        {activeTab === 'photos' && (
          <div className="measure-photos-pane">
            <div className="photos-header-row">
              <div>
                <span className="brand-subtitle">BODY COMPOSITION</span>
                <h4 className="clean-section-heading">PHYSIQUE TIMELINE</h4>
              </div>
              <label className="btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📷</span>
                <span>+ ADD PHOTO</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {progressPhotos.length === 0 ? (
              <div className="photos-empty-state">
                <span style={{ fontSize: '36px' }}>📸</span>
                <h4 style={{ margin: '8px 0 4px', color: 'var(--text-primary)' }}>NO PROGRESS PHOTOS YET</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  Upload photos to visually track muscular hypertrophy and body transformation over time.
                </p>
              </div>
            ) : (
              <div className="photos-grid">
                {progressPhotos.map((photo) => (
                  <div key={photo.id} className="photo-card">
                    <img src={photo.dataUri} alt="Physique Progress" className="photo-img" />
                    <div className="photo-date-overlay">{photo.date}</div>
                    <button
                      type="button"
                      className="photo-delete-btn"
                      onClick={() => removeProgressPhoto(photo.id)}
                      title="Delete photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: NUTRITION & MACROS CALCULATOR */}
        {activeTab === 'macros' && (
          <div className="measure-macros-pane" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <MacrosCalculator isEmbedded={true} />
          </div>
        )}
      </div>
    </div>
  );
}
