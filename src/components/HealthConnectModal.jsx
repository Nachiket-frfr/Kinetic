import React, { useState } from 'react';
import { HealthDataSource, HealthConnectionState } from '../features/health/types/healthTypes';
import { useHealthSync } from '../features/health/hooks/useHealthSync';

/**
 * HealthConnectModal
 * 
 * Clean, separated UI for:
 * - PATH A: Google Fit (Cloud / OAuth2 activity & step data)
 * - PATH B: Health Connect (Android on-device health storage)
 * - Provider Selection & Anti-Double-Counting controls
 * - Historical Step telemetry breakdown (Today, Yesterday, 7D, 30D)
 */
export default function HealthConnectModal({ isOpen, onClose }) {
  const {
    status,
    activeSource,
    todayActivity,
    historyRange,
    isSyncing,
    lastSyncTimestamp,
    refreshActivity,
    connectGoogleFit,
    disconnectGoogleFit,
    connectHealthConnect,
    disconnectHealthConnect,
    selectActiveSource,
  } = useHealthSync();

  const [activeHistoryTab, setActiveHistoryTab] = useState(7);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const handleConnectFit = async () => {
    setErrorMessage(null);
    try {
      await connectGoogleFit({ mockAuth: true });
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to authorize Google Fit');
    }
  };

  const handleConnectHealthConnect = async () => {
    setErrorMessage(null);
    try {
      await connectHealthConnect({ mockGranted: true });
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to authorize Health Connect');
    }
  };

  const handleHistoryChange = (days) => {
    setActiveHistoryTab(days);
    refreshActivity({ days });
  };

  const gfConnected = status?.googleFit?.isConnected;
  const hcConnected = status?.healthConnect?.isConnected;

  return (
    <div className="ace-modal-backdrop" onClick={onClose}>
      <div className="ace-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div className="ace-modal-header">
          <div>
            <div className="brand-subtitle">DEVICE &amp; CLOUD TELEMETRY</div>
            <h2 className="ace-title">CONNECT ACTIVITY DATA</h2>
          </div>
          <button className="ace-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="ace-tab-pane" style={{ padding: '20px' }}>
          {errorMessage && (
            <div style={{ padding: '10px 14px', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '4px', fontSize: '11px', color: '#FF453A', marginBottom: '14px' }}>
              ⚠ {errorMessage}
            </div>
          )}

          {/* Intro description */}
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: '1.5' }}>
            Synchronize external activity, daily steps, and active calories with RepLog. Choose between Google Cloud sync via <strong>Google Fit</strong> or direct Android on-device storage via <strong>Health Connect</strong>.
          </p>

          {/* Active Source Banner */}
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`live-beacon-dot ${activeSource !== HealthDataSource.NONE ? '' : 'paused'}`} />
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF' }}>
                  ACTIVE SYNC SOURCE:
                </span>{' '}
                <span style={{ fontSize: '11px', color: activeSource !== HealthDataSource.NONE ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {activeSource === HealthDataSource.GOOGLE_FIT
                    ? 'GOOGLE FIT (CLOUD)'
                    : activeSource === HealthDataSource.HEALTH_CONNECT
                    ? 'HEALTH CONNECT (ANDROID)'
                    : 'NONE (MANUAL / HARDWARE)'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '10px', padding: '4px 10px' }}
              onClick={() => refreshActivity({ days: activeHistoryTab })}
              disabled={isSyncing}
            >
              {isSyncing ? 'SYNCING...' : '⚡ REFRESH NOW'}
            </button>
          </div>

          {/* TWO SEPARATE INTEGRATION PATHS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>

            {/* PATH A: GOOGLE FIT */}
            <div
              className="telemetry-stat-card"
              style={{
                borderLeft: `3px solid ${gfConnected ? '#0A84FF' : 'var(--border)'}`,
                background: activeSource === HealthDataSource.GOOGLE_FIT ? 'rgba(10, 132, 255, 0.05)' : undefined,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🌐</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                        GOOGLE FIT
                      </span>
                      {gfConnected && (
                        <span className="search-tag-chip" style={{ borderColor: '#0A84FF', color: '#0A84FF' }}>
                          CONNECTED ✓
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Google Account &amp; REST Activity API (Cloud Sync)
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                      Connect Google Fit to import your activity and step data from any linked smartwatch, Wear OS device, or Google account.
                    </p>

                    {gfConnected && (
                      <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        ACCOUNT: {status?.googleFit?.user?.email || 'Connected'}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                  {gfConnected ? (
                    <>
                      <button
                        type="button"
                        className={`filter-chip-btn ${activeSource === HealthDataSource.GOOGLE_FIT ? 'active' : ''}`}
                        style={{ fontSize: '10px', fontWeight: 800 }}
                        onClick={() => selectActiveSource(HealthDataSource.GOOGLE_FIT)}
                      >
                        {activeSource === HealthDataSource.GOOGLE_FIT ? 'PRIMARY ACTIVE ✓' : 'USE AS SOURCE'}
                      </button>
                      <button
                        type="button"
                        className="btn-danger-subtle"
                        style={{ fontSize: '9px', padding: '3px 8px' }}
                        onClick={disconnectGoogleFit}
                      >
                        DISCONNECT
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ fontSize: '10px', padding: '8px 14px' }}
                      onClick={handleConnectFit}
                    >
                      CONNECT GOOGLE FIT
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PATH B: HEALTH CONNECT */}
            <div
              className="telemetry-stat-card"
              style={{
                borderLeft: `3px solid ${hcConnected ? '#30D158' : 'var(--border)'}`,
                background: activeSource === HealthDataSource.HEALTH_CONNECT ? 'rgba(48, 209, 88, 0.05)' : undefined,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📱</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                        HEALTH CONNECT
                      </span>
                      {hcConnected && (
                        <span className="search-tag-chip" style={{ borderColor: '#30D158', color: '#30D158' }}>
                          CONNECTED ✓
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Android On-Device Health Storage (`READ_STEPS`)
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                      Connect Health Connect to import your activity and step data with low latency directly from Samsung Health, Pixel, and on-device pedometers.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                  {hcConnected ? (
                    <>
                      <button
                        type="button"
                        className={`filter-chip-btn ${activeSource === HealthDataSource.HEALTH_CONNECT ? 'active' : ''}`}
                        style={{ fontSize: '10px', fontWeight: 800 }}
                        onClick={() => selectActiveSource(HealthDataSource.HEALTH_CONNECT)}
                      >
                        {activeSource === HealthDataSource.HEALTH_CONNECT ? 'PRIMARY ACTIVE ✓' : 'USE AS SOURCE'}
                      </button>
                      <button
                        type="button"
                        className="btn-danger-subtle"
                        style={{ fontSize: '9px', padding: '3px 8px' }}
                        onClick={disconnectHealthConnect}
                      >
                        DISCONNECT
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ fontSize: '10px', padding: '8px 14px' }}
                      onClick={handleConnectHealthConnect}
                    >
                      CONNECT HEALTH CONNECT
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* DEDUPLICATION & ANTI-DOUBLE-COUNTING NOTICE */}
          {gfConnected && hcConnected && (
            <div style={{ padding: '10px 14px', background: 'rgba(255, 159, 10, 0.08)', border: '1px solid rgba(255, 159, 10, 0.25)', borderRadius: '4px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px' }}>🛡️</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FF9F0A' }}>
                  ANTI-DOUBLE-COUNTING ACTIVE
                </span>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                Both providers are connected. RepLog will <strong>never add their totals together</strong>. Data is resolved through your selected primary source ({activeSource === HealthDataSource.HEALTH_CONNECT ? 'Health Connect' : 'Google Fit'}) to prevent duplicate steps.
              </p>
            </div>
          )}

          {/* HISTORICAL STEP TELEMETRY (TODAY, 7D, 30D) */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="split-section-title">IMPORTED STEP ACTIVITY</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { label: '7 DAYS', val: 7 },
                  { label: '30 DAYS', val: 30 },
                ].map((t) => (
                  <button
                    key={t.val}
                    type="button"
                    className={`cat-chip-clean ${activeHistoryTab === t.val ? 'active' : ''}`}
                    style={{ fontSize: '9px', padding: '3px 8px' }}
                    onClick={() => handleHistoryChange(t.val)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {historyRange.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                Connect Google Fit or Health Connect above to view synchronized step trends.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {historyRange.slice().reverse().map((item) => (
                  <div
                    key={item.date}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {item.date}
                      </span>
                      <span className="search-tag-chip" style={{ fontSize: '8px', padding: '1px 5px' }}>
                        {item.source === HealthDataSource.GOOGLE_FIT ? 'Google Fit' : 'Health Connect'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#FFFFFF', fontWeight: 700 }}>
                        {item.steps.toLocaleString()} <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>STEPS</span>
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {item.caloriesBurned} kcal
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-primary" style={{ padding: '10px 20px', fontSize: '11px' }} onClick={onClose}>
              DONE &amp; APPLY DATA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
