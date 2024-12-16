# AI Captain API Reference

## Core Functions

### createAICaptain

Create a new AI Captain instance with all features enabled.

```typescript
function createAICaptain(options?: {
  session?: {
    temperature?: number;
  };
}, ai?: AI): Promise<AICaptain>;
```

## Core Classes

### AICaptain

The main class for interacting with window.ai's language models.

```typescript
interface AICaptain {
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
    text: string | Array<string>,
    options?: {
      temperature?: number;
      cache?: boolean | {
        enabled?: boolean;
        ttl?: number;
        compression?: {
          algorithm?: 'lz' | 'deflate';
          level?: 'fast' | 'default' | 'max';
          threshold?: number;
        }
      }
    }
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
    text: string | Array<string>,
    options?: { temperature?: number }
  ): Promise<ReadableStream>;

  /**
   * Clean up resources
   */
  destroy(): Promise<void>;
}
```

### TemplateSystem

Creates and manages message templates with variable substitution and inheritance.

```typescript
class TemplateSystem {
  constructor(session: Session);

  /**
   * Register a new template
   * @param {string} name Template name
   * @param {string} content Template content with variables in {varName} format
   * @param {Object} options Template options
   * @param {Object} options.defaults Default values for template variables
   * @param {Object} options.schema Validation schema for variables
   * @example
   * templates.register('base', 'You are a {role}.\n{query}', {
   *   defaults: { role: 'helpful assistant' },
   *   schema: {
   *     role: { type: 'string', enum: ['assistant', 'translator', 'analyst'] },
   *     query: { type: 'string', minLength: 1 }
   *   }
   * });
   */
  register(
    name: string,
    content: string,
    options?: {
      defaults?: Record<string, any>;
      schema?: Record<string, Object>;
    }
  ): void;

  /**
   * Create a new template that inherits from a parent template
   * @param {string} name New template name
   * @param {string} parentName Parent template name
   * @param {Object} options Template options
   * @param {Object} options.defaults Override or extend parent's default values
   * @param {Object} options.schema Additional validation rules
   * @throws {Error} When parent template is not found
   * @example
   * // Inherit from base template and override defaults
   * templates.inherit('translator', 'base', {
   *   defaults: { role: 'professional translator' },
   *   schema: {
   *     language: { type: 'string', enum: ['Spanish', 'French', 'German'] }
   *   }
   * });
   */
  inherit(
    name: string,
    parentName: string,
    options?: {
      defaults?: Record<string, any>;
      schema?: Record<string, Object>;
    }
  ): void;

  /**
   * Apply a template with given variables
   * @param {string} name Template name
   * @param {Object} variables Values for template variables
   * @returns {Promise<string>} Processed template with variables replaced
   * @throws {Error} When template is not found
   * @throws {Error} When required variables are missing
   * @throws {Error} When variables fail validation
   * @example
   * // Variables are merged with defaults from entire inheritance chain
   * const message = await templates.apply('translator', {
   *   query: 'Translate "hello" to {language}',
   *   language: 'Spanish'
   * });
   */
  apply(
    name: string,
    variables?: Record<string, any>
  ): Promise<string>;

  /**
   * Add validation schema for a template
   * @param {string} name Template name
   * @param {Object} schema Validation schema
   * @example
   * templates.addSchema('myTemplate', {
   *   age: { type: 'number', min: 0, max: 150 },
   *   email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
   * });
   */
  addSchema(
    name: string,
    schema: Record<string, Object>
  ): void;

  /**
   * Add custom validation rule
   * @param {string} name Rule name
   * @param {Function} validator Validation function
   * @example
   * templates.addValidationRule('isEven', value => value % 2 === 0);
   */
  addValidationRule(
    name: string,
    validator: (value: any) => boolean
  ): void;

  /**
   * Get template information
   * @param {string} name Template name
   * @returns {Object} Template details including inheritance chain
   */
  getTemplateInfo(name: string): {
    content: string;
    variables: string[];
    defaults: Record<string, any>;
    schema?: Object;
    parent?: string;
    inheritance: string[];
  };
}
```

### CompositionBuilder

Advanced composition pattern builder for chaining operations.

```typescript
class CompositionBuilder {
  constructor(session: Session);

  /**
   * Configure caching for the composition
   */
  configureCaching(config: {
    enabled?: boolean;
    ttl?: number;
    keyPrefix?: string;
  }): CompositionBuilder;

  /**
   * Configure templates for the composition
   */
  configureTemplates(config: {
    enabled?: boolean;
    defaults?: Record<string, any>;
    schemas?: Record<string, Object>;
  }): CompositionBuilder;

  /**
   * Add a processing step
   * @example
   * composer
   *   .pipe(async (input) => {
   *     const result = await session.prompt(input);
   *     return result.trim();
   *   }, {
   *     cache: { enabled: true },
   *     template: {
   *       name: 'myTemplate',
   *       content: 'Process: {input}',
   *       variables: { input: '' }
   *     }
   *   })
   *   .build();
   */
  pipe(
    fn: Function,
    options?: {
      cache?: Object;
      template?: Object;
    }
  ): CompositionBuilder;

  /**
   * Add a conditional branch
   */
  branch(
    condition: Function,
    ifTrue: Function,
    ifFalse: Function,
    options?: Object
  ): CompositionBuilder;

  /**
   * Add parallel processing
   */
  parallel(
    fns: Function[],
    options?: Object
  ): CompositionBuilder;

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
Error: "Template validation failed: [details]"
Error: "Circular inheritance detected: [chain]"

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

4. Handle template errors and inheritance:
```typescript
try {
  // Register base template
  templates.register('base', 'You are a {role}.\n{query}', {
    defaults: { role: 'assistant' },
    schema: {
      role: { type: 'string' },
      query: { type: 'string' }
    }
  });

  // Create specialized template
  templates.inherit('translator', 'base', {
    defaults: { role: 'translator' }
  });

  // Apply template - inherits defaults from parent
  const message = await templates.apply('translator', {
    query: 'Translate "hello" to Spanish'
  });
} catch (error) {
  if (error.message?.includes('not found')) {
    console.error("Template error:", error.message);
  } else if (error.message?.includes('required parameter')) {
    console.error("Missing parameter:", error.message);
  } else if (error.message?.includes('validation failed')) {
    console.error("Validation error:", error.message);
  } else {
    throw error;
  }
}
```

## Complete Example

```javascript
import { createAICaptain } from 'ai.captain';

// Create instance with all features
const chain = await createAICaptain({
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

// Register base template
chain.templates.register('base', 'You are a {role}.\n{query}', {
  defaults: { role: 'helpful assistant' },
  schema: {
    role: { type: 'string' },
    query: { type: 'string', minLength: 1 }
  }
});

// Create specialized template
chain.templates.inherit('translator', 'base', {
  defaults: { role: 'professional translator' }
});

// Use template with inheritance
const message = await chain.templates.apply('translator', {
  query: 'Translate "hello" to Spanish'
});

// Send to model with caching
const result = await chain.session.prompt(message, {
  cache: { enabled: true }
});

console.log(result);

// Clean up
await chain.destroy();
```

## Migration Guide

### 1.0.0
- Added template inheritance with validation
- Added caching in compositions
- Added analytics tracking

### 0.1.0
- Initial release with core features

For more detailed information about specific components, please refer to the inline documentation in the source code.
