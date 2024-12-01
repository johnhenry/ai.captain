import assert from 'node:assert';
import test from 'node:test';
import { windowAI } from './window.ai.mock.mjs';

// Replace global window.ai with the mock implementation
globalThis.ai = windowAI;

// Import the functions to be tested
import {
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


// Test suite for TemplateSystem
test('TemplateSystem', async (t) => {
  let session;
  let templates;

  t.afterEach(async () => {
    if (session) {
      await session.destroy();
      session = null;
    }
  });

  await t.test('basic functionality', async () => {
    session = await Session.create();
    templates = new TemplateSystem(session);
    
    // Test template registration
    templates.register('translate', 'system: You are a helpful translator.\nhuman: Translate "{text}" to {language}."');
    templates.register('sentiment', 'system: You analyze sentiment and return JSON.\nhuman: Analyze the sentiment of this text: {text}');
    
    // Test template application
    const translatedText = await templates.apply('translate', { text: 'Hello', language: 'Spanish' });
    assert.ok(translatedText.includes('Translate "Hello" to Spanish'));
    
    const sentimentText = await templates.apply('sentiment', { text: 'I love this!' });
    assert.ok(sentimentText.includes('Analyze the sentiment of this text: I love this!'));
  });

  await t.test('template validation', async () => {
    session = await Session.create();
    templates = new TemplateSystem(session);
    
    // Test missing parameter handling
    templates.register('test', 'Hello {name}!');
    await assert.rejects(
      templates.apply('test', {}),
      { message: 'Missing required parameters: name' }
    );
  });

  await t.test('template inheritance', async () => {
    session = await Session.create();
    templates = new TemplateSystem(session);
    
    templates.register('base', 'system: {role}\nhuman: {query}');
    templates.inherit('translator', 'base', { defaults: { role: 'You are a translator' } });

    const result = await templates.apply('translator', { query: 'Translate "hello"' });
    assert.equal(result, 'system: You are a translator\nhuman: Translate "hello"');
  });


  await t.test('template composition', async () => {
    session = await Session.create();
    templates = new TemplateSystem(session);
    
    templates.register('header', '=== {title} ===');
    templates.register('footer', '--- {note} ---');
    templates.register('page', '{header}\n{content}\n{footer}');
    
    const result = await templates.apply('page', {
      header: await templates.apply('header', { title: 'Test' }),
      content: 'Main content',
      footer: await templates.apply('footer', { note: 'End' })
    });
    console.log({result})

    assert.ok(result.includes('=== Test ==='));
    assert.ok(result.includes('Main content'));
    assert.ok(result.includes('--- End ---'));
  });

});

// Test suite for DistributedCache
test('DistributedCache', async (t) => {
  let cache;

  t.beforeEach(() => {
    cache = new DistributedCache();
  });

  t.afterEach(async () => {
    await cache.clear();
  });

  await t.test('basic operations', async () => {
    // Test set and get
    await cache.set('key1', 'value1');
    const value = await cache.get('key1');
    assert.equal(value, 'value1');

    // Test missing key
    const missing = await cache.get('nonexistent');
    assert.equal(missing, undefined);
  });

  await t.test('expiration', async () => {
    cache = new DistributedCache({ defaultTTL: 100 }); // 100ms TTL
    
    await cache.set('key1', 'value1');
    const immediate = await cache.get('key1');
    assert.equal(immediate, 'value1');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    const expired = await cache.get('key1');
    assert.equal(expired, undefined);
  });

  await t.test('custom TTL', async () => {
    cache = new DistributedCache({ defaultTTL: 1000 });

    await cache.set('key1', 'value1', 100); // Override with 100ms TTL
    const immediate = await cache.get('key1');
    assert.equal(immediate, 'value1');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    const expired = await cache.get('key1');
    assert.equal(expired, undefined);
  });

  await t.test('clear', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    
    await cache.clear();
    
    const value1 = await cache.get('key1');
    const value2 = await cache.get('key2');
    assert.equal(value1, undefined);
    assert.equal(value2, undefined);
  });
  await t.test('complex values', async () => {
    const complexValue = {
      string: 'test',
      number: 123,
      boolean: true,
      array: [1, 2, 3],
      nested: { a: 1, b: 2 }
    };
    
    await cache.set('complex', complexValue);
    const retrieved = await cache.get('complex');
    assert.deepStrictEqual(retrieved, complexValue);
  });

  await t.test('concurrent operations', async () => {
    // Test just 3 concurrent operations
    await Promise.all([
      cache.set('key1', 'value1'),
      cache.set('key2', 'value2'),
      cache.set('key3', 'value3')
    ]);

    // Verify all operations succeeded
    const [value1, value2, value3] = await Promise.all([
      cache.get('key1'),
      cache.get('key2'),
      cache.get('key3')
    ]);
    
    assert.equal(value1, 'value1');
    assert.equal(value2, 'value2');
    assert.equal(value3, 'value3');
  });
});

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

// Test suite for CompositionChains
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
    session = await Session.create();
    chains = new CompositionChains(session);

    // Create a simple translation chain
    const chain = chains.create()
      .addStep('translate', { from: 'English', to: 'Spanish' })
      .addStep('translate', { from: 'Spanish', to: 'French' });

    const result = await chain.execute('Hello');
    assert.ok(result.length > 0);
  });

  await t.test('chain with error handling', async () => {
    session = await Session.create();
    chains = new CompositionChains(session);
    
    const chain = chains.create()
      .addStep('translate', { from: 'English', to: 'Spanish' })
      .onError((error, retry) => retry());
    
    const result = await chain.execute('Hello');
    assert.ok(result.length > 0);
  });

  await t.test('chain with validation', async () => {
    session = await Session.create();
    chains = new CompositionChains(session);

    const chain = chains.create()
      .addStep('translate', { from: 'English', to: 'Spanish' })
      .validate(result => result.length > 0);

    const result = await chain.execute('Hello');
    assert.ok(result.length > 0);
  });
});

// Test suite for createWindowChain
test('createWindowChain', async (t) => {
  let chain;

  t.afterEach(async () => {
    if (chain) {
      await chain.destroy();
      chain = null;
    }
  });

  await t.test('basic functionality', async () => {
    chain = await createWindowChain();
    assert.ok(chain.session instanceof Session);
    assert.ok(chain.capabilities);
    assert.ok(chain.templates instanceof TemplateSystem);
    assert.ok(chain.validator instanceof TemplateValidator);
    assert.ok(chain.cache instanceof DistributedCache);
    assert.ok(chain.analytics instanceof PerformanceAnalytics);
    assert.ok(chain.chains instanceof CompositionChains);
  });

  await t.test('custom configuration', async () => {
    chain = await createWindowChain({
      temperature: 0.8,
      cache: { enabled: true },
      fallback: { enabled: true }
    });

    assert.ok(chain.session instanceof Session);
    const response = await chain.session.prompt('Test');
    assert.ok(response.includes("I'm a mock AI assistant"));
  });


  await t.test('template integration', async () => {
    chain = await createWindowChain();
    await chain.templates.register('test', 'Hello {name}!');
    const response = await chain.session.prompt(['test', { name: 'World' }]);
    assert.ok(response.includes("I'm a mock AI assistant"));
  });

});

// Test suite for CacheCompression
test('CacheCompression', async (t) => {
  let compression;

  t.beforeEach(() => {
    compression = new CacheCompression({
      threshold: 10 // Set lower threshold for testing
    });
  });

  await t.test('constructor options', () => {
    const custom = new CacheCompression({
      algorithm: 'deflate',
      level: 'max',
      threshold: 2048
    });

    assert.strictEqual(custom.options.algorithm, 'deflate');
    assert.strictEqual(custom.options.level, 'max');
    assert.strictEqual(custom.options.threshold, 2048);
  });

  await t.test('compression threshold', async () => {
    const smallData = { test: 'small' };
    const result = await compression.compress(smallData);
    
    assert.strictEqual(result.compressed, true);
    assert.strictEqual(result.algorithm, 'lz');
    assert.ok(result.data);
  });

  await t.test('LZ compression/decompression', async () => {
    const testData = {
      text: 'AAAAABBBCC', // String with repeating characters
      numbers: [1, 1, 1, 2, 2, 3] // Array with repeating numbers
    };

    const compressed = await compression.compress(testData);
    assert.strictEqual(compressed.compressed, true);
    assert.strictEqual(compressed.algorithm, 'lz');
    assert.ok(compressed.data);

    const decompressed = await compression.decompress(compressed);
    assert.deepStrictEqual(decompressed, testData);
  });

  await t.test('deflate compression/decompression', async () => {
    compression = new CacheCompression({
      algorithm: 'deflate',
      threshold: 10
    });
    
    const testData = {
      text: 'Test deflate compression'
    };

    const compressed = await compression.compress(testData);
    assert.strictEqual(compressed.compressed, true);
    assert.strictEqual(compressed.algorithm, 'deflate');
    assert.ok(compressed.data);

    const decompressed = await compression.decompress(compressed);
    assert.deepStrictEqual(decompressed, testData);
  });

  await t.test('compression statistics', async () => {
    const testData = {
      text: 'This is a test string that should be long enough to compress'
    };

    const compressed = await compression.compress(testData);
    const stats = compression.getStats(compressed);

    assert.ok(stats.originalSize > 0);
    assert.ok(stats.compressedSize > 0);
    assert.ok(stats.compressionRatio > 0);
    assert.ok(stats.spaceSaved >= 0);
    assert.strictEqual(stats.algorithm, 'lz');
  });

  await t.test('error handling', async () => {
    await assert.rejects(
      () => compression.compress(undefined),
      {
        name: 'Error',
        message: 'Cannot compress undefined data'
      }
    );

    await assert.rejects(
      () => compression.decompress({
        compressed: true,
        algorithm: 'invalid',
        data: btoa('test')
      }),
      {
        name: 'Error',
        message: 'Unsupported compression algorithm: invalid'
      }
    );
  });
  await t.test('compression levels', async () => {
    const testData = { text: 'Test compression levels'.repeat(10) };

    // Test fast compression
    const fastCompression = new CacheCompression({
      level: 'fast',
      threshold: 10
    });
    const fastResult = await fastCompression.compress(testData);

    // Test max compression
    const maxCompression = new CacheCompression({
      level: 'max',
      threshold: 10
    });
    const maxResult = await maxCompression.compress(testData);
    
    // Verify both compress successfully
    assert.ok(fastResult.compressed);
    assert.ok(maxResult.compressed);
  });

  await t.test('large data handling', async () => {
    const largeData = {
      text: 'Large text '.repeat(100),
      numbers: Array(100).fill(0).map((_, i) => i)
    };
    
    const compressed = await compression.compress(largeData);
    assert.ok(compressed.compressed);
    
    const decompressed = await compression.decompress(compressed);
    assert.deepStrictEqual(decompressed, largeData);
  });
});

import "./fallback.mjs";
import "./validation.mjs";
import "./session.mjs";
import "./capabilities.mjs";
