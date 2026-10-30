import React, { useState } from 'react';
import useAppStore from '../../store/useAppStore';

export default function MuscleHeatmap() {
  const { sessionHistory, muscleFatigue } = useAppStore();
  const [viewAngle, setViewAngle] = useState('both'); // 'front' | 'back' | 'both'

  // Calculate muscle set volume from sessionHistory
  const muscleSetCounts = {
    chest: 0,
    back: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    core: 0,
    quads: 0,
    hamstrings: 0,
    glutes: 0,
    calves: 0,
  };

  sessionHistory.forEach((session) => {
    const ex = (session.exercise || '').toLowerCase();
    const sets = session.sets?.length || 1;
    if (ex.includes('bench') || ex.includes('chest') || ex.includes('pushup') || ex.includes('fly')) {
      muscleSetCounts.chest += sets;
      muscleSetCounts.triceps += Math.ceil(sets * 0.5);
      muscleSetCounts.shoulders += Math.ceil(sets * 0.5);
    } else if (ex.includes('squat') || ex.includes('leg press') || ex.includes('lunge')) {
      muscleSetCounts.quads += sets;
      muscleSetCounts.glutes += Math.ceil(sets * 0.7);
    } else if (ex.includes('deadlift') || ex.includes('row') || ex.includes('pullup') || ex.includes('lat')) {
      muscleSetCounts.back += sets;
      muscleSetCounts.biceps += Math.ceil(sets * 0.5);
      muscleSetCounts.hamstrings += Math.ceil(sets * 0.5);
    } else if (ex.includes('shoulder') || ex.includes('overhead') || ex.includes('lateral')) {
      muscleSetCounts.shoulders += sets;
      muscleSetCounts.triceps += Math.ceil(sets * 0.4);
    } else if (ex.includes('curl') || ex.includes('bicep')) {
      muscleSetCounts.biceps += sets;
    } else if (ex.includes('plank') || ex.includes('crunch') || ex.includes('ab')) {
      muscleSetCounts.core += sets;
    } else {
      muscleSetCounts.chest += 1;
    }
  });

  // Genuine muscle set counts from user's actual workouts
  const effectiveCounts = muscleSetCounts;

  const getIntensityColor = (sets) => {
    if (sets >= 10) return '#158FF2'; // High activity - vibrant electric blue
    if (sets >= 5)  return '#106bb8'; // Moderate activity - medium blue
    if (sets >= 1)  return '#0d4778'; // Low activity - deep blue
    return '#232427';                // Inactive / Recovered
  };

  const totalSets = Object.values(effectiveCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="muscle-heatmap-card">
      <div className="heatmap-header">
        <div>
          <span className="brand-subtitle">ANATOMICAL TARGETING</span>
          <h4 className="heatmap-title">MUSCLE RECOVERY &amp; VOLUME</h4>
        </div>

        <div className="heatmap-view-toggles">
          <button
            type="button"
            className={`view-toggle-btn ${viewAngle === 'both' ? 'active' : ''}`}
            onClick={() => setViewAngle('both')}
          >
            ALL
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewAngle === 'front' ? 'active' : ''}`}
            onClick={() => setViewAngle('front')}
          >
            ANTERIOR
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewAngle === 'back' ? 'active' : ''}`}
            onClick={() => setViewAngle('back')}
          >
            POSTERIOR
          </button>
        </div>
      </div>

      {/* SVG Anatomical Silhouettes */}
      <div className="heatmap-diagram-container">
        {(viewAngle === 'both' || viewAngle === 'front') && (
          <div className="body-silhouette-wrap">
            <span className="silhouette-label">FRONT</span>
            <svg viewBox="0 0 160 260" className="body-svg" aria-label="Anterior muscle heatmap">
              {/* Head / Neck */}
              <circle cx="80" cy="22" r="14" fill="#232427" stroke="#2A2B2E" strokeWidth="1.5" />
              <rect x="75" y="36" width="10" height="8" rx="2" fill="#232427" />

              {/* Shoulders / Deltoids */}
              <ellipse cx="54" cy="54" rx="10" ry="8" fill={getIntensityColor(effectiveCounts.shoulders)} stroke="#158FF2" strokeWidth="0.8" />
              <ellipse cx="106" cy="54" rx="10" ry="8" fill={getIntensityColor(effectiveCounts.shoulders)} stroke="#158FF2" strokeWidth="0.8" />

              {/* Pectorals / Chest */}
              <rect x="62" y="48" width="16" height="18" rx="4" fill={getIntensityColor(effectiveCounts.chest)} stroke="#158FF2" strokeWidth="1" />
              <rect x="82" y="48" width="16" height="18" rx="4" fill={getIntensityColor(effectiveCounts.chest)} stroke="#158FF2" strokeWidth="1" />

              {/* Biceps */}
              <rect x="46" y="66" width="9" height="22" rx="4" fill={getIntensityColor(effectiveCounts.biceps)} stroke="#158FF2" strokeWidth="0.8" />
              <rect x="105" y="66" width="9" height="22" rx="4" fill={getIntensityColor(effectiveCounts.biceps)} stroke="#158FF2" strokeWidth="0.8" />

              {/* Forearms */}
              <rect x="42" y="92" width="8" height="24" rx="3" fill="#232427" stroke="#2A2B2E" strokeWidth="0.8" />
              <rect x="110" y="92" width="8" height="24" rx="3" fill="#232427" stroke="#2A2B2E" strokeWidth="0.8" />

              {/* Abdominals / Core */}
              <rect x="67" y="70" width="11" height="14" rx="2" fill={getIntensityColor(effectiveCounts.core)} stroke="#158FF2" strokeWidth="0.6" />
              <rect x="82" y="70" width="11" height="14" rx="2" fill={getIntensityColor(effectiveCounts.core)} stroke="#158FF2" strokeWidth="0.6" />
              <rect x="67" y="87" width="11" height="14" rx="2" fill={getIntensityColor(effectiveCounts.core)} stroke="#158FF2" strokeWidth="0.6" />
              <rect x="82" y="87" width="11" height="14" rx="2" fill={getIntensityColor(effectiveCounts.core)} stroke="#158FF2" strokeWidth="0.6" />

              {/* Pelvis / Hips */}
              <polygon points="64,106 96,106 90,122 70,122" fill="#232427" stroke="#2A2B2E" strokeWidth="1" />

              {/* Quadriceps */}
              <rect x="60" y="126" width="17" height="48" rx="6" fill={getIntensityColor(effectiveCounts.quads)} stroke="#158FF2" strokeWidth="1" />
              <rect x="83" y="126" width="17" height="48" rx="6" fill={getIntensityColor(effectiveCounts.quads)} stroke="#158FF2" strokeWidth="1" />

              {/* Calves */}
              <rect x="62" y="180" width="14" height="44" rx="5" fill={getIntensityColor(effectiveCounts.calves)} stroke="#158FF2" strokeWidth="0.8" />
              <rect x="84" y="180" width="14" height="44" rx="5" fill={getIntensityColor(effectiveCounts.calves)} stroke="#158FF2" strokeWidth="0.8" />

              {/* Feet */}
              <ellipse cx="68" cy="230" rx="9" ry="5" fill="#232427" />
              <ellipse cx="92" cy="230" rx="9" ry="5" fill="#232427" />
            </svg>
          </div>
        )}

        {(viewAngle === 'both' || viewAngle === 'back') && (
          <div className="body-silhouette-wrap">
            <span className="silhouette-label">BACK</span>
            <svg viewBox="0 0 160 260" className="body-svg" aria-label="Posterior muscle heatmap">
              {/* Head / Neck */}
              <circle cx="80" cy="22" r="14" fill="#232427" stroke="#2A2B2E" strokeWidth="1.5" />
              <rect x="75" y="36" width="10" height="8" rx="2" fill="#232427" />

              {/* Trapezius */}
              <polygon points="80,42 98,54 62,54" fill={getIntensityColor(effectiveCounts.back)} stroke="#158FF2" strokeWidth="1" />

              {/* Rear Deltoids */}
              <ellipse cx="54" cy="54" rx="10" ry="8" fill={getIntensityColor(effectiveCounts.shoulders)} stroke="#158FF2" strokeWidth="0.8" />
              <ellipse cx="106" cy="54" rx="10" ry="8" fill={getIntensityColor(effectiveCounts.shoulders)} stroke="#158FF2" strokeWidth="0.8" />

              {/* Lats / Upper Back */}
              <polygon points="62,56 98,56 90,88 70,88" fill={getIntensityColor(effectiveCounts.back)} stroke="#158FF2" strokeWidth="1" />

              {/* Triceps */}
              <rect x="46" y="66" width="9" height="22" rx="4" fill={getIntensityColor(effectiveCounts.triceps)} stroke="#158FF2" strokeWidth="0.8" />
              <rect x="105" y="66" width="9" height="22" rx="4" fill={getIntensityColor(effectiveCounts.triceps)} stroke="#158FF2" strokeWidth="0.8" />

              {/* Lower Back */}
              <rect x="70" y="90" width="20" height="14" rx="3" fill={getIntensityColor(effectiveCounts.back)} stroke="#158FF2" strokeWidth="0.8" />

              {/* Glutes */}
              <ellipse cx="71" cy="116" rx="12" ry="10" fill={getIntensityColor(effectiveCounts.glutes)} stroke="#158FF2" strokeWidth="1" />
              <ellipse cx="89" cy="116" rx="12" ry="10" fill={getIntensityColor(effectiveCounts.glutes)} stroke="#158FF2" strokeWidth="1" />

              {/* Hamstrings */}
              <rect x="60" y="130" width="17" height="44" rx="6" fill={getIntensityColor(effectiveCounts.hamstrings)} stroke="#158FF2" strokeWidth="1" />
              <rect x="83" y="130" width="17" height="44" rx="6" fill={getIntensityColor(effectiveCounts.hamstrings)} stroke="#158FF2" strokeWidth="1" />

              {/* Calves (Gastrocnemius) */}
              <rect x="62" y="180" width="14" height="44" rx="5" fill={getIntensityColor(effectiveCounts.calves)} stroke="#158FF2" strokeWidth="0.8" />
              <rect x="84" y="180" width="14" height="44" rx="5" fill={getIntensityColor(effectiveCounts.calves)} stroke="#158FF2" strokeWidth="0.8" />

              {/* Feet */}
              <ellipse cx="68" cy="230" rx="9" ry="5" fill="#232427" />
              <ellipse cx="92" cy="230" rx="9" ry="5" fill="#232427" />
            </svg>
          </div>
        )}
      </div>

      {/* Muscle Breakdown List */}
      <div className="muscle-breakdown-list">
        {Object.entries(effectiveCounts).map(([muscle, count]) => {
          const pct = Math.round((count / totalSets) * 100);
          return (
            <div key={muscle} className="muscle-breakdown-item">
              <div className="muscle-name-row">
                <span className="muscle-name">{muscle.toUpperCase()}</span>
                <span className="muscle-sets-count">{count} SETS ({pct}%)</span>
              </div>
              <div className="muscle-progress-bar">
                <div
                  className="muscle-progress-fill"
                  style={{
                    width: `${Math.min(100, pct * 3.5)}%`,
                    background: getIntensityColor(count),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
