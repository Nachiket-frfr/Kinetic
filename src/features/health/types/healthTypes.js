/**
 * Health & Activity Tracking Domain Layer
 * Provider-agnostic Enums, Models & Contracts
 */

export const HealthDataSource = Object.freeze({
  NONE: 'NONE',
  GOOGLE_FIT: 'GOOGLE_FIT',
  HEALTH_CONNECT: 'HEALTH_CONNECT',
  DEVICE_HARDWARE: 'DEVICE_HARDWARE',
});

export const HealthConnectionState = Object.freeze({
  NOT_CONNECTED: 'NOT_CONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  PERMISSION_REQUIRED: 'PERMISSION_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNAVAILABLE: 'UNAVAILABLE',
  ERROR: 'ERROR',
});

/**
 * Domain-level immutable StepData record
 */
export class StepData {
  constructor({
    date,
    steps = 0,
    source = HealthDataSource.NONE,
    caloriesBurned = 0,
    distanceMeters = 0,
    activeMinutes = 0,
    rawRecordsCount = 0,
    syncedAt = new Date().toISOString(),
    isDeduplicated = false,
  }) {
    this.date = typeof date === 'string' ? date : new Date(date).toISOString().slice(0, 10);
    this.steps = Math.max(0, Math.round(Number(steps) || 0));
    this.source = source;
    this.caloriesBurned = Math.max(0, Math.round((Number(caloriesBurned) || 0) * 10) / 10);
    this.distanceMeters = Math.max(0, Math.round(Number(distanceMeters) || 0));
    this.activeMinutes = Math.max(0, Math.round(Number(activeMinutes) || 0));
    this.rawRecordsCount = rawRecordsCount;
    this.syncedAt = syncedAt;
    this.isDeduplicated = isDeduplicated;
  }
}
