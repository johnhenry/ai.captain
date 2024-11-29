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
        count: 0,
        average: 0,
        min: 0,
        max: 0
      };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
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
