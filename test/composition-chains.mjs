import assert from 'node:assert';
import test from 'node:test';
import { CompositionChains, Session } from '../src/index.js';

// Mock session class for testing
class MockSession {
  async prompt(input) {
    return input;
  }
  destroy() {}
}

test('CompositionChains', async (t) => {
  let session;
  let chains;

  t.beforeEach(() => {
    session = new MockSession();
    chains = new CompositionChains(session);
  });

  t.afterEach(async () => {
    if (session) {
      await session.destroy();
      session = null;
    }
  });

  // Core functionality tests
  await t.test('chain operations', async (t) => {
    await t.test('should execute basic chain steps', async () => {
      const chain = chains.create()
        .addStep('translate', { from: 'English', to: 'Spanish' })
        .addStep('translate', { from: 'Spanish', to: 'French' });

      const result = await chain.execute('Hello');
      assert.ok(result.length > 0);
    });
  });

  // Error handling tests
  await t.test('error handling', async (t) => {
    await t.test('should handle errors with retry mechanism', async () => {
      const chain = chains.create()
        .addStep('translate', { from: 'English', to: 'Spanish' })
        .onError((error, retry) => retry());
      
      const result = await chain.execute('Hello');
      assert.ok(result.length > 0);
    });
  });

  // Validation tests
  await t.test('validation', async (t) => {
    await t.test('should validate chain results', async () => {
      const chain = chains.create()
        .addStep('translate', { from: 'English', to: 'Spanish' })
        .validate(result => result.length > 0);

      const result = await chain.execute('Hello');
      assert.ok(result.length > 0);
    });
  });
});
