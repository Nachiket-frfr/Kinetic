import { GoogleFitHealthProvider } from '../providers/GoogleFitHealthProvider.js';
import { HealthConnectionState, HealthDataSource } from '../types/healthTypes.js';

export async function runGoogleFitTests() {
  const results = [];
  const logPass = (name) => results.push({ test: name, passed: true });
  const logFail = (name, err) => results.push({ test: name, passed: false, error: err?.message || String(err) });

  // In-memory mock storage
  const mockStorage = {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; },
  };

  const provider = new GoogleFitHealthProvider({ storage: mockStorage });

  // 1. Initial State
  try {
    if (provider.getConnectionState() !== HealthConnectionState.NOT_CONNECTED) throw new Error('Initial state not NOT_CONNECTED');
    if (provider.isConnected() !== false) throw new Error('Initially should not be connected');
    logPass('Initial state is NOT_CONNECTED');
  } catch (err) {
    logFail('Initial state is NOT_CONNECTED', err);
  }

  // 2. Authentication Success (Mock Sandbox)
  try {
    const authResult = await provider.connect({ mockAuth: true });
    if (!authResult.success) throw new Error('connect() did not return success');
    if (provider.getConnectionState() !== HealthConnectionState.CONNECTED) throw new Error('State did not transition to CONNECTED');
    if (!provider.isConnected()) throw new Error('isConnected() returned false after auth');
    if (!provider.accessToken) throw new Error('accessToken was not set');
    logPass('Authentication success and state transition');
  } catch (err) {
    logFail('Authentication success and state transition', err);
  }

  // 3. Step Retrieval for Today
  try {
    const today = await provider.getTodaySteps();
    if (!today || typeof today.steps !== 'number') throw new Error('Invalid today step record');
    if (today.steps <= 0) throw new Error('Today steps expected > 0');
    if (today.source !== HealthDataSource.GOOGLE_FIT) throw new Error('Source mismatch');
    logPass('Step retrieval for today');
  } catch (err) {
    logFail('Step retrieval for today', err);
  }

  // 4. Date & Time Boundaries (7-Day Range)
  try {
    const endDate = new Date('2026-09-08');
    const startDate = new Date('2026-09-02');
    const range = await provider.getStepsForRange(startDate, endDate);
    if (range.length !== 7) throw new Error(`Expected 7 days, got ${range.length}`);
    if (range[0].date !== '2026-09-02') throw new Error(`Start date mismatch: ${range[0].date}`);
    if (range[6].date !== '2026-09-08') throw new Error(`End date mismatch: ${range[6].date}`);
    logPass('Date boundary handling (7 days exact range)');
  } catch (err) {
    logFail('Date boundary handling (7 days exact range)', err);
  }

  // 5. Disconnect & Revoke
  try {
    await provider.disconnect();
    if (provider.isConnected() !== false) throw new Error('Provider still connected after disconnect');
    if (provider.getConnectionState() !== HealthConnectionState.NOT_CONNECTED) throw new Error('State not NOT_CONNECTED');
    logPass('Disconnect and session cleanup');
  } catch (err) {
    logFail('Disconnect and session cleanup', err);
  }

  // 6. Access while disconnected throws error
  try {
    let threw = false;
    try {
      await provider.getTodaySteps();
    } catch {
      threw = true;
    }
    if (!threw) throw new Error('getTodaySteps() should throw when disconnected');
    logPass('Throws error when querying steps while disconnected');
  } catch (err) {
    logFail('Throws error when querying steps while disconnected', err);
  }

  return results;
}
