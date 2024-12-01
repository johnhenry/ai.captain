# Window Chain API Reference

## Core Functions

### createWindowChain

Create a new Window Chain instance with all features enabled.

```typescript
function createWindowChain(options?: {
  session?: {
    temperature?: number;
  };
}): Promise<WindowChain>;
```

## Core Classes

### WindowChain

The main class for interacting with window.ai's language models.

```typescript
interface WindowChain {
  session: Session;
  capabilities: Capabilities;
  templates: TemplateSystem;
  composer: CompositionBuilder;
  // ... other components
}
```

### Session

Manages interactions with window.ai's language models.

```typescript
class Session {
  constructor(session: Object);

  /**
   * Send a prompt to the model
   * @throws {Error} When model output is in an untested language
   * @throws {Error} For other model-related errors
   */
  prompt(
    text: string,
    options?: { temperature?: number }
  ): Promise<string>;

  /**
   * Send a prompt and receive a streaming response
   * @returns A ReadableStream that must be consumed using a reader
   * @example
   * const stream = await session.promptStreaming("Tell me a story");
   * const reader = stream.getReader();
   * try {
   *   while (true) {
   *     const { done, value } = await reader.read();
   *     if (done) break;
   *     console.log(value);
   *   }
   * } finally {
   *   reader.releaseLock();
   * }
   */
  promptStreaming(
    text: string,
    options?: { temperature?: number }
  ): Promise<ReadableStream>;

  /**
   * Clean up resources
   */
  destroy(): Promise<void>;
}
```

### TemplateSystem

Creates and manages message templates with variable substitution.

```typescript
class TemplateSystem {
  constructor(session: Session);

  /**
   * Register a new template
   */
  register(
    name: string,
    content: string,
    defaults?: Record<string, any>
  ): void;

  /**
   * Create a new template that inherits from a parent template
   * @throws {Error} When parent template is not found
   */
  inherit(
    name: string,
    parentName: string,
    defaults?: Record<string, any>
  ): void;

  /**
   * Apply a template with given variables
   * @throws {Error} When template is not found
   * @throws {Error} When required variables are missing
   */
  apply(
    name: string,
    variables?: Record<string, any>
  ): Promise<string>;
}
```

### CompositionBuilder

Advanced composition pattern builder for chaining operations.

```typescript
class CompositionBuilder {
  constructor(session: Session);

  /**
   * Add a processing step
   * @example
   * composer
   *   .pipe(async (input) => {
   *     const result = await session.prompt(input);
   *     return result.trim();
   *   })
   *   .build();
   */
  pipe(fn: Function): CompositionBuilder;

  /**
   * Add a conditional branch
   */
  branch(
    condition: Function,
    ifTrue: Function,
    ifFalse: Function
  ): CompositionBuilder;

  /**
   * Add parallel processing
   */
  parallel(fns: Function[]): CompositionBuilder;

  /**
   * Build the composition
   * @returns An async function that executes the composition
   */
  build(): (input: any) => Promise<any>;
}
```

## Error Handling

The library can throw several types of errors:

```typescript
// Model output errors
Error: "The model attempted to output text in an untested language"

// Template errors
Error: "Template '[name]' not found"
Error: "Missing required parameter: [param]"
Error: "Parent template '[name]' not found"

// Session errors
Error: "window.ai API not available"

// JSON parsing errors
SyntaxError: "Unexpected token in JSON"
```

## Best Practices

1. Always handle potential errors from model interactions:
```typescript
try {
  const response = await chain.session.prompt(input);
  console.log(response);
} catch (error) {
  if (error.message?.includes('untested language')) {
    console.error("Language not supported:", error.message);
  } else {
    console.error("Model error:", error.message);
  }
}
```

2. Handle JSON parsing errors:
```typescript
try {
  const result = await chain.session.prompt(jsonTemplate);
  return JSON.parse(result.trim());
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error("Failed to parse JSON:", error.message);
    return null;
  }
  throw error;  // Re-throw other errors
}
```

3. Properly clean up streaming resources:
```typescript
const stream = await chain.session.promptStreaming(input);
const reader = stream.getReader();
try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process(value);
  }
} finally {
  reader.releaseLock();
}
```

4. Handle template errors:
```typescript
try {
  const message = await templates.apply('myTemplate', variables);
} catch (error) {
  if (error.message?.includes('not found')) {
    console.error("Template error:", error.message);
  } else if (error.message?.includes('required parameter')) {
    console.error("Missing parameter:", error.message);
  } else {
    throw error;
  }
}
```

## Complete Example

```javascript
import { createWindowChain } from 'window-chain';

// Create instance with all features
const chain = await createWindowChain({
  session: {
    systemPrompt: 'You are a helpful assistant'

  },
  cache: {
    distributed: true,
    compression: true
  },
  analytics: {
    sampleSize: 100
  },
  fallback: {
    maxAttempts: 3
  }
});

// Use features
const template = chain.templates.register("t", 'Hello, {name}!');
const begin = +new Date();
const result = await chain.session.prompt(await chain.templates.apply("t", { name: "World" }));

// Monitor performance
chain.analytics.record('responseTime', +new Date() - begin);

console.log(result);

// Handle fallbacks
const response = await chain.fallback.execute(async () => {
  return await chain.session.prompt('Complex query');
});

console.log(response);
console.log(chain.analytics.metrics.get('responseTime'));

// Clean up
await chain.destroy();
```

## Migration Guide

If you're upgrading from an earlier version, please note these changes:

### 0.1.0
- Initial release with core features

For more detailed information about specific components, please refer to the inline documentation in the source code.
