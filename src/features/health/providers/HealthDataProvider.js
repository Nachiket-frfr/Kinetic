/**
 * Abstract Base Class: HealthDataProvider
 * Exposes conceptual contract without provider coupling.
 */
export class HealthDataProvider {
  constructor(sourceName) {
    this.sourceName = sourceName;
  }

  async connect() {
    throw new Error(`${this.sourceName}: connect() not implemented`);
  }

  async disconnect() {
    throw new Error(`${this.sourceName}: disconnect() not implemented`);
  }

  isConnected() {
    throw new Error(`${this.sourceName}: isConnected() not implemented`);
  }

  async requestPermissions() {
    throw new Error(`${this.sourceName}: requestPermissions() not implemented`);
  }

  async hasPermissions() {
    throw new Error(`${this.sourceName}: hasPermissions() not implemented`);
  }

  async getTodaySteps() {
    throw new Error(`${this.sourceName}: getTodaySteps() not implemented`);
  }

  async getStepsForDate(date) {
    throw new Error(`${this.sourceName}: getStepsForDate() not implemented`);
  }

  async getStepsForRange(startDate, endDate) {
    throw new Error(`${this.sourceName}: getStepsForRange() not implemented`);
  }
}
export default HealthDataProvider;
