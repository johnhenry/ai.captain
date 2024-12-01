import assert from 'node:assert';
import test from 'node:test';
import { windowAI } from './window.ai.mock.mjs';

// Replace global window.ai with the mock implementation
globalThis.ai = windowAI;

// Import the functions to be tested
import {
  Session,
  Capabilities,
  TemplateSystem,
  TemplateValidator,
  DistributedCache,
  CacheCompression,
  CompositionBuilder,
  CompositionChains,
  PerformanceAnalytics,
  FallbackSystem,
  createWindowChain
} from '../src/index.js';
import {
  FileReader,
  TextEncoder,
  Blob,
  CompressionStream,
  DecompressionStream,
  Response
} from './browser.mock.mjs';

// Set up browser API mocks
globalThis.FileReader = FileReader;
globalThis.TextEncoder = TextEncoder;
globalThis.Blob = Blob;
globalThis.CompressionStream = CompressionStream;
globalThis.DecompressionStream = DecompressionStream;
globalThis.Response = Response;
// Test suite for Session
test('Session', async (t) => {
  let session;

  t.afterEach(async () => {
    if (session) {
      await session.destroy();
      session = null;
    }
  });


  await t.test('template inheritance', async () => {
    const session = await Session.create();
    const templates = new TemplateSystem(session);

    templates.register('base', 'system: {role}\nhuman: {query}');
    templates.inherit('translator', 'base', { defaults: { role: 'You are a translator' } });

    const result = await templates.apply('translator', { query: 'Translate "hello"' });
    assert.equal(result, 'system: You are a translator\nhuman: Translate "hello"');
  });


  await t.test('template system integration', async () => {
    const session = await Session.create();

    // Register templates before using them
    session.registerTemplate('base', 'system: {role}\nhuman: {query}');
    session.inheritTemplate('translator', 'base', { defaults: { role: 'You are a translator' } });

    // const templates = session.templates;
    // const result = await templates.apply('translator', { query: 'Translate "hello"' });
    // assert.equal(result, 'system: You are a translator\nhuman: Translate "hello"');

    // Test template usage
    const response = await session.prompt(['translator', { query: 'What are you?'}]);
    assert.ok(response.includes("I'm a mock AI assistant"));
  });

  /*

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




});
