import assert from 'node:assert';
import test from 'node:test';
import { CompositionChains, Session } from '../src/index.js';

// Mock session class for testing
class MockSession {
  async prompt(input) {
    return input;
  }
  destroy(){}
}

test('CompositionChains', async (t) => {
  let session;
  let chains;

  t.afterEach(async () => {
    if (session) {
      await session.destroy();
      session = null;
    }
  });

  await t.test('basic chain', async () => {
    session = new MockSession();
    chains = new CompositionChains(session);

    // Create a simple translation chain
    const chain = chains.create()
      .addStep('translate', { from: 'English', to: 'Spanish' })
      .addStep('translate', { from: 'Spanish', to: 'French' });

    const result = await chain.execute('Hello');
    assert.ok(result.length > 0);
  });

  await t.test('chain with error handling', async () => {
    session = new MockSession();
    chains = new CompositionChains(session);
    
    const chain = chains.create()
      .addStep('translate', { from: 'English', to: 'Spanish' })
      .onError((error, retry) => retry());
    
    const result = await chain.execute('Hello');
    assert.ok(result.length > 0);
  });

  await t.test('chain with validation', async () => {
    session = new MockSession();
    chains = new CompositionChains(session);

    const chain = chains.create()
      .addStep('translate', { from: 'English', to: 'Spanish' })
      .validate(result => result.length > 0);

    const result = await chain.execute('Hello');
    assert.ok(result.length > 0);
  });
});
