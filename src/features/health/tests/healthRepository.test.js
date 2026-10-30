import { HealthDataRepository } from '../repository/HealthDataRepository.js';
import { GoogleFitHealthProvider } from '../providers/GoogleFitHealthProvider.js';
import { HealthConnectProvider } from '../providers/HealthConnectProvider.js';
import { HealthDataSource, StepData } from '../types/healthTypes.js';

export async function runHealthRepositoryTests() {
  const results = [];
  const logPass = (name) => results.push({ test: name, passed: true });
  const logFail = (name, err) => results.push({ test: name, passed: false, error: err?.message || String(err) });

  const createMockStorage = () => ({
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; },
  });

  const gfStorage = createMockStorage();
  const hcStorage = createMockStorage();
  const repoStorage = createMockStorage();

  const gf = new GoogleFitHealthProvider({ storage: gfStorage });
  const hc = new HealthConnectProvider({ storage: hcStorage });
  const repo = new HealthDataRepository({
    googleFitProvider: gf,
    healthConnectProvider: hc,
    storage: repoStorage,
  });

  // 1. Initial State: No source active
  try {
    if (repo.getActiveSource() !== HealthDataSource.NONE) throw new Error('Expected NONE initially');
    logPass('Initial active source is NONE');
  } catch (err) {
    logFail('Initial active source is NONE', err);
  }

  // 2. Connect only Google Fit
  try {
    await gf.connect({ mockAuth: true });
    if (repo.getActiveSource() !== HealthDataSource.GOOGLE_FIT) throw new Error('Expected GOOGLE_FIT when only it is connected');
    const todayData = await repo.getTodayActivity();
    if (todayData.source !== HealthDataSource.GOOGLE_FIT) throw new Error('Expected GOOGLE_FIT source on returned data');
    logPass('Auto-selection of Google Fit when connected alone');
  } catch (err) {
    logFail('Auto-selection of Google Fit when connected alone', err);
  }

  // 3. Connect Health Connect too -> AUTO-RESOLVE priority
  try {
    await hc.requestPermissions({ mockGranted: true });
    // When both are connected and no explicit preference set, Health Connect has on-device priority
    if (repo.getActiveSource() !== HealthDataSource.HEALTH_CONNECT) {
      throw new Error(`Expected HEALTH_CONNECT priority, got ${repo.getActiveSource()}`);
    }
    const todayBoth = await repo.getTodayActivity();
    if (todayBoth.source !== HealthDataSource.HEALTH_CONNECT) throw new Error('Data source should be Health Connect');
    if (!todayBoth.comparison) throw new Error('Comparison from secondary Google Fit should be present');
    logPass('Anti-double-counting auto-priority on Health Connect');
  } catch (err) {
    logFail('Anti-double-counting auto-priority on Health Connect', err);
  }

  // 4. Explicit User Source Switching
  try {
    repo.setActiveSource(HealthDataSource.GOOGLE_FIT);
    if (repo.getActiveSource() !== HealthDataSource.GOOGLE_FIT) throw new Error('Source switch to Google Fit failed');
    const switchedData = await repo.getTodayActivity();
    if (switchedData.source !== HealthDataSource.GOOGLE_FIT) throw new Error('Switched data source mismatch');

    repo.setActiveSource(HealthDataSource.HEALTH_CONNECT);
    if (repo.getActiveSource() !== HealthDataSource.HEALTH_CONNECT) throw new Error('Source switch to Health Connect failed');
    logPass('Explicit user source switching between providers');
  } catch (err) {
    logFail('Explicit user source switching between providers', err);
  }

  // 5. Anti-Double-Counting Verification
  try {
    const gfRecords = [
      new StepData({ date: '2026-09-08', steps: 8000, source: HealthDataSource.GOOGLE_FIT }),
      new StepData({ date: '2026-09-07', steps: 7500, source: HealthDataSource.GOOGLE_FIT }),
    ];
    const hcRecords = [
      new StepData({ date: '2026-09-08', steps: 8500, source: HealthDataSource.HEALTH_CONNECT }),
      new StepData({ date: '2026-09-07', steps: 7200, source: HealthDataSource.HEALTH_CONNECT }),
    ];

    const deduplicated = repo.combineRecordsWithDeduplication(
      gfRecords,
      hcRecords,
      HealthDataSource.HEALTH_CONNECT
    );

    // Date '2026-09-08' should be 8,500, NOT 16,500!
    const todayRec = deduplicated.find((r) => r.date === '2026-09-08');
    if (!todayRec) throw new Error('Missing today record in deduplication');
    if (todayRec.steps === 16500) throw new Error('CRITICAL BUG: Steps were summed additively (Double-counted)!');
    if (todayRec.steps !== 8500) throw new Error(`Expected 8500 steps from primary HC, got ${todayRec.steps}`);
    logPass('Deduplication prevents 16,500 additive double counting (8,500 resolved)');
  } catch (err) {
    logFail('Deduplication prevents 16,500 additive double counting (8,500 resolved)', err);
  }

  return results;
}
