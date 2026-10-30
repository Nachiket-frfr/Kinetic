import { HealthConnectProvider } from '../providers/HealthConnectProvider.js';
import { HealthConnectionState, HealthDataSource } from '../types/healthTypes.js';

export async function runHealthConnectTests() {
  const results = [];
  const logPass = (name) => results.push({ test: name, passed: true });
  const logFail = (name, err) => results.push({ test: name, passed: false, error: err?.message || String(err) });

  const mockStorage = {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; },
  };

  const provider = new HealthConnectProvider({ storage: mockStorage });

  // 1. Availability check
  try {
    const available = await provider.isAvailable();
    if (typeof available !== 'boolean') throw new Error('isAvailable() did not return boolean');
    logPass('Availability check returned boolean');
  } catch (err) {
    logFail('Availability check returned boolean', err);
  }

  // 2. Permission request grant
  try {
    const granted = await provider.requestPermissions({ mockGranted: true });
    if (!granted) throw new Error('Permission request returned false');
    if (provider.getConnectionState() !== HealthConnectionState.CONNECTED) throw new Error('State did not transition to CONNECTED');
    if (!provider.isConnected()) throw new Error('isConnected() returned false');
    logPass('Permission request grant & connection');
  } catch (err) {
    logFail('Permission request grant & connection', err);
  }

  // 3. Step retrieval for today
  try {
    const today = await provider.getTodaySteps();
    if (!today || typeof today.steps !== 'number') throw new Error('Invalid step record returned');
    if (today.steps <= 0) throw new Error('Expected positive steps count');
    if (today.source !== HealthDataSource.HEALTH_CONNECT) throw new Error('Source mismatch');
    logPass('Health Connect step retrieval for today');
  } catch (err) {
    logFail('Health Connect step retrieval for today', err);
  }

  // 4. Date Range & Raw record metadata
  try {
    const start = new Date('2026-09-01');
    const end = new Date('2026-09-05');
    const range = await provider.getStepsForRange(start, end);
    if (range.length !== 5) throw new Error(`Expected 5 days, got ${range.length}`);
    if (range[0].rawRecordsCount <= 0) throw new Error('Expected rawRecordsCount metadata on record');
    logPass('Range query and record metadata parsing');
  } catch (err) {
    logFail('Range query and record metadata parsing', err);
  }

  // 5. Permission denied handling
  try {
    const deniedProvider = new HealthConnectProvider({
      storage: { data: {}, getItem() { return null; }, setItem() {}, removeItem() {} },
    });
    const result = await deniedProvider.requestPermissions({ mockGranted: false });
    if (result !== false) throw new Error('Expected requestPermissions to return false when denied');
    if (deniedProvider.getConnectionState() !== HealthConnectionState.PERMISSION_DENIED) {
      throw new Error('Expected PERMISSION_DENIED state');
    }
    logPass('Permission denial transitions to PERMISSION_DENIED');
  } catch (err) {
    logFail('Permission denial transitions to PERMISSION_DENIED', err);
  }

  // 6. Disconnect
  try {
    await provider.disconnect();
    if (provider.isConnected()) throw new Error('Still connected after disconnect');
    if (provider.getConnectionState() !== HealthConnectionState.NOT_CONNECTED) throw new Error('Expected NOT_CONNECTED');
    logPass('Disconnect and permission revocation');
  } catch (err) {
    logFail('Disconnect and permission revocation', err);
  }

  return results;
}
