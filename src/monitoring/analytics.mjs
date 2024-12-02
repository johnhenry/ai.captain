/**
 * Simple analytics system for monitoring performance metrics
 */
export class PerformanceAnalytics {
  constructor() {
    this.metrics = new Map();
  }

  /**
   * Record a metric value
   * @param {string} name Metric name
   * @param {number} value Metric value
   */
  record(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(value);
  }

  /**
   * Get statistics for a metric
   * @param {string} name Metric name
   * @returns {Object} Metric statistics
   */
  getStats(name) {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return {
        name,
        count: 0,
        average: undefined,
        min: undefined,
        max: undefined,
        variance:undefined,
        sd:undefined
      };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const variance = values.reduce((a, b) => a + (b - sum / values.length) ** 2, 0);
    const sd = Math.sqrt(variance / values.length);
    return {
      name,
      count: values.length,
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      variance,
      sd
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
  }

  /**
   * Get all metrics
   * @returns {Object} All metrics and their statistics
   */
  getAllStats() {
    const stats = {};
    for (const [name] of this.metrics) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }
}
