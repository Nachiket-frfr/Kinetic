import React, { useState, useEffect } from 'react';
import aceExercises from '../data/aceExercises.json';

export default function AceReferenceModal({ exerciseKey, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('demo');
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);

  const exercise = aceExercises[exerciseKey];

  useEffect(() => {
    if (!isOpen || !exercise?.images?.length) return;
    const interval = setInterval(() => {
      setActiveFrameIndex((prev) => (prev + 1) % exercise.images.length);
    }, 750);
    return () => clearInterval(interval);
  }, [isOpen, exercise]);

  if (!isOpen || !exercise) return null;

  return (
    <div className="ace-modal-backdrop" onClick={onClose}>
      <div className="ace-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ace-modal-header">
          <div>
            <div className="brand-subtitle">BIOMECHANICAL STANDARD</div>
            <h2 className="ace-title">{exercise.title.toUpperCase()}</h2>
          </div>
          <button className="ace-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="workout-nav-tabs-clean" style={{ margin: '0 20px 16px', borderRadius: '8px' }}>
          <button
            className={`tab-item-clean ${activeTab === 'demo' ? 'active' : ''}`}
            onClick={() => setActiveTab('demo')}
          >
            KINEMATIC DEMO & VIDEO
          </button>
          <button
            className={`tab-item-clean ${activeTab === 'instructions' ? 'active' : ''}`}
            onClick={() => setActiveTab('instructions')}
          >
            STEP-BY-STEP CUES
          </button>
          <button
            className={`tab-item-clean ${activeTab === 'biomechanics' ? 'active' : ''}`}
            onClick={() => setActiveTab('biomechanics')}
          >
            JOINT ANGLES & TOLERANCE
          </button>
        </div>

        {/* Tab 1: Visual Motion & Video */}
        {activeTab === 'demo' && (
          <div className="ace-tab-pane">
            <div className="ace-flicker-container">
              {exercise.images?.length > 0 ? (
                <div className="ace-flicker-viewer">
                  <img
                    src={exercise.images[activeFrameIndex]}
                    alt={`${exercise.title} keyframe ${activeFrameIndex + 1}`}
                    className="ace-flicker-img"
                  />
                  <div className="ace-flicker-timeline">
                    {exercise.images.map((_, i) => (
                      <button
                        key={i}
                        className={`ace-flicker-dot ${i === activeFrameIndex ? 'active' : ''}`}
                        onClick={() => setActiveFrameIndex(i)}
                      />
                    ))}
                  </div>
                  <div className="ace-flicker-caption">
                    KEYFRAME {activeFrameIndex + 1} OF {exercise.images.length} · ACE REPETITION STANDARD
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No keyframe animation available for this movement.
                </p>
              )}

              {/* Video Embed */}
              {exercise.video && (
                <div className="ace-video-wrap">
                  <span className="split-form-label" style={{ marginBottom: '8px', display: 'block' }}>
                    CLINICAL VIDEO TUTORIAL
                  </span>
                  <div className="ace-video-frame">
                    <iframe
                      src={exercise.video}
                      title={`${exercise.title} Video`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Muscles Involved */}
            <div className="ace-muscles-grid">
              <div className="ace-muscle-col">
                <span className="split-form-label">PRIMARY TARGETS</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {exercise.primaryMuscles.map((m) => (
                    <span key={m} className="item-tag-clean">{m}</span>
                  ))}
                </div>
              </div>
              <div className="ace-muscle-col">
                <span className="split-form-label">SECONDARY STABILIZERS</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {exercise.secondaryMuscles.map((m) => (
                    <span key={m} className="item-tag-clean muted">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Step-by-Step Instructions */}
        {activeTab === 'instructions' && (
          <div className="ace-tab-pane">
            <div className="ace-steps-list">
              {exercise.steps.map((s, idx) => (
                <div key={idx} className="ace-step-item">
                  <div className="ace-step-num">{idx + 1}</div>
                  <div className="ace-step-body">
                    <div className="ace-step-phase">{s.phase.toUpperCase()}</div>
                    <div className="ace-step-text">{s.instruction}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ace-cues-box">
              <span className="split-form-label" style={{ marginBottom: '6px', display: 'block', color: 'var(--accent)' }}>
                COACHING CUES
              </span>
              <ul className="ace-cues-list">
                {exercise.aceFormCues.map((cue, i) => (
                  <li key={i}>{cue}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Biomechanical Angles & Machine Checks */}
        {activeTab === 'biomechanics' && (
          <div className="ace-tab-pane">
            <div className="ace-angle-grid">
              <div className="ace-angle-card">
                <span className="split-form-label">PRIMARY ARTICULATION</span>
                <div className="metric-value-clean" style={{ fontSize: '1.1rem', marginTop: '4px' }}>
                  {exercise.primaryJoint.toUpperCase()}
                </div>
              </div>
              <div className="ace-angle-card">
                <span className="split-form-label">BOTTOM TURNAROUND</span>
                <div className="metric-value-clean" style={{ fontSize: '1.1rem', marginTop: '4px', color: 'var(--accent)' }}>
                  {exercise.repPhase.down}°
                </div>
              </div>
              <div className="ace-angle-card">
                <span className="split-form-label">TOP LOCKOUT</span>
                <div className="metric-value-clean" style={{ fontSize: '1.1rem', marginTop: '4px', color: 'var(--success)' }}>
                  {exercise.repPhase.up}°
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <span className="split-form-label" style={{ display: 'block', marginBottom: '8px' }}>
                KINEMATIC CONSTRAINTS & THRESHOLDS
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(exercise.formChecks).map(([key, check]) => (
                  <div key={key} className="clean-exercise-card" style={{ padding: '10px 14px' }}>
                    <div>
                      <div className="picker-ex-title" style={{ fontSize: '12px' }}>{key.toUpperCase()}</div>
                      <div style={{ fontSize: '11px', color: 'var(--danger)', fontFamily: 'JetBrains Mono, monospace' }}>
                        VIOLATION: {check.message}
                      </div>
                    </div>
                    <span className="item-tag-clean">
                      LIMIT: {check.min ? `>${check.min}°` : `<${check.max}°`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
