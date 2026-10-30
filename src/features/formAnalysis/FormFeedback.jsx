import React, { useEffect, useRef } from 'react';

let audioCtx = null;

function playBeep(freq = 440, duration = 0.12, volume = 0.15) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch { /* audio not available */ }
}

export default function FormFeedback({ errors = [], score = 100, repCount = 0, phase = 'IDLE' }) {
  const prevErrorRef = useRef(null);
  const topError = errors[0] ?? null;

  useEffect(() => {
    if (topError && topError !== prevErrorRef.current) {
      playBeep(480, 0.1, 0.12);
    }
    prevErrorRef.current = topError;
  }, [topError]);

  const scoreColor =
    score >= 80 ? 'var(--success)' :
    score >= 60 ? 'var(--warning)' :
                  'var(--danger)';

  return (
    <div className="form-feedback-wrap">
      {/* Accuracy Bar */}
      <div className="form-score-track">
        <div
          className="form-score-fill"
          style={{ width: `${Math.max(score, 4)}%`, backgroundColor: scoreColor }}
        />
      </div>

      {/* Form Error Alert */}
      {topError && (
        <div className="form-error-alert">
          <span className="form-error-icon">▲</span>
          <span className="form-error-msg">{topError}</span>
        </div>
      )}
    </div>
  );
}
