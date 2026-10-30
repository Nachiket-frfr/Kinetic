/**
 * One Euro Filter — Adaptive smoothing for real-time noisy signals.
 * Reduces jitter at low speeds, allows fast response at high speeds.
 *
 * Paper: https://dl.acm.org/doi/10.1145/2207676.2208639
 */

class LowPassFilter {
  constructor(alpha) {
    this.alpha = Math.max(0, Math.min(1, alpha));
    this.s = null; // smoothed value
  }

  setAlpha(alpha) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  filter(value) {
    if (this.s === null) { this.s = value; return value; }
    this.s = this.alpha * value + (1 - this.alpha) * this.s;
    return this.s;
  }

  get lastValue() { return this.s; }
}

class OneEuroFilter {
  /**
   * @param {number} freq      Estimated signal frequency in Hz (e.g. 30 for 30fps)
   * @param {number} minCutoff Lower = smoother but more latency. Default 0.5Hz
   * @param {number} beta      Speed coefficient. Higher = less lag on fast motion. Default 0.005
   * @param {number} dCutoff   Derivative cutoff. Default 1.0Hz
   */
  constructor(freq = 30, minCutoff = 0.5, beta = 0.005, dCutoff = 1.0) {
    this.freq      = freq;
    this.minCutoff = minCutoff;
    this.beta      = beta;
    this.dCutoff   = dCutoff;
    this.xFilter   = new LowPassFilter(this._alpha(minCutoff));
    this.dxFilter  = new LowPassFilter(this._alpha(dCutoff));
    this.lastTime  = null;
  }

  _alpha(cutoff) {
    const te  = 1.0 / this.freq;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(value, timestamp) {
    // Dynamically update frequency from real timestamps (ms → Hz)
    if (this.lastTime !== null) {
      const dt = (timestamp - this.lastTime) / 1000.0;
      if (dt > 0) this.freq = 1.0 / dt;
    }
    this.lastTime = timestamp;

    // Derivative (speed of change)
    const prevX = this.xFilter.lastValue;
    const dx    = prevX !== null ? (value - prevX) * this.freq : 0.0;
    const edx   = this.dxFilter.filter(dx);

    // Adaptive cutoff — higher speed = less smoothing = less lag
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    this.xFilter.setAlpha(this._alpha(cutoff));
    return this.xFilter.filter(value);
  }
}

/**
 * Create a 2D array of OneEuroFilter instances:
 * filters[landmarkIndex][axis] where axis = 0 (x), 1 (y), 2 (z)
 */
export function createLandmarkFilter(numLandmarks = 33, minCutoff = 0.5, beta = 0.005) {
  return Array.from({ length: numLandmarks }, () => [
    new OneEuroFilter(30, minCutoff, beta),
    new OneEuroFilter(30, minCutoff, beta),
    new OneEuroFilter(30, minCutoff, beta),
  ]);
}

/**
 * Apply One Euro Filters to a full set of landmarks.
 * @param {Array} filters       Output of createLandmarkFilter()
 * @param {Array} landmarks     Raw MediaPipe landmarks array
 * @param {number} timestamp    Current time in milliseconds
 * @returns Smoothed landmarks array
 */
export function filterLandmarks(filters, landmarks, timestamp) {
  return landmarks.map((lm, i) => {
    if (!filters[i]) return lm;
    return {
      x:          filters[i][0].filter(lm.x, timestamp),
      y:          filters[i][1].filter(lm.y, timestamp),
      z:          filters[i][2].filter(lm.z, timestamp),
      visibility: lm.visibility,
    };
  });
}
