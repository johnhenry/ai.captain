import assert from 'node:assert';
import test from 'node:test';
import { PerformanceAnalytics } from '../src/index.js';

// Test suite for PerformanceAnalytics
test('PerformanceAnalytics', async (t) => {
  let analytics;

  t.beforeEach(() => {
    analytics = new PerformanceAnalytics();
  });

  await t.test('response time tracking', async () => {
    analytics.record('responseTime', 100);
    analytics.record('responseTime', 200);

    const stats = analytics.getStats('responseTime');
    assert.equal(stats.count, 2);
    assert.equal(stats.average, 150);
    assert.equal(stats.min, 100);
    assert.equal(stats.max, 200);
  });

  await t.test('error rate tracking', async () => {
    analytics.record('errorRate', 1); // Error
    analytics.record('errorRate', 0); // Success
    analytics.record('errorRate', 0); // Success

    const stats = analytics.getStats('errorRate');
    assert.equal(stats.count, 3);
    assert.equal(stats.average, 1/3);
  });

  await t.test('success rate tracking', async () => {
    analytics.record('successRate', 1); // Success
    analytics.record('successRate', 1); // Success
    analytics.record('successRate', 0); // Failure
    
    const stats = analytics.getStats('successRate');
    assert.equal(stats.count, 3);
    assert.equal(stats.average, 2/3);
  });

  await t.test('reset', async () => {
    analytics.record('responseTime', 100);
    analytics.reset();

    const stats = analytics.getStats('responseTime');
    assert.equal(stats.count, 0);
  });

    await t.test('multiple metric types', async () => {
    analytics.record('responseTime', 100);
    analytics.record('errorRate', 1);
    analytics.record('successRate', 1);

    const allStats = analytics.getAllStats();
    assert.ok(allStats.responseTime);
    assert.ok(allStats.errorRate);
    assert.ok(allStats.successRate);
  });
});
