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

### Unit Testing

Test individual components:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';

test('TemplateSystem', async (t) => {
  const templateSystem = new TemplateSystem();
  
  await t.test('template validation', () => {
    const template = templateSystem.create([
      ['system', 'Test {value}']
    ], ['value']);
    
    assert.doesNotThrow(() => template({ value: 'valid' }));
    assert.throws(() => template({}), ValidationError);
  });
});
```

### Integration Testing

Test component integration:

```javascript
test('Composition Chain', async (t) => {
  const session = new Session();
  const cache = new DistributedCache();
  const analytics = new PerformanceAnalytics();
  
  const chain = new CompositionBuilder()
    .withCache(cache)
    .withAnalytics(analytics)
    .build(session.prompt.bind(session));
  
  const result = await chain('Test prompt');
  assert.ok(result);
  
  const metrics = analytics.getMetrics('responseTime');
  assert.ok(metrics.count > 0);
});
```
