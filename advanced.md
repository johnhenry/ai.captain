# Advanced Guide

## Template System

### Template Inheritance

Templates can inherit from and extend other templates:

```javascript
const templateSystem = new TemplateSystem();

// Base template
const baseTemplate = templateSystem.create([
  ['system', 'You are a helpful assistant specialized in {domain}.'],
  ['human', '{query}']
], ['domain', 'query']);

// Extended template for translation
const translatorTemplate = templateSystem.inherit(baseTemplate, {
  domain: 'translation',
  systemPrompt: 'You are a helpful translator specialized in {languages}.',
  variables: ['languages', 'query']
});
```

### Custom Validation Rules

Create custom validation rules for template inputs:

```javascript
const validator = new TemplateValidator({
  age: 'number',
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  tags: ['string']
});

const template = templateSystem.create([
  ['system', 'Process user data'],
  ['human', 'User age: {age}, email: {email}, tags: {tags}']
], ['age', 'email', 'tags']);

// Validate before use
if (validator.validate(inputData)) {
  const result = await session.prompt(template(inputData));
} else {
  console.error(validator.getErrors());
}
```

## Distributed Caching

### Cache Strategies

Configure different caching strategies:

```javascript
const cache = new DistributedCache({
  namespace: 'my-app',
  ttl: 3600, // 1 hour
  compression: true,
  strategy: 'lru', // Least Recently Used
  maxSize: 1000 // Maximum number of items
});

// With Redis backend
const redisCache = new DistributedCache({
  backend: 'redis',
  redisUrl: process.env.REDIS_URL,
  compression: true
});
```

### Cache Compression

Optimize cache storage with compression:

```javascript
// Automatic compression for large values
const cache = new DistributedCache({
  compression: {
    threshold: 1024, // Compress values larger than 1KB
    algorithm: 'lz4' // Use LZ4 compression
  }
});

// Manual compression
const compressed = await CacheCompression.compress(largeData);
await cache.set('key', compressed, { compressed: true });
```

## Advanced Composition

### Custom Composition Patterns

Create reusable composition patterns:

```javascript
class TranslationChain extends CompositionChains {
  constructor(session, options = {}) {
    super(session);
    this.options = options;
  }

  async translate(text, fromLang, toLang) {
    return this.build()
      .withCache(this.cache)
      .withRetry({ maxAttempts: 3 })
      .withAnalytics(this.analytics)
      .execute(async () => {
        const result = await this.session.prompt(
          this.createPrompt(text, fromLang, toLang)
        );
        return this.parseResult(result);
      });
  }
}
```

### Error Recovery

Implement sophisticated error recovery:

```javascript
const robustChain = new CompositionBuilder()
  .withFallback(new FallbackSystem(session, {
    handlers: {
      timeout: async (error, attempt) => {
        if (attempt < 3) return 'retry';
        return 'abort';
      },
      validation: async (error) => {
        return 'fix-and-retry';
      }
    }
  }))
  .withCache(cache)
  .build(async (input) => {
    // Complex operation
  });
```

## Performance Monitoring

### Custom Metrics

Track custom performance metrics:

```javascript
const analytics = new PerformanceAnalytics();

// Track token usage
analytics.trackMetric('tokenUsage', {
  calculate: (response) => response.usage.totalTokens,
  aggregate: 'sum'
});

// Track response times
analytics.trackMetric('responseTime', {
  calculate: (_, duration) => duration,
  aggregate: 'p95'
});

// Generate reports
const report = analytics.generateReport({
  metrics: ['tokenUsage', 'responseTime'],
  timeframe: '24h',
  groupBy: 'endpoint'
});
```

### Performance Optimization

Optimize performance with advanced techniques:

```javascript
// Parallel processing with rate limiting
const batchProcessor = new CompositionBuilder()
  .withConcurrency({
    maxConcurrent: 5,
    rateLimit: {
      requests: 10,
      period: '1s'
    }
  })
  .withCache(cache)
  .withAnalytics(analytics)
  .build(async (inputs) => {
    const results = await Promise.all(
      inputs.map(input => session.prompt(input))
    );
    return results;
  });

// Stream processing with backpressure
const streamProcessor = new CompositionBuilder()
  .withBackpressure({
    highWaterMark: 1000,
    strategy: 'throttle'
  })
  .build(async function* (stream) {
    for await (const chunk of stream) {
      yield await session.prompt(chunk);
    }
  });
```

## Security Best Practices

### Input Validation

Implement thorough input validation:

```javascript
const secureTemplate = templateSystem.create([
  ['system', 'Process user input'],
  ['human', '{input}']
], ['input'])
  .withValidation({
    input: {
      type: 'string',
      maxLength: 1000,
      sanitize: true,
      allowedTags: ['p', 'br', 'em', 'strong']
    }
  })
  .withRateLimiting({
    maxRequests: 100,
    window: '1m'
  });
```

### Error Handling

Implement secure error handling:

```javascript
try {
  const result = await session.prompt(input);
} catch (error) {
  if (error instanceof ValidationError) {
    // Log validation error, don't expose details
    logger.warn('Validation error', { code: error.code });
    throw new PublicError('Invalid input');
  } else if (error instanceof ModelError) {
    // Handle model errors
    analytics.recordError(error);
    throw new PublicError('Service temporarily unavailable');
  }
}
```

## Testing

### Setting Up Tests

Create a mock session for testing Window Chain components:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import {
  Session,
  TemplateSystem,
  DistributedCache,
  CompositionBuilder
} from 'window-chain';

class MockSession extends Session {
  constructor(responses = {}) {
    super();
    this.responses = responses;
  }

  async prompt(input) {
    const key = typeof input === 'string' ? input : JSON.stringify(input);
    return this.responses[key] || 'Mock response';
  }

  async streamPrompt(input) {
    const response = await this.prompt(input);
    return {
      async *[Symbol.asyncIterator]() {
        yield { content: response };
      }
    };
  }
}
```

### Testing Templates

Test template creation and validation:

```javascript
test('TemplateSystem', async (t) => {
  const session = new MockSession();
  const templates = new TemplateSystem(session);

  // Register a template
  templates.register('translator',
    'You are a professional translator.\nTranslate "{text}" to {language}.',
    { text: '', language: '' }
  );

  await t.test('template application', async () => {
    const message = await templates.apply('translator', {
      text: "Hello world",
      language: "Spanish"
    });
    assert.match(message, /You are a professional translator/);
    assert.match(message, /Translate "Hello world" to Spanish/);
  });

  await t.test('template validation', async () => {
    await assert.rejects(
      () => templates.apply('translator', { text: 'Hello' }),
      { message: /Missing required parameter: language/ }
    );
  });
});
```

### Testing Composition

Test composition chains with error handling:

```javascript
test('CompositionBuilder', async (t) => {
  const session = new MockSession({
    'Hello': 'Hi there!',
    'Error test': new Error('Test error')
  });

  const composer = new CompositionBuilder(session);

  await t.test('basic composition', async () => {
    const enhanced = composer
      .pipe(async (input) => {
        const result = await session.prompt(input);
        return result.trim();
      })
      .build();

    const result = await enhanced('Hello');
    assert.equal(result, 'Hi there!');
  });

  await t.test('error handling', async () => {
    const withRetry = composer
      .pipe(async (input) => {
        const result = await session.prompt(input);
        if (result instanceof Error) throw result;
        return result;
      })
      .build();

    await assert.rejects(
      () => withRetry('Error test'),
      { message: 'Test error' }
    );
  });
});
```

### Integration Testing

Test complete workflows:

```javascript
test('Translation Workflow', async (t) => {
  // Mock responses
  const session = new MockSession({
    'Translate "Hello" to Spanish': '¡Hola!',
    'Translate "World" to Spanish': 'Mundo'
  });

  // Setup components
  const templates = new TemplateSystem(session);
  const cache = new DistributedCache({ namespace: 'test' });
  const composer = new CompositionBuilder(session);

  // Register translation template
  templates.register('translator',
    'You are a professional translator.\nTranslate "{text}" to {language}.',
    { text: '', language: '' }
  );

  // Create translation function
  const translate = composer
    .pipe(async (input) => {
      const message = await templates.apply('translator', input);
      const result = await session.prompt(message);
      return result.trim();
    })
    .build();

  // Test workflow
  await t.test('translate text', async () => {
    const hello = await translate({
      text: 'Hello',
      language: 'Spanish'
    });
    assert.equal(hello, '¡Hola!');

    const world = await translate({
      text: 'World',
      language: 'Spanish'
    });
    assert.equal(world, 'Mundo');
  });
});
```

### Testing Best Practices

1. Use mock sessions to avoid API calls during tests
2. Test error cases and edge conditions
3. Validate template inputs and outputs
4. Test complete workflows end-to-end
5. Use the cache during tests to verify caching behavior
6. Test streaming responses
7. Verify error handling and recovery mechanisms
