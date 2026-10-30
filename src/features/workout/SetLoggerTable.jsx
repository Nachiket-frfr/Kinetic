import React, { useState, useEffect } from 'react';

export default function SetLoggerTable({
  exerciseKey,
  exerciseName,
  targetSets = 4,
  targetWeight = 60,
  targetReps = 10,
  workoutSets,
  activeSetIndex = 0,
  liveReps = 0,
  isCameraActive = false,
  hideHeader = false,
  onCompleteSet,
  onUpdateSetField,
  onAddSet,
  onLaunchCamera,
  onInteract,
}) {
  // Local fallback if controlled workoutSets is not provided
  const [internalSets, setInternalSets] = useState([
    { setNumber: 1, prev: `${targetWeight} kg × ${targetReps}`, weight: targetWeight, reps: targetReps, completed: false },
    { setNumber: 2, prev: `${targetWeight} kg × ${targetReps}`, weight: targetWeight, reps: targetReps, completed: false },
    { setNumber: 3, prev: `${targetWeight} kg × ${targetReps}`, weight: targetWeight, reps: targetReps, completed: false },
  ]);

  const displaySets = workoutSets || internalSets;

  // Sync live reps into the active set row in real time when camera is counting
  useEffect(() => {
    if (isCameraActive && liveReps > 0 && displaySets[activeSetIndex] && !displaySets[activeSetIndex].completed) {
      if (onUpdateSetField) {
        onUpdateSetField(activeSetIndex, 'reps', liveReps);
      } else {
        setInternalSets((prev) =>
          prev.map((s, i) => (i === activeSetIndex ? { ...s, reps: liveReps } : s))
        );
      }
    }
  }, [liveReps, isCameraActive, activeSetIndex]);

  const handleFieldChange = (index, field, val) => {
    if (onInteract) onInteract();
    if (onUpdateSetField) {
      onUpdateSetField(index, field, val);
    } else {
      setInternalSets((prev) =>
        prev.map((s, i) => (i === index ? { ...s, [field]: val } : s))
      );
    }
  };

  const handleToggle = (index, currentReps, currentWeight) => {
    if (onInteract) onInteract();
    const current = displaySets[index];
    const nextCompleted = !current.completed;

    if (onCompleteSet) {
      onCompleteSet({
        setNumber: current.setNumber,
        weight: parseFloat(currentWeight) || targetWeight,
        reps: parseInt(currentReps) || targetReps,
        exerciseKey,
        isCompleted: nextCompleted,
      });
    } else {
      setInternalSets((prev) =>
        prev.map((s, i) => (i === index ? { ...s, completed: nextCompleted } : s))
      );
    }
  };

  const handleAdd = () => {
    if (onInteract) onInteract();
    if (onAddSet) {
      onAddSet();
    } else {
      const lastSet = displaySets[displaySets.length - 1] || { weight: targetWeight, reps: targetReps };
      setInternalSets((prev) => [
        ...prev,
        {
          setNumber: prev.length + 1,
          prev: `${lastSet.weight} kg × ${lastSet.reps}`,
          weight: lastSet.weight,
          reps: lastSet.reps,
          completed: false,
        }
      ]);
    }
  };

  return (
    <div
      className="hevy-set-table-container"
      onClick={onInteract}
      onFocus={onInteract}
    >
      {/* Exercise Card Header (only shown when not embedded in a studio card) */}
      {!hideHeader && (
        <div className="set-table-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 className="set-table-exercise-title">{exerciseName}</h4>
              {isCameraActive && (
                <span className="live-sync-indicator" title="Synced with optical pose camera">
                  <span className="live-sync-dot" />
                  CAMERA SYNCED
                </span>
              )}
            </div>
            <span className="set-table-meta-tag">{exerciseKey}</span>
          </div>

          {onLaunchCamera && (
            <button
              type="button"
              className={`btn-camera-track ${isCameraActive ? 'active' : ''}`}
              onClick={onLaunchCamera}
              title={isCameraActive ? 'Camera tracking is active' : 'Launch AI Pose Skeleton Tracker'}
            >
              <span>📹</span>
              <span>{isCameraActive ? 'CAMERA ON' : 'CAMERA TRACK'}</span>
            </button>
          )}
        </div>
      )}

      {/* Table Headers */}
      <div className="set-columns-header">
        <span className="col-set">SET</span>
        <span className="col-prev">PREVIOUS</span>
        <span className="col-kg">KG</span>
        <span className="col-reps">REPS</span>
        <span className="col-check">✓</span>
      </div>

      {/* Rows */}
      <div className="set-rows-list">
        {displaySets.map((s, idx) => {
          const isActive = idx === activeSetIndex && !s.completed;
          const displayReps = (isActive && isCameraActive && liveReps > 0) ? liveReps : s.reps;

          return (
            <div
              key={idx}
              className={`set-row-item ${s.completed ? 'is-completed' : ''} ${isActive ? 'is-active-row' : ''} ${isActive && isCameraActive ? 'is-camera-synced' : ''}`}
            >
              <div className="row-set-num-col">
                <span className="row-set-num">{s.setNumber}</span>
                {isActive && isCameraActive && (
                  <span className="live-camera-tag">LIVE 📹</span>
                )}
              </div>

              <span className="row-prev-val">{s.prev}</span>

              <input
                type="number"
                step="0.5"
                className="set-input-field"
                value={s.weight}
                onChange={(e) => handleFieldChange(idx, 'weight', e.target.value)}
                placeholder="0"
              />

              <input
                type="number"
                className={`set-input-field ${isActive && isCameraActive && liveReps > 0 ? 'live-counting' : ''}`}
                value={displayReps}
                onChange={(e) => handleFieldChange(idx, 'reps', e.target.value)}
                placeholder="10"
              />

              <button
                type="button"
                className={`set-check-btn ${s.completed ? 'checked' : ''} ${isActive ? 'active-pulse' : ''}`}
                onClick={() => handleToggle(idx, displayReps, s.weight)}
                title={s.completed ? 'Completed' : 'Mark set complete'}
              >
                ✓
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer Add Set Button */}
      <div className="set-table-footer">
        <button type="button" className="btn-add-set-row" onClick={handleAdd}>
          + ADD SET
        </button>
      </div>
    </div>
  );
}
