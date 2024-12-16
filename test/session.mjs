import assert from 'node:assert';
import test from 'node:test';
import { Session } from '../src/index.mjs';
import ai from 'ai.matey/mock';

test('Session', async (t) => {
  let session;

  t.beforeEach(async () => {
    session = null;
  });

  t.afterEach(async () => {
    if (session) {
      await session.destroy();
      session = null;
    }
  });

  // Core functionality tests
  await t.test('initialization', async (t) => {
    await t.test('create with temperature validation', async () => {
      // Valid temperature
      session = await Session.create({ temperature: 1.5 }, ai);
      assert.ok(session instanceof Session);

      // Invalid temperature (too high)
      await assert.rejects(
        Session.create({ temperature: 2.5 }, ai),
        { message: 'Temperature must be between 0.0 and 2.0' }
      );

      // Invalid temperature (too low)
      await assert.rejects(
        Session.create({ temperature: -0.5 }, ai),
        { message: 'Temperature must be between 0.0 and 2.0' }
      );
    });

    await t.test('create with system prompt', async () => {
      session = await Session.create({
        systemPrompt: 'You are a helpful translator.'
      }, ai);
      const response = await session.prompt('Hello');
      assert.ok(response.includes('Translated: Hello'));
    });

    await t.test('create with initial prompts', async () => {
      const initialPrompts = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the capital of Italy?' },
        { role: 'assistant', content: 'The capital of Italy is Rome.' }
      ];
      session = await Session.create({ initialPrompts }, ai);
      const response = await session.prompt('What language do they speak there?');
      assert.ok(response.includes("I'm a mock AI assistant"));
    });
  });

  // Token management tests
  await t.test('token management', async (t) => {
    await t.test('token tracking', async () => {
      session = await Session.create({}, ai);
      
      // Initial token count should be 0
      assert.equal(session.tokensSoFar, 0);
      assert.equal(session.maxTokens, 4096);
      assert.equal(session.tokensLeft, 4096);

      // Send a prompt and verify token count increases
      await session.prompt('Test prompt');
      assert.ok(session.tokensSoFar > 0);
      assert.ok(session.tokensLeft < 4096);
      assert.equal(session.maxTokens, 4096);

      // Verify token count is being tracked
      const initialTokens = session.tokensSoFar;
      await session.prompt('Another test');
      assert.ok(session.tokensSoFar > initialTokens);
    });

    await t.test('streaming behavior', async () => {
      session = await Session.create({}, ai);
      const stream = await session.promptStreaming('Tell me a joke');
      assert.ok(stream instanceof ReadableStream);

      const reader = stream.getReader();
      let result = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += value;
        }
      } finally {
        reader.releaseLock();
      }

      assert.ok(result.includes("Why don't scientists trust atoms?"));
    });
  });

  // Session management tests
  await t.test('session management', async (t) => {
    await t.test('clone with system prompt', async () => {
      session = await Session.create({
        systemPrompt: 'You are a helpful translator.'
      }, ai);
      
      const clonedSession = await session.clone();
      const response = await clonedSession.prompt('Hello');
      assert.ok(response.includes('Translated: Hello'));

      await clonedSession.destroy();
    });

    await t.test('download progress monitoring', async () => {
      let progressEvents = 0;
      
      // Create a promise that resolves when we receive progress events
      const progressPromise = new Promise(async resolve => {
        session = await Session.create({
          monitor: (m) => {
            m.addEventListener('downloadprogress', (e) => {
              assert.ok(e.loaded <= e.total);
              progressEvents++;
              if (e.loaded >= e.total) {
                resolve();
              }
            });
          }
        }, ai);
      });
      
      // Wait for progress events to complete
      await progressPromise;
      assert.ok(progressEvents > 0);
    });
  });

  // Integration tests
  await t.test('integrations', async (t) => {
    await t.test('template system integration', async () => {
      session = await Session.create({}, ai);

      // Register templates before using them
      session.registerTemplate('greeting', 'Hello {name}!');
      session.registerTemplate('farewell', 'Goodbye {name}!');

      // Test template inheritance
      session.inheritTemplate('formal_greeting', 'greeting', { defaults: { name: 'Sir/Madam' } });
      
      // Test template usage
      const response = await session.prompt(['greeting', { name: 'John' }]);
      assert.ok(response.includes("I'm a mock AI assistant"));
    });

    await t.test('caching with compression', async () => {
      session = await Session.create({
        cache: {
          enabled: true,
          compression: {
            threshold: 10,
            algorithm: 'lz'
          }
        }
      }, ai);

      // First request should miss cache
      const response1 = await session.prompt('Test prompt');
      const stats1 = session.getCacheStats();
      assert.equal(stats1.analytics.misses.count, 1);
      
      // Second identical request should hit cache
      const response2 = await session.prompt('Test prompt');
      assert.ok(response1.includes("I'm a mock AI assistant"));
      assert.ok(response2.includes("I'm a mock AI assistant"));
      
      const stats2 = session.getCacheStats();
      assert.equal(stats2.analytics.hits.count, 1);
    });

    await t.test('fallback system integration', async () => {
      session = await Session.create({}, ai);
      
      session.addFallback('backup', {
        prompt: async () => "I'm a mock AI assistant"
      });
      
      const response = await session.prompt('Test');
      assert.ok(response.includes("I'm a mock AI assistant"));
    });
  });
});
