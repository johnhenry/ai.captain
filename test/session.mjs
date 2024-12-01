import assert from 'node:assert';
import test from 'node:test';
import { Session } from '../src/index.js';

// Replace global window.ai with the mock implementation


// Test suite for Session
test('Session', async (t) => {
  let session;

  t.afterEach(async () => {
    if (session) {
      await session.destroy();
      session = null;
    }
  });

  await t.test('create with temperature validation', async () => {
    // Valid temperature
    session = await Session.create({ temperature: 1.5 });
    assert.ok(session instanceof Session);

    // Invalid temperature (too high)
    await assert.rejects(
      Session.create({ temperature: 2.5 }),
      { message: 'Temperature must be between 0.0 and 2.0' }
    );

    // Invalid temperature (too low)
    await assert.rejects(
      Session.create({ temperature: -0.5 }),
      { message: 'Temperature must be between 0.0 and 2.0' }
    );
  });

  await t.test('create with system prompt', async () => {
    session = await Session.create({
      systemPrompt: 'You are a helpful translator.'
    });
    const response = await session.prompt('Hello');
    assert.ok(response.includes('Translated: Hello'));
  });

  await t.test('create with initial prompts', async () => {
    const initialPrompts = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is the capital of Italy?' },
      { role: 'assistant', content: 'The capital of Italy is Rome.' }
    ];
    session = await Session.create({ initialPrompts });
    const response = await session.prompt('What language do they speak there?');
    assert.ok(response.includes("I'm a mock AI assistant"));
  });

  await t.test('token tracking', async () => {
    session = await Session.create();
    
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
    session = await Session.create();
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

  await t.test('clone with system prompt', async () => {
    session = await Session.create({
      systemPrompt: 'You are a helpful translator.'
    });
    
    const clonedSession = await session.clone();
    const response = await clonedSession.prompt('Hello');
    assert.ok(response.includes('Translated: Hello'));

    await clonedSession.destroy();
  });

 await t.test('template system integration', async () => {
    session = await Session.create();

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
    });

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
    session = await Session.create();
    
    session.addFallback('backup', {
      prompt: async () => "I'm a mock AI assistant"
    });
    
    const response = await session.prompt('Test');
    assert.ok(response.includes("I'm a mock AI assistant"));
  });
/*
  await t.test('analytics tracking', async () => {
    session = await Session.create();
    
    // Track various metrics
    await session.prompt('Test prompt');
    await session.promptStreaming('Test stream');
    
    const analytics = session.getAnalytics();
    
    // Verify metrics are being tracked
    assert.ok(analytics.error || analytics.prompt_latency);

    // Verify error tracking
    await assert.rejects(
      session.prompt(undefined),
      { message: 'Invalid prompt' }
    );

    const errorStats = session.getAnalytics();
    assert.ok(errorStats.error);
  });


*/





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
      });
    });
    
    // Wait for progress events to complete
    await progressPromise;
    assert.ok(progressEvents > 0);
  });

});
