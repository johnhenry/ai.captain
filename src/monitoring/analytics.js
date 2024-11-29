/**
 * Enhanced analytics system for model performance monitoring
 */
export class PerformanceAnalytics {
  constructor(options = {}) {
    this.options = {
      sampleSize: options.sampleSize || 100,
      metricWindow: options.metricWindow || 3600000, // 1 hour
      alertThresholds: options.alertThresholds || {},
      ...options
    };

    this.metrics = new Map();
    this.samples = new Map();
    this.alerts = new Set();
    this._initializeMetrics();
  }

  /**
   * Initialize default metrics
   * @private
   */
  _initializeMetrics() {
    // Response time metrics
    this.addMetric('responseTime', {
      aggregate: values => ({
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        p95: this._percentile(values, 95),
        p99: this._percentile(values, 99)
      })
    });

    // Token usage metrics
    this.addMetric('tokenUsage', {
      aggregate: values => ({
        total: values.reduce((a, b) => a + b, 0),
        average: values.reduce((a, b) => a + b, 0) / values.length
      })
    });

    // Error rate metrics
    this.addMetric('errorRate', {
      aggregate: values => ({
        rate: values.filter(v => v).length / values.length
      })
    });

    // Model performance metrics
    this.addMetric('modelPerformance', {
      aggregate: values => ({
        successRate: values.filter(v => v.success).length / values.length,
        averageLatency: values.reduce((a, b) => a + b.latency, 0) / values.length
      })
    });
  }

  /**
   * Add a new metric
   * @param {string} name Metric name
   * @param {Object} config Metric configuration
   */
  addMetric(name, config) {
    this.metrics.set(name, {
      config,
      values: [],
      lastUpdated: Date.now()
    });
  }

  /**
   * Record a metric value
   * @param {string} name Metric name
   * @param {any} value Metric value
   */
  record(name, value) {
    const metric = this.metrics.get(name);
    if (!metric) return;

    // Add value to metric
    metric.values.push({
      value,
      timestamp: Date.now()
    });

    // Cleanup old values
    this._cleanupMetric(name);

    // Check alerts
    this._checkAlerts(name);
  }

  /**
   * Clean up old metric values
   * @private
   */
  _cleanupMetric(name) {
    const metric = this.metrics.get(name);
    const cutoff = Date.now() - this.options.metricWindow;
    
    metric.values = metric.values.filter(v => v.timestamp > cutoff);
  }

  /**
   * Calculate percentile
   * @private
   */
  _percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * p / 100;
    const base = Math.floor(pos);
    const rest = pos - base;
    
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  }

  /**
   * Check for metric alerts
   * @private
   */
  _checkAlerts(name) {
    const metric = this.metrics.get(name);
    const threshold = this.options.alertThresholds[name];
    
    if (!threshold) return;

    const aggregated = metric.config.aggregate(metric.values.map(v => v.value));
    
    for (const [key, value] of Object.entries(aggregated)) {
      const thresholdValue = threshold[key];
      if (thresholdValue && value > thresholdValue) {
        this.alerts.add({
          metric: name,
          key,
          value,
          threshold: thresholdValue,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Get metric statistics
   * @param {string} name Metric name
   * @returns {Object} Metric statistics
   */
  getStats(name) {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    const values = metric.values.map(v => v.value);
    return {
      ...metric.config.aggregate(values),
      sampleCount: values.length,
      lastUpdated: metric.values[metric.values.length - 1]?.timestamp
    };
  }

  /**
   * Get all active alerts
   * @returns {Object[]} Active alerts
   */
  getAlerts() {
    const cutoff = Date.now() - this.options.metricWindow;
    return [...this.alerts].filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Add a sample for analysis
   * @param {string} category Sample category
   * @param {Object} sample Sample data
   */
  addSample(category, sample) {
    if (!this.samples.has(category)) {
      this.samples.set(category, []);
    }

    const samples = this.samples.get(category);
    samples.push({
      ...sample,
      timestamp: Date.now()
    });

    // Limit sample size
    if (samples.length > this.options.sampleSize) {
      samples.shift();
    }
  }

  /**
   * Analyze samples for a category
   * @param {string} category Sample category
   * @returns {Object} Analysis results
   */
  analyzeSamples(category) {
    const samples = this.samples.get(category);
    if (!samples || samples.length === 0) return null;

    return {
      count: samples.length,
      timeRange: {
        start: samples[0].timestamp,
        end: samples[samples.length - 1].timestamp
      },
      analysis: this._analyzeSamplePatterns(samples)
    };
  }

  /**
   * Analyze patterns in samples
   * @private
   */
  _analyzeSamplePatterns(samples) {
    // This is a placeholder for more sophisticated pattern analysis
    return {
      patterns: {
        // Add pattern analysis here
      },
      trends: {
        // Add trend analysis here
      }
    };
  }

  /**
   * Generate performance report
   * @returns {Object} Performance report
   */
  generateReport() {
    const report = {
      timestamp: Date.now(),
      metrics: {},
      alerts: this.getAlerts(),
      samples: {}
    };

    // Add metrics
    for (const [name, metric] of this.metrics) {
      report.metrics[name] = this.getStats(name);
    }

    // Add sample analysis
    for (const [category] of this.samples) {
      report.samples[category] = this.analyzeSamples(category);
    }

    return report;
  }
}
