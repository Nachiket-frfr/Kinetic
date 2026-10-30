import React from 'react';
import { usePoseTracker } from './usePoseTracker';

/**
 * PoseCanvas — Camera feed with real-time skeleton overlay and live form feedback HUD.
 */
export default function PoseCanvas({ onLandmarks, onReady, liveStats = {} }) {
  const {
    videoRef, canvasRef,
    isLoading, isReady, isActive, error,
    startCamera, stopCamera,
  } = usePoseTracker({ onFrame: onLandmarks });

  React.useEffect(() => {
    if (isReady && onReady) onReady();
  }, [isReady, onReady]);

  const {
    formScore = 100,
    repCount = 0,
    phase = 'IDLE',
    activeErrors = [],
    primaryAngle = null
  } = liveStats;

  const topError = activeErrors[0];
  const scoreColor =
    formScore >= 80 ? 'var(--success)' :
    formScore >= 60 ? 'var(--warning)' :
                      'var(--danger)';

  return (
    <div className="pose-canvas-wrap">
      {/* Camera + Skeleton layers */}
      <div className="pose-video-container">
        <video
          ref={videoRef}
          className="pose-video"
          playsInline
          muted
          aria-label="Camera feed"
        />
        <canvas
          ref={canvasRef}
          className="pose-canvas"
          aria-label="Pose skeleton overlay"
        />

        {/* Overlay states */}
        {!isActive && (
          <div className="pose-overlay">
            {isLoading && (
              <div className="pose-status">
                <div className="pose-spinner" />
                <span>INITIALIZING SENSORS...</span>
              </div>
            )}
            {error && (
              <div className="pose-error">
                <span>SENSOR ACCESS DENIED</span>
                <p>{error}</p>
                <button className="btn-primary" onClick={startCamera}>
                  ALLOW OPTICAL SENSOR
                </button>
              </div>
            )}
            {!isLoading && !error && (
              <div className="pose-start-prompt">
                <p>ALIGN FULL BODY IN FRAME FOR KINEMATIC TRACKING</p>
                <button className="btn-primary" onClick={startCamera}>
                  INITIALIZE CAMERA
                </button>
              </div>
            )}
          </div>
        )}

        {/* Live Top Badges */}
        {isActive && (
          <div className="pose-top-hud">
            <div className="pose-badge-clean">
              <span className="status-dot" />
              <span>KINEMATIC TRACKING</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="pose-badge-clean">
                <span className="pose-acc-label">FORM ACCURACY:</span>
                <span className="pose-acc-val" style={{ color: scoreColor }}>
                  {formScore}%
                </span>
              </div>

              <button
                type="button"
                className="pose-deactivate-hud-btn"
                onClick={stopCamera}
                title="Deactivate camera tracking"
              >
                ✕ DEACTIVATE
              </button>
            </div>
          </div>
        )}

        {/* Real-time Feedback Pill */}
        {isActive && (
          <div className="pose-bottom-feedback">
            {topError ? (
              <div className="pose-feedback-pill pose-feedback-pill--error">
                <span className="pose-fb-icon">▲</span>
                <span className="pose-fb-text">{topError}</span>
              </div>
            ) : (
              <div className="pose-feedback-pill pose-feedback-pill--good">
                <span className="pose-fb-icon">✓</span>
                <span className="pose-fb-text">OPTIMAL JOINT ALIGNMENT</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
