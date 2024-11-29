# Testing Guide

This guide covers best practices for testing Window Chain applications using Node's built-in test runner and assertion library.

## Setting Up Tests

### Basic Test Structure

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import {
  Session,
  TemplateSystem,
  DistributedCache,
  CompositionBuilder
} from 'window-chain';

test('Window Chain component tests', async (t) => {
  // Test groups go here
});
```

### Mock Session

Create a mock session for testing:

```javascript
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

## Testing Components

### Session Tests

```javascript
test('Session', async (t) => {
  const mockResponses = {
    'Hello': 'Hi there!',
    '{"role":"user","content":"Test"}': 'Test response'
  };
  
  const session = new MockSession(mockResponses);

  await t.test('simple prompt', async () => {
    const response = await session.prompt('Hello');
    assert.equal(response, 'Hi there!');
  });

  await t.test('message prompt', async () => {
    const response = await session.prompt([
      { role: 'user', content: 'Test' }
    ]);
    assert.equal(response, 'Test response');
  });
});
```

### Template System Tests

```javascript
test('TemplateSystem', async (t) => {
  const templateSystem = new TemplateSystem();

  await t.test('template creation', () => {
    const template = templateSystem.create([
      ['system', 'You are a {role}.'],
      ['human', 'Tell me about {topic}.']
    ], ['role', 'topic']);

    const messages = template({
      role: 'teacher',
      topic: 'math'
    });

    assert.deepEqual(messages, [
      { role: 'system', content: 'You are a teacher.' },
      { role: 'human', content: 'Tell me about math.' }
    ]);
  });

  await t.test('template validation', () => {
    const template = templateSystem.create([
      ['system', 'Test {value}']
    ], ['value']);

    assert.throws(() => template({}), {
      name: 'ValidationError',
      message: /missing required variable/
    });
  });
});
```

### Cache Tests

```javascript
test('DistributedCache', async (t) => {
  const cache = new DistributedCache({
    namespace: 'test'
  });

  await t.test('basic operations', async () => {
    await cache.set('key', 'value');
    const value = await cache.get('key');
    assert.equal(value, 'value');

    await cache.delete('key');
    const deleted = await cache.get('key');
    assert.equal(deleted, null);
  });

  await t.test('cache wrapper', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      return 'result';
    };

    const cached = cache.withCache(fn);
    
    const result1 = await cached('arg');
    const result2 = await cached('arg');

    assert.equal(result1, 'result');
    assert.equal(result2, 'result');
    assert.equal(calls, 1); // Function called only once
  });
});
```

### Composition Tests

```javascript
test('CompositionBuilder', async (t) => {
  const session = new MockSession();
  const cache = new DistributedCache();
  const builder = new CompositionBuilder();

  await t.test('basic composition', async () => {
    const enhanced = builder
      .withCache(cache)
      .build(session.prompt.bind(session));

    const result = await enhanced('test');
    assert.equal(result, 'Mock response');
  });

  await t.test('error handling', async () => {
    const errorFn = async () => {
      throw new Error('Test error');
    };

    const withRetry = builder
      .withRetry({ maxAttempts: 2 })
      .build(errorFn);

    await assert.rejects(withRetry, {
      message: 'Test error'
    });
  });
});
```

## Integration Tests

### Testing Complete Workflows

```javascript
test('Translation Workflow', async (t) => {
  const session = new MockSession({
    'Translate "Hello" to Spanish': '¡Hola!'
  });

  const templateSystem = new TemplateSystem();
  const cache = new DistributedCache();
  const builder = new CompositionBuilder();

  const translateTemplate = templateSystem.create([
    ['system', 'You are a translator.'],
    ['human', 'Translate "{text}" to {language}.']
  ], ['text', 'language']);

  const translate = builder
    .withCache(cache)
    .build(session.prompt.bind(session));

  const result = await translate(
    translateTemplate({
      text: 'Hello',
      language: 'Spanish'
    })
  );

  assert.equal(result, '¡Hola!');
});
```

### Testing Error Scenarios

```javascript
test('Error Handling', async (t) => {
  const session = new MockSession();
  session.prompt = async () => {
    throw new Error('API Error');
  };

  const builder = new CompositionBuilder();
  let errorCount = 0;

  const robust = builder
    .withRetry({
      maxAttempts: 3,
      onError: () => { errorCount++; }
    })
    .build(session.prompt.bind(session));

  await assert.rejects(robust('test'));
  assert.equal(errorCount, 3);
});
```

## Performance Tests

### Response Time Testing

```javascript
test('Performance', async (t) => {
  const session = new MockSession();
  const analytics = new PerformanceAnalytics();

  const enhanced = new CompositionBuilder()
    .withAnalytics(analytics)
    .build(session.prompt.bind(session));

  await enhanced('test');

  const metrics = analytics.getMetrics('responseTime');
  assert.ok(metrics.mean < 100); // Response time under 100ms
});
```

### Load Testing

```javascript
test('Load Handling', async (t) => {
  const session = new MockSession();
  const builder = new CompositionBuilder();

  const concurrent = builder
    .withConcurrency({
      maxConcurrent: 5
    })
    .build(session.prompt.bind(session));

  const promises = Array(10).fill().map(() =>
    concurrent('test')
  );

  const results = await Promise.all(promises);
  assert.equal(results.length, 10);
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on the state of other tests.
2. **Mocking**: Use mock sessions and responses for predictable testing.
3. **Coverage**: Test both success and error scenarios.
4. **Async/Await**: Always use async/await for asynchronous operations.
5. **Cleanup**: Clean up resources (like cache) after tests.
6. **Assertions**: Use specific assertions that clearly indicate what's being tested.
7. **Documentation**: Document test scenarios and expected outcomes.
