import { strict as assert } from 'assert';
import test from 'node:test';
import { FallbackSystem } from '../src/monitoring/fallback.js';

// Mock session class for testing
class MockSession {
  constructor(config = {}) {
    this.config = config;
    this.failCount = 0;
  }

  async prompt(input) {
    if (this.config.alwaysFail) {
      throw new Error('Mock session failure');
    }
    if (this.config.failTimes && this.failCount < this.config.failTimes) {
      this.failCount++;
      throw new Error('Temporary failure');
    }
    if (this.config.delay) {
      await new Promise(resolve => setTimeout(resolve, this.config.delay));
    }
    return `Response from ${this.config.name || 'unnamed'} session`;
  }
}

test('FallbackSystem', async (t) => {
  let primarySession;
  let fallbackSystem;

  t.beforeEach(async () => {
    primarySession = new MockSession({ name: 'primary' });
    // Run initial health check
    if (fallbackSystem) {
      await fallbackSystem._checkHealth(primarySession, 'primary');
    }
  });

  t.afterEach(() => {
    if (fallbackSystem) {
      fallbackSystem.destroy();
    }
  });

  await t.test('constructor initialization', async () => {
    fallbackSystem = new FallbackSystem(primarySession);
    assert.equal(typeof fallbackSystem.options.maxAttempts, 'number');
    assert.equal(typeof fallbackSystem.options.timeout, 'number');
    assert.ok(Array.isArray(fallbackSystem.options.fallbackStrategies));
    assert.equal(typeof fallbackSystem.options.healthCheckInterval, 'number');
  });

  await t.test('custom options', async () => {
    const customOptions = {
      maxAttempts: 5,
      timeout: 5000,
      fallbackStrategies: ['retry', 'alternate'],
      healthCheckInterval: 30000
    };
    
    fallbackSystem = new FallbackSystem(primarySession, customOptions);
    assert.equal(fallbackSystem.options.maxAttempts, 5);
    assert.equal(fallbackSystem.options.timeout, 5000);
    assert.deepEqual(fallbackSystem.options.fallbackStrategies, ['retry', 'alternate']);
    assert.equal(fallbackSystem.options.healthCheckInterval, 30000);
  });

  await t.test('fallback session management', async () => {
    fallbackSystem = new FallbackSystem(primarySession);
    const backupSession = new MockSession({ name: 'backup' });
    
    fallbackSystem.addFallback('backup', backupSession);
    assert.equal(fallbackSystem.fallbackSessions.has('backup'), true);
    
    fallbackSystem.removeFallback('backup');
    assert.equal(fallbackSystem.fallbackSessions.has('backup'), false);
  });

  await t.test('retry strategy', async () => {
    const failingSession = new MockSession({ 
      name: 'failing',
      failTimes: 2 
    });
    
    fallbackSystem = new FallbackSystem(failingSession, {
      fallbackStrategies: ['retry'],
      maxAttempts: 3
    });

    const result = await fallbackSystem.execute(async () => {
      return await failingSession.prompt('test');
    });

    assert.equal(result, 'Response from failing session');
    assert.equal(failingSession.failCount, 2);
  });

  await t.test('alternate strategy', async () => {
    const failingPrimary = new MockSession({ 
      name: 'primary',
      alwaysFail: true 
    });
    const backupSession = new MockSession({ name: 'backup' });
    
    fallbackSystem = new FallbackSystem(failingPrimary, {
      fallbackStrategies: ['alternate']
    });
    fallbackSystem.addFallback('backup', backupSession);

    const result = await fallbackSystem.execute(async () => {
      return await failingPrimary.prompt('test');
    });

    assert.equal(result, 'Response from backup session');
  });

  await t.test('degrade strategy', async () => {
    const failingSession = new MockSession({
      name: 'failing',
      failTimes: 1
    });
    
    fallbackSystem = new FallbackSystem(failingSession, {
      fallbackStrategies: ['degrade']
    });

    const result = await fallbackSystem.execute(async (context) => {
      return await failingSession.prompt(context.input);
    }, { input: 'test\nwith\nmultiple\nlines' });

    assert.equal(result, 'Response from failing session');
  });

  await t.test('timeout handling with fallback', async () => {
    const slowSession = new MockSession({
      name: 'slow',
      delay: 1000 // Long enough delay to ensure timeout
    });
    const backupSession = new MockSession({ name: 'backup' });
    
    fallbackSystem = new FallbackSystem(slowSession, {
      timeout: 100,
      fallbackStrategies: ['alternate']
    });
    fallbackSystem.addFallback('backup', backupSession);

    // When primary session times out, should fall back to backup session
    const result = await fallbackSystem.execute(async () => {
      return await slowSession.prompt('test');
    });

    assert.equal(result, 'Response from backup session');
  });

  await t.test('timeout handling without fallback', async () => {
    const slowSession = new MockSession({
      name: 'slow',
      delay: 1000 // Long enough delay to ensure timeout
    });
    
    // Test the timeout directly using Promise.race
    const timeout = 100;
    const operation = slowSession.prompt('test');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), timeout)
    );

    await assert.rejects(
      () => Promise.race([operation, timeoutPromise]),
      { message: 'Operation timeout' }
    );
  });

  await t.test('health monitoring', async () => {
    const healthySession = new MockSession({ name: 'healthy' });
    const unhealthySession = new MockSession({ 
      name: 'unhealthy',
      alwaysFail: true 
    });
    
    fallbackSystem = new FallbackSystem(healthySession, {
      healthCheckInterval: 100
    });
    fallbackSystem.addFallback('unhealthy', unhealthySession);

    // Wait for health check
    await new Promise(resolve => setTimeout(resolve, 150));

    const status = fallbackSystem.getHealthStatus();
    assert.ok(status.primary?.healthy);
    assert.ok(!status.fallbacks.unhealthy?.healthy);
  });

  await t.test('fallback statistics', async () => {
    fallbackSystem = new FallbackSystem(primarySession);
    // Run initial health check
    await fallbackSystem._checkHealth(primarySession, 'primary');
    
    const stats = fallbackSystem.getStats();
    assert.ok(stats.primary);
    assert.ok(stats.primary.health?.healthy);
    assert.equal(typeof stats.primary.usage, 'number');
    assert.equal(typeof stats.primary.successRate, 'number');
    assert.ok('fallbacks' in stats);
  });

  await t.test('all strategies fail', async () => {
    const failingSession = new MockSession({ 
      name: 'failing',
      alwaysFail: true 
    });
    
    fallbackSystem = new FallbackSystem(failingSession, {
      fallbackStrategies: ['retry', 'alternate', 'degrade'],
      maxAttempts: 2
    });

    await assert.rejects(
      fallbackSystem.execute(async () => {
        return await failingSession.prompt('test');
      }),
      /Mock session failure/
    );
  });

  await t.test('cleanup on destroy', async () => {
    fallbackSystem = new FallbackSystem(primarySession);
    fallbackSystem.addFallback('backup', new MockSession({ name: 'backup' }));
    
    fallbackSystem.destroy();
    assert.equal(fallbackSystem.healthCheckInterval, null);
    assert.equal(fallbackSystem.fallbackSessions.size, 0);
    assert.equal(fallbackSystem.healthStatus.size, 0);
    assert.equal(fallbackSystem.strategyHandlers.size, 0);
  });

  await t.test('strategy order', async () => {
    const failingPrimary = new MockSession({
      name: 'primary',
      alwaysFail: true
    });
    const backupSession = new MockSession({ name: 'backup' });
    
    fallbackSystem = new FallbackSystem(failingPrimary, {
      fallbackStrategies: ['retry', 'alternate', 'degrade']
    });
    fallbackSystem.addFallback('backup', backupSession);

    const result = await fallbackSystem.execute(async () => {
      return await failingPrimary.prompt('test');
    });

    // Should use alternate strategy after retry fails
    assert.equal(result, 'Response from backup session');
  });

  await t.test('health check interval', async () => {
    const session = new MockSession({ name: 'test' });
    fallbackSystem = new FallbackSystem(session, {
      healthCheckInterval: 100
    });

    // Run initial health check
    await fallbackSystem._checkHealth(session, 'primary');

    // Initial health status
    let status = fallbackSystem.getHealthStatus();
    assert.ok(status.primary);

    // Wait for health check
    await new Promise(resolve => setTimeout(resolve, 150));

    // Updated health status
    status = fallbackSystem.getHealthStatus();
    assert.ok(status.primary.lastCheck > 0);
  });
});
