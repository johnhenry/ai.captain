# Advanced Guide

## Template System

### Template Inheritance

Templates can inherit from and extend other templates, with proper variable handling and validation:

```javascript
import { createAICaptain, TemplateSystem } from 'ai.captain';

// Initialize components
const chain = await createAICaptain();
const templates = new TemplateSystem(chain.session);

// Register base template with validation schema
templates.register('base', 
  'You are a {role} specialized in {domain}.\n{query}',
  {
    defaults: {
      role: 'assistant',
      domain: 'general tasks'
    },
    schema: {
      role: { type: 'string', enum: ['assistant', 'translator', 'analyst'] },
      domain: { type: 'string' },
      query: { type: 'string', minLength: 1 }
    }
  }
);

// Register specialized template that inherits from base
templates.inherit('translator', 'base', {
  defaults: {
    role: 'professional translator',
    domain: '{languages}'
  },
  schema: {
    languages: { type: 'string' },
    text: { type: 'string', minLength: 1 },
    targetLang: { type: 'string', enum: ['Spanish', 'French', 'German'] }
  }
});

// Use the inherited template
// Note: 'role' is automatically filled from translator's defaults
const message = await templates.apply('translator', {
  languages: 'multiple languages',
  text: 'Hello world',
  targetLang: 'Spanish',
  query: 'Translate "{text}" to {targetLang}"'
});

// Send to model
const translation = await chain.session.prompt(message);
```

### Custom Validation Rules

Create custom validation rules for template inputs with comprehensive validation:

```javascript
import { createAICaptain, TemplateSystem } from 'ai.captain';

const chain = await createAICaptain();
const templates = new TemplateSystem(chain.session);

// Add custom validation rules
templates.addValidationRule('isValidAge', value => 
  typeof value === 'number' && value >= 0 && value <= 150
);

templates.addValidationRule('isValidTags', value =>
  Array.isArray(value) && value.length > 0 && value.every(tag => 
    typeof tag === 'string' && tag.length > 0
  )
);

// Register template with validation
templates.register('userProfile', 
  'Process user data:\nAge: {age}\nEmail: {email}\nTags: {tags}',
  {
    defaults: {
      tags: ['user']
    },
    schema: {
      age: {
        type: 'number',
        custom: 'isValidAge',
        required: true
      },
      email: {
        type: 'string',
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
        required: true
      },
      tags: {
        custom: 'isValidTags'
      }
    }
  }
);

// Use template with validation
try {
  const message = await templates.apply('userProfile', {
    age: 25,
    email: 'user@example.com',
    tags: ['developer', 'javascript']
  });
  const response = await chain.session.prompt(message);
} catch (error) {
  if (error.message.includes('validation failed')) {
    console.error('Validation errors:', error.message);
  } else {
    console.error('Other error:', error.message);
  }
}
```

### Custom Validation Rules

Create custom validation rules for template inputs with comprehensive validation:

```javascript
import { createAICaptain, TemplateSystem } from 'ai.captain';

const chain = await createAICaptain();
const templates = new TemplateSystem(chain.session);

// Add custom validation rules
templates.addValidationRule('isValidAge', value => 
  typeof value === 'number' && value >= 0 && value <= 150
);

templates.addValidationRule('isValidTags', value =>
  Array.isArray(value) && value.length > 0 && value.every(tag => 
    typeof tag === 'string' && tag.length > 0
  )
);

// Register template with validation
templates.register('userProfile', 
  'Process user data:\nAge: {age}\nEmail: {email}\nTags: {tags}',
  {
    defaults: {
      tags: ['user']
    },
    schema: {
      age: {
        type: 'number',
        custom: 'isValidAge',
        required: true
      },
      email: {
        type: 'string',
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
        required: true
      },
      tags: {
        custom: 'isValidTags'
      }
    }
  }
);

// Use template with validation
try {
  const message = await templates.apply('userProfile', {
    age: 25,
    email: 'user@example.com',
    tags: ['developer', 'javascript']
  });
  const response = await chain.session.prompt(message);
} catch (error) {
  if (error.message.includes('validation failed')) {
    console.error('Validation errors:', error.message);
  } else {
    console.error('Other error:', error.message);
  }
}
```

[Rest of advanced.md content remains unchanged...]

### Custom Composition Patterns

Create reusable composition patterns:

```javascript
import { createAICaptain, CompositionBuilder } from 'ai.captain';

const chain = await createAICaptain();
const composer = new CompositionBuilder(chain.session);

// Create a translation chain with multiple processing steps
const translationChain = composer
  .pipe(async (input) => {
    // Step 1: Validate input
    if (!input.text || !input.targetLang) {
      throw new Error('Missing required fields');
    }
    return input;
  })
  .pipe(async (input) => {
    // Step 2: Apply translation template
    const message = await templates.apply('translator', input);
    return message;
  })
  .pipe(async (message) => {
    // Step 3: Get translation from model
    const result = await chain.session.prompt(message);
    return result.trim();
  })
  .build();

// Use the translation chain
const result = await translationChain({
  text: 'Hello world',
  targetLang: 'Spanish'
});
```

### Error Recovery

Implement sophisticated error recovery:

```javascript
import { createAICaptain, CompositionBuilder } from 'ai.captain';

const chain = await createAICaptain();
const composer = new CompositionBuilder(chain.session);

// Create prompt with error handling
const robustPrompt = composer
  .pipe(async (input) => {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const result = await chain.session.prompt(input);
        return result.trim();
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          throw new Error(`Failed after ${maxAttempts} attempts: ${error.message}`);
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  })
  .build();

const result = await robustPrompt("Hello!");
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
      inputs.map(input => chain.session.prompt(input))
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
      yield await chain.session.prompt(chunk);
    }
  });
```

## Security Best Practices

### Input Validation

Implement thorough input validation:

```javascript
const secureTemplate = templates.create([
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
  const result = await chain.session.prompt(input);
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

Create a mock session for testing AI Captain components:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import {
  Session,
  TemplateSystem,
  DistributedCache,
  CompositionBuilder
} from 'ai.captain';

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
