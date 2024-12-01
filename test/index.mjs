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



// Test suite for Capabilities
test('Capabilities', async (t) => {
  let capabilities;

  t.beforeEach(async () => {
    capabilities = await Capabilities.get();
  });

  await t.test('static get method', async () => {
    const caps = await Capabilities.get();
    assert.ok(caps instanceof Capabilities);
    assert.ok(caps.available);
    assert.ok(caps.defaultTopK);
    assert.ok(caps.maxTopK);
    assert.ok(caps.defaultTemperature);
  });

  await t.test('availability status methods', async () => {
    // Test isReady
    capabilities.available = 'readily';
    assert.strictEqual(capabilities.isReady(), true);
    capabilities.available = 'after-download';
    assert.strictEqual(capabilities.isReady(), false);

    // Test needsDownload
    assert.strictEqual(capabilities.needsDownload(), true);
    capabilities.available = 'no';
    assert.strictEqual(capabilities.needsDownload(), false);

    // Test isUnavailable
    assert.strictEqual(capabilities.isUnavailable(), true);
    capabilities.available = 'readily';
    assert.strictEqual(capabilities.isUnavailable(), false);
  });

  await t.test('getRecommendedParams', async () => {
    capabilities.defaultTemperature = 0.7;
    capabilities.defaultTopK = 40;

    // Test with no user config
    const defaultParams = capabilities.getRecommendedParams();
    assert.strictEqual(defaultParams.temperature, 0.7);
    assert.strictEqual(defaultParams.topK, 40);

    // Test with user config
    const userParams = capabilities.getRecommendedParams({
      temperature: 0.9,
      topK: 50
    });
    assert.strictEqual(userParams.temperature, 0.9);
    assert.strictEqual(userParams.topK, 50);
  });

  await t.test('validateConfig', async () => {
    capabilities.maxTopK = 100;

    // Test valid config
    const validResult = capabilities.validateConfig({
      temperature: 1.0,
      topK: 50
    });
    assert.strictEqual(validResult.valid, true);
    assert.strictEqual(validResult.issues.length, 0);

    // Test invalid topK
    const invalidTopK = capabilities.validateConfig({
      topK: 150
    });
    assert.strictEqual(invalidTopK.valid, false);
    assert.strictEqual(invalidTopK.issues.length, 1);
    assert.ok(invalidTopK.issues[0].includes('topK value 150 exceeds maximum 100'));

    // Test invalid temperature
    const invalidTemp = capabilities.validateConfig({
      temperature: 2.5
    });
    assert.strictEqual(invalidTemp.valid, false);
    assert.strictEqual(invalidTemp.issues.length, 1);
    assert.ok(invalidTemp.issues[0].includes('temperature must be between 0 and 2'));

    // Test multiple issues
    const multipleIssues = capabilities.validateConfig({
      temperature: -1,
      topK: 200
    });
    assert.strictEqual(multipleIssues.valid, false);
    assert.strictEqual(multipleIssues.issues.length, 2);
  });
});

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

  /*
  await t.test('template composition', async () => {
    session = await Session.create();
    templates = new TemplateSystem(session);
    
    templates.register('header', '=== {title} ===');
    templates.register('footer', '--- {note} ---');
    templates.register('page', '{header}\n{content}\n{footer}');
    
    const result = await templates.apply('page', {
      header: templates.apply('header', { title: 'Test' }),
      content: 'Main content',
      footer: templates.apply('footer', { note: 'End' })
    });

    assert.ok(result.includes('=== Test ==='));
    assert.ok(result.includes('Main content'));
    assert.ok(result.includes('--- End ---'));
  });
  */
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

  /*
  await t.test('template integration', async () => {
    chain = await createWindowChain();

    chain.templates.register('test', 'Hello {name}!');
    const response = await chain.session.prompt(['test', { name: 'World' }]);
    assert.ok(response.includes("I'm a mock AI assistant"));
  });
  */

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



// Test suite for FallbackSystem
test('FallbackSystem', async (t) => {
  // let fallback;

  // t.beforeEach(() => {
  //   fallback = new FallbackSystem();
  // });

  // await t.test('basic fallback', async () => {
  //   fallback.register('primary', async () => 'primary response');
  //   fallback.register('secondary', async () => 'secondary response');

  //   const response = await fallback.execute();
  //   assert.strictEqual(response, 'primary response');
  // });

  // await t.test('fallback on error', async () => {
  //   fallback.register('primary', async () => { throw new Error('primary failed'); });
  //   fallback.register('secondary', async () => 'secondary response');

  //   const response = await fallback.execute();
  //   assert.strictEqual(response, 'secondary response');
  // });

  // await t.test('all fallbacks fail', async () => {
  //   fallback.register('primary', async () => { throw new Error('primary failed'); });
  //   fallback.register('secondary', async () => { throw new Error('secondary failed'); });

  //   await assert.rejects(
  //     fallback.execute(),
  //     { message: 'All fallbacks failed' }
  //   );
  // });

  // await t.test('fallback with context', async () => {
  //   fallback.register('primary', async (context) => {
  //     if (context.retry) throw new Error('primary failed');
  //     return 'primary response';
  //   });
  //   fallback.register('secondary', async () => 'secondary response');

  //   const response = await fallback.execute({ retry: true });
  //   assert.strictEqual(response, 'secondary response');
  // });
});

// Test suite for TemplateValidator
test('TemplateValidator', async (t) => {
  // let validator;

  // t.beforeEach(() => {
  //   validator = new TemplateValidator();
  // });

  // await t.test('basic validation', async () => {
  //   const template = 'Hello {name}!';
  //   const params = { name: 'World' };

  //   const result = validator.validate(template, params);
  //   assert.strictEqual(result.valid, true);
  //   assert.strictEqual(result.issues.length, 0);
  // });

  // await t.test('missing parameters', async () => {
  //   const template = 'Hello {name}!';
  //   const params = {};

  //   const result = validator.validate(template, params);
  //   assert.strictEqual(result.valid, false);
  //   assert.strictEqual(result.issues.length, 1);
  //   assert.ok(result.issues[0].includes('Missing required parameters: name'));
  // });

  // await t.test('extra parameters', async () => {
  //   const template = 'Hello {name}!';
  //   const params = { name: 'World', extra: 'param' };

  //   const result = validator.validate(template, params);
  //   assert.strictEqual(result.valid, true);
  //   assert.strictEqual(result.issues.length, 0);
  // });

  // await t.test('invalid template syntax', async () => {
  //   const template = 'Hello {name!';
  //   const params = { name: 'World' };

  //   const result = validator.validate(template, params);
  //   assert.strictEqual(result.valid, false);
  //   assert.strictEqual(result.issues.length, 1);
  //   assert.ok(result.issues[0].includes('Invalid template syntax'));
  // });
});
