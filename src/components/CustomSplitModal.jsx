import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';
import aceExercises from '../data/aceExercises.json';

const EXERCISE_LIST = Object.entries(aceExercises).map(([key, val]) => ({
  key,
  title: val.title || key,
  category: val.category || 'General',
  equipment: val.equipment || 'Standard',
}));

export default function CustomSplitModal({ isOpen, onClose, editingSplit = null }) {
  const { saveCustomSplit } = useAppStore();

  const [splitName, setSplitName] = useState(editingSplit?.name || 'Custom Hybrid Routine');
  const [description, setDescription] = useState(editingSplit?.description || 'Customized programmatic periodization');
  const [days, setDays] = useState(
    editingSplit?.days || [
      {
        dayNumber: 1,
        name: 'Upper Body Power',
        focus: 'Pectorals, Lats & Shoulders',
        isRest: false,
        exercises: [
          { exerciseKey: 'chest-press', name: 'Chest Press', targetSets: 4, targetReps: '8-10', targetWeight: 50, restSeconds: 90 },
          { exerciseKey: 'bent-over-row', name: 'Bent-Over Row', targetSets: 4, targetReps: '8-10', targetWeight: 50, restSeconds: 90 }
        ]
      },
      {
        dayNumber: 2,
        name: 'Lower Body Drive',
        focus: 'Quads, Glutes & Hamstrings',
        isRest: false,
        exercises: [
          { exerciseKey: 'back-squat', name: 'Back Squat', targetSets: 4, targetReps: '6-8', targetWeight: 70, restSeconds: 120 },
          { exerciseKey: 'deadlift', name: 'Deadlift', targetSets: 4, targetReps: '5', targetWeight: 80, restSeconds: 120 }
        ]
      },
      {
        dayNumber: 3,
        name: 'Active Recovery',
        focus: 'Myofascial Release & Mobility',
        isRest: true,
        exercises: []
      }
    ]
  );

  const [pickerDayIndex, setPickerDayIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  if (!isOpen) return null;

  const handleAddDay = () => {
    setDays((prev) => [
      ...prev,
      {
        dayNumber: prev.length + 1,
        name: `Day ${prev.length + 1}`,
        focus: 'Targeted Hypertrophy',
        isRest: false,
        exercises: []
      }
    ]);
  };

  const handleRemoveDay = (index) => {
    if (days.length <= 1) return;
    setDays((prev) => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 })));
  };

  const handleUpdateDay = (index, field, value) => {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const handleSelectExercise = (exerciseItem) => {
    if (pickerDayIndex === null) return;
    const newEx = {
      exerciseKey: exerciseItem.key,
      name: exerciseItem.title,
      targetSets: 3,
      targetReps: '10-12',
      targetWeight: 0,
      restSeconds: 60
    };
    setDays((prev) =>
      prev.map((d, i) =>
        i === pickerDayIndex
          ? { ...d, exercises: [...d.exercises, newEx] }
          : d
      )
    );
    setPickerDayIndex(null);
    setSearchTerm('');
  };

  const handleRemoveExercise = (dayIdx, exIdx) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, exercises: d.exercises.filter((_, idx) => idx !== exIdx) }
          : d
      )
    );
  };

  const handleUpdateExercise = (dayIdx, exIdx, field, val) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              exercises: d.exercises.map((ex, idx) =>
                idx === exIdx ? { ...ex, [field]: val } : ex
              )
            }
          : d
      )
    );
  };

  const handleSave = () => {
    if (!splitName.trim()) return;
    const newSplit = {
      id: editingSplit?.id || `custom-${Date.now()}`,
      name: splitName.trim(),
      description: description.trim() || 'Custom periodized split',
      daysPerWeek: days.filter(d => !d.isRest).length,
      isCustom: true,
      days
    };
    saveCustomSplit(newSplit);
    onClose();
  };

  const categories = ['ALL', ...new Set(EXERCISE_LIST.map(e => e.category))];
  const filteredExercises = EXERCISE_LIST.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || e.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="ace-modal-backdrop" onClick={onClose}>
      <div className="ace-modal-content split-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ace-modal-header">
          <div>
            <div className="brand-subtitle">SPLIT ARCHITECT // PERIODIZATION</div>
            <h3 className="ace-title">{editingSplit ? 'CONFIGURE WORKOUT SPLIT' : 'BUILD CUSTOM SPLIT'}</h3>
          </div>
          <button className="ace-close-btn" onClick={onClose} title="Close architect">✕</button>
        </div>

        {/* Modal Body */}
        <div className="split-modal-body">
          {/* Top Overview HUD / Summary */}
          <div className="split-overview-hud">
            <div className="split-overview-stat">
              <span className="split-overview-label">TOTAL DAYS</span>
              <span className="split-overview-val">{days.length} DAYS</span>
            </div>
            <div className="split-overview-stat">
              <span className="split-overview-label">TRAINING DAYS</span>
              <span className="split-overview-val" style={{ color: '#30D158' }}>
                {days.filter((d) => !d.isRest).length} SESSIONS
              </span>
            </div>
            <div className="split-overview-stat">
              <span className="split-overview-label">REST DAYS</span>
              <span className="split-overview-val" style={{ color: 'var(--text-muted)' }}>
                {days.filter((d) => d.isRest).length} RECOVERY
              </span>
            </div>
            <div className="split-overview-stat">
              <span className="split-overview-label">TOTAL EXERCISES</span>
              <span className="split-overview-val">
                {days.reduce((acc, d) => acc + (d.exercises?.length || 0), 0)} MOVEMENTS
              </span>
            </div>
          </div>

          {/* Split Name & Description Form Fields */}
          <div className="split-meta-grid">
            <div className="split-meta-field">
              <label className="split-meta-label">
                <span>SPLIT TITLE</span>
                <span className="split-meta-hint">REQUIRED</span>
              </label>
              <input
                type="text"
                className="clean-search-input split-input-styled"
                value={splitName}
                onChange={(e) => setSplitName(e.target.value)}
                placeholder="e.g. 4-Day Powerbuilding Hybrid"
              />
            </div>
            <div className="split-meta-field">
              <label className="split-meta-label">
                <span>TRAINING INTENT / TARGET GOAL</span>
                <span className="split-meta-hint">PERIODIZATION</span>
              </label>
              <input
                type="text"
                className="clean-search-input split-input-styled"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Hypertrophy, strength progression & CNS recovery"
              />
            </div>
          </div>

          {/* Days Builder Section */}
          <div className="split-days-container-clean">
            <div className="split-days-header-row">
              <div>
                <span className="split-section-title">TRAINING SCHEDULE &amp; DAY PROTOCOLS</span>
                <p className="split-section-subtitle">Configure workout sequences, target sets, reps, load, and rest periods.</p>
              </div>
              <button
                type="button"
                className="btn-secondary split-add-day-btn"
                onClick={handleAddDay}
              >
                + ADD DAY
              </button>
            </div>

            <div className="split-days-vertical-list">
              {days.map((day, dIdx) => (
                <div
                  key={dIdx}
                  className={`split-day-block ${day.isRest ? 'is-rest-day' : ''}`}
                >
                  {/* Day Header Row */}
                  <div className="split-day-block-top">
                    <div className="split-day-title-group">
                      <span className="split-day-pill">DAY {day.dayNumber}</span>
                      <input
                        type="text"
                        className="clean-search-input split-day-name-input"
                        value={day.name}
                        onChange={(e) => handleUpdateDay(dIdx, 'name', e.target.value)}
                        placeholder="Day Name (e.g. Push Power)"
                      />
                      <input
                        type="text"
                        className="clean-search-input split-day-focus-input-styled"
                        value={day.focus}
                        onChange={(e) => handleUpdateDay(dIdx, 'focus', e.target.value)}
                        placeholder="Muscular Focus (e.g. Chest, Shoulders & Triceps)"
                      />
                    </div>

                    <div className="split-day-control-group">
                      <label className="split-rest-toggle-chip">
                        <input
                          type="checkbox"
                          checked={day.isRest}
                          onChange={(e) => handleUpdateDay(dIdx, 'isRest', e.target.checked)}
                        />
                        <span className="rest-toggle-label">{day.isRest ? '🛌 REST DAY' : '⚡ ACTIVE'}</span>
                      </label>

                      {days.length > 1 && (
                        <button
                          type="button"
                          className="btn-danger-subtle"
                          style={{ padding: '6px 10px', fontSize: '10px' }}
                          onClick={() => handleRemoveDay(dIdx)}
                          title="Remove this training day"
                        >
                          REMOVE
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Day's Exercises */}
                  {!day.isRest ? (
                    <div className="split-day-exercises-pane">
                      {day.exercises.length === 0 ? (
                        <div className="split-empty-exercises-state">
                          <span style={{ fontSize: '18px', opacity: 0.6 }}>🏋️‍♂️</span>
                          <span>No exercises added to Day {day.dayNumber} yet.</span>
                        </div>
                      ) : (
                        <div className="split-exercises-stack">
                          {day.exercises.map((ex, eIdx) => (
                            <div key={eIdx} className="split-exercise-row-card">
                              <div className="split-ex-info">
                                <span className="split-ex-num">#{eIdx + 1}</span>
                                <span className="split-ex-name-text">{ex.name}</span>
                              </div>

                              <div className="split-ex-params-grid">
                                <label className="split-param-cell">
                                  <span className="split-param-caption">SETS</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="15"
                                    value={ex.targetSets}
                                    onChange={(e) => handleUpdateExercise(dIdx, eIdx, 'targetSets', parseInt(e.target.value) || 1)}
                                    className="split-param-field"
                                  />
                                </label>
                                <label className="split-param-cell">
                                  <span className="split-param-caption">REPS</span>
                                  <input
                                    type="text"
                                    value={ex.targetReps}
                                    onChange={(e) => handleUpdateExercise(dIdx, eIdx, 'targetReps', e.target.value)}
                                    className="split-param-field"
                                    style={{ width: '52px' }}
                                  />
                                </label>
                                <label className="split-param-cell">
                                  <span className="split-param-caption">LOAD (KG)</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={ex.targetWeight}
                                    onChange={(e) => handleUpdateExercise(dIdx, eIdx, 'targetWeight', parseFloat(e.target.value) || 0)}
                                    className="split-param-field"
                                    style={{ width: '52px' }}
                                  />
                                </label>
                                <label className="split-param-cell">
                                  <span className="split-param-caption">REST (S)</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="15"
                                    value={ex.restSeconds}
                                    onChange={(e) => handleUpdateExercise(dIdx, eIdx, 'restSeconds', parseInt(e.target.value) || 60)}
                                    className="split-param-field"
                                    style={{ width: '52px' }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  className="split-ex-delete-btn"
                                  title="Remove exercise from day"
                                  onClick={() => handleRemoveExercise(dIdx, eIdx)}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn-secondary split-add-ex-trigger"
                        onClick={() => setPickerDayIndex(dIdx)}
                      >
                        + ADD EXERCISE TO {day.name.toUpperCase()}
                      </button>
                    </div>
                  ) : (
                    <div className="split-rest-notice">
                      <span>💤 Scheduled recovery protocol. CNS replenishing &amp; active muscular regeneration.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="split-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-beacon-dot" />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {days.filter((d) => !d.isRest).length} TRAINING DAYS CONFIGURED
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-secondary" style={{ padding: '10px 18px' }} onClick={onClose}>
              CANCEL
            </button>
            <button type="button" className="btn-primary" style={{ padding: '10px 22px' }} onClick={handleSave}>
              SAVE &amp; ACTIVATE SPLIT
            </button>
          </div>
        </div>

        {/* Nested Exercise Picker */}
        {pickerDayIndex !== null && (
          <div className="exercise-picker-overlay" onClick={() => setPickerDayIndex(null)}>
            <div className="exercise-picker-modal" onClick={(e) => e.stopPropagation()}>
              <div className="picker-search-bar">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div className="brand-subtitle">EXERCISE CATALOG</div>
                  <button className="ace-close-btn" onClick={() => setPickerDayIndex(null)}>✕</button>
                </div>
                <input
                  type="text"
                  className="clean-search-input"
                  placeholder="Search 80+ ACE certified exercises by name or muscle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                <div className="picker-categories">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={`picker-cat-btn ${categoryFilter === cat ? 'active' : ''}`}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="picker-exercise-list">
                {filteredExercises.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No exercises match "{searchTerm}"
                  </div>
                ) : (
                  filteredExercises.map((ex) => (
                    <div
                      key={ex.key}
                      className="picker-exercise-item"
                      onClick={() => handleSelectExercise(ex)}
                    >
                      <div>
                        <div className="picker-ex-title">{ex.title}</div>
                        <div className="picker-ex-meta">
                          <span className="item-tag-clean">{ex.category}</span>
                          <span className="item-tag-clean muted">{ex.equipment}</span>
                        </div>
                      </div>
                      <span className="btn-secondary" style={{ pointerEvents: 'none', padding: '4px 10px', fontSize: '10px' }}>
                        + SELECT
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
