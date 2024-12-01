import assert from 'node:assert';
import test from 'node:test';
import { PerformanceAnalytics } from '../src/index.js';

test('PerformanceAnalytics', async (t) => {
  let analytics;

  t.beforeEach(() => {
    analytics = new PerformanceAnalytics();
  });

  // Core metrics tracking tests
  await t.test('metrics tracking', async (t) => {
    await t.test('should track response times correctly', async () => {
      analytics.record('responseTime', 100);
      analytics.record('responseTime', 200);

      const stats = analytics.getStats('responseTime');
      assert.equal(stats.count, 2);
      assert.equal(stats.average, 150);
      assert.equal(stats.min, 100);
      assert.equal(stats.max, 200);
    });

    await t.test('should track error rates correctly', async () => {
      analytics.record('errorRate', 1); // Error
      analytics.record('errorRate', 0); // Success
      analytics.record('errorRate', 0); // Success

      const stats = analytics.getStats('errorRate');
      assert.equal(stats.count, 3);
      assert.equal(stats.average, 1/3);
    });

    await t.test('should track success rates correctly', async () => {
      analytics.record('successRate', 1); // Success
      analytics.record('successRate', 1); // Success
      analytics.record('successRate', 0); // Failure
      
      const stats = analytics.getStats('successRate');
      assert.equal(stats.count, 3);
      assert.equal(stats.average, 2/3);
    });
  });

  // Analytics management tests
  await t.test('analytics management', async (t) => {
    await t.test('should reset all metrics', async () => {
      analytics.record('responseTime', 100);
      analytics.reset();

      const stats = analytics.getStats('responseTime');
      assert.equal(stats.count, 0);
    });

    await t.test('should track multiple metric types simultaneously', async () => {
      analytics.record('responseTime', 100);
      analytics.record('errorRate', 1);
      analytics.record('successRate', 1);

      const allStats = analytics.getAllStats();
      assert.ok(allStats.responseTime);
      assert.ok(allStats.errorRate);
      assert.ok(allStats.successRate);
    });
  });
});
