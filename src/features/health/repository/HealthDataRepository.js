import { HealthDataSource, HealthConnectionState, StepData } from '../types/healthTypes.js';
import { GoogleFitHealthProvider } from '../providers/GoogleFitHealthProvider.js';
import { HealthConnectProvider } from '../providers/HealthConnectProvider.js';

/**
 * HealthDataRepository
 * 
 * Orchestrates the two independent providers:
 * 1. GoogleFitHealthProvider (Cloud / Google Account REST API)
 * 2. HealthConnectProvider (Android On-Device System Storage)
 * 
 * ANTI-DOUBLE-COUNTING & DEDUPLICATION STRATEGY:
 * - If both providers are connected, their totals are NEVER summed additively (e.g. 8,000 + 8,500 != 16,500).
 * - The repository respects an explicit user `activeSource` preference (e.g. HealthDataSource.HEALTH_CONNECT or HealthDataSource.GOOGLE_FIT).
 * - When set to `AUTO_RESOLVE`, the on-device source (`HEALTH_CONNECT`) is chosen as primary due to lower latency and direct hardware sensor proximity.
 * - The secondary source is tagged with `isDeduplicated: true` and retained for comparative verification.
 */
export class HealthDataRepository {
  constructor({
    googleFitProvider = new GoogleFitHealthProvider(),
    healthConnectProvider = new HealthConnectProvider(),
    storage = (typeof window !== 'undefined' ? window.localStorage : null),
  } = {}) {
    this.googleFit = googleFitProvider;
    this.healthConnect = healthConnectProvider;
    this.storage = storage;
    this.storageKeyActiveSource = 'replog_active_health_source';

    this.activeSource = this._loadSavedSource();
  }

  _loadSavedSource() {
    try {
      const saved = this.storage?.getItem(this.storageKeyActiveSource);
      return saved || HealthDataSource.NONE;
    } catch {
      return HealthDataSource.NONE;
    }
  }

  _persistSource() {
    try {
      if (this.storage) {
        this.storage.setItem(this.storageKeyActiveSource, this.activeSource);
      }
    } catch (err) {
      console.warn('HealthDataRepository persist error:', err);
    }
  }

  setActiveSource(source) {
    if (!Object.values(HealthDataSource).includes(source)) {
      throw new Error(`Invalid HealthDataSource: ${source}`);
    }
    this.activeSource = source;
    this._persistSource();
  }

  getActiveSource() {
    // If explicit active source is valid and connected, return it
    if (this.activeSource === HealthDataSource.GOOGLE_FIT && this.googleFit.isConnected()) {
      return HealthDataSource.GOOGLE_FIT;
    }
    if (this.activeSource === HealthDataSource.HEALTH_CONNECT && this.healthConnect.isConnected()) {
      return HealthDataSource.HEALTH_CONNECT;
    }

    // Auto-resolve: prefer Health Connect on-device, then Google Fit
    if (this.healthConnect.isConnected()) {
      return HealthDataSource.HEALTH_CONNECT;
    }
    if (this.googleFit.isConnected()) {
      return HealthDataSource.GOOGLE_FIT;
    }

    return HealthDataSource.NONE;
  }

  getProvider(source) {
    if (source === HealthDataSource.GOOGLE_FIT) return this.googleFit;
    if (source === HealthDataSource.HEALTH_CONNECT) return this.healthConnect;
    return null;
  }

  getProvidersStatus() {
    return {
      activeSource: this.getActiveSource(),
      googleFit: {
        state: this.googleFit.getConnectionState(),
        isConnected: this.googleFit.isConnected(),
        user: this.googleFit.userAccount,
        lastError: this.googleFit.lastError,
      },
      healthConnect: {
        state: this.healthConnect.getConnectionState(),
        isConnected: this.healthConnect.isConnected(),
        availability: this.healthConnect.availabilityStatus,
        lastError: this.healthConnect.lastError,
      },
    };
  }

  /**
   * Retrieves today's step count using the deduplicated primary source
   */
  async getTodayActivity() {
    const active = this.getActiveSource();

    if (active === HealthDataSource.HEALTH_CONNECT) {
      const hcToday = await this.healthConnect.getTodaySteps();
      return {
        primary: hcToday,
        source: HealthDataSource.HEALTH_CONNECT,
        comparison: this.googleFit.isConnected() ? await this.googleFit.getTodaySteps().catch(() => null) : null,
      };
    }

    if (active === HealthDataSource.GOOGLE_FIT) {
      const gfToday = await this.googleFit.getTodaySteps();
      return {
        primary: gfToday,
        source: HealthDataSource.GOOGLE_FIT,
        comparison: this.healthConnect.isConnected() ? await this.healthConnect.getTodaySteps().catch(() => null) : null,
      };
    }

    // No external provider active
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      primary: new StepData({ date: todayStr, steps: 0, source: HealthDataSource.NONE }),
      source: HealthDataSource.NONE,
      comparison: null,
    };
  }

  /**
   * Fetch historical activity across 7 or 30 days
   */
  async getActivityRange(daysCount = 7) {
    const active = this.getActiveSource();
    const provider = this.getProvider(active);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (daysCount - 1));

    if (!provider || !provider.isConnected()) {
      return [];
    }

    return provider.getStepsForRange(startDate, endDate);
  }

  /**
   * Deduplication verification helper for test assertion and validation
   */
  combineRecordsWithDeduplication(googleFitRecords, healthConnectRecords, preferredSource = HealthDataSource.HEALTH_CONNECT) {
    const recordMap = new Map();

    // Ingest primary source
    const primary = preferredSource === HealthDataSource.HEALTH_CONNECT ? healthConnectRecords : googleFitRecords;
    const secondary = preferredSource === HealthDataSource.HEALTH_CONNECT ? googleFitRecords : healthConnectRecords;

    for (const rec of primary) {
      recordMap.set(rec.date, rec);
    }

    // Secondary source: DO NOT ADD steps to primary. Retain only if primary missing for that date.
    for (const rec of secondary) {
      if (!recordMap.has(rec.date)) {
        recordMap.set(rec.date, rec);
      }
    }

    return Array.from(recordMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}

// Global Singleton Instance
export const healthRepository = new HealthDataRepository();
export default healthRepository;
