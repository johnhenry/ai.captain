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

The main class for interacting with Window.ai's language models.

```typescript
class WindowChain {
  constructor(options?: Object);

  prompt(input: string | Message[]): Promise<string>;
  promptStreaming(input: string | Message[]): AsyncIterator<string>;
}
```

### Capabilities

Enhanced capabilities wrapper for Window.ai.

```typescript
class Capabilities {
  constructor(rawCapabilities: Object);

  // Properties
  available: string;
  defaultTopK: number;
  maxTopK: number;
  defaultTemperature: number;

  /**
   * Get current Window.ai capabilities
   */
  static get(): Promise<Capabilities>;

  /**
   * Check if the model is ready to use
   */
  isReady(): boolean;

  /**
   * Check if model needs to be downloaded
   */
  needsDownload(): boolean;
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
  ): (values: Record<string, any>) => string;

  /**
   * Create a new template that inherits from a parent template
   */
  inherit(
    name: string,
    parentName: string,
    defaults?: Record<string, any>
  ): void;

  /**
   * Apply a template with given variables
   */
  async apply(
    name: string,
    variables?: Record<string, any>
  ): Promise<string>;
}
```

### TemplateValidator

Validates template inputs against defined schemas.

```typescript
class TemplateValidator {
  constructor(schema: {
    [key: string]: 'string' | 'number' | 'boolean' | string[];
  });

  validate(input: any): boolean;
  getErrors(): string[];
}
```

## Caching System

### DistributedCache

Provides distributed caching capabilities with compression.

```typescript
class DistributedCache {
  constructor(options?: {
    namespace?: string;
    ttl?: number;
    compression?: boolean;
  });

  async get(key: string): Promise<any>;
  async set(key: string, value: any): Promise<void>;
  async delete(key: string): Promise<void>;
  async clear(): Promise<void>;
  
  withCache<T>(fn: (...args: any[]) => Promise<T>): (...args: any[]) => Promise<T>;
}
```

### CacheCompression

Handles data compression for the cache system.

```typescript
class CacheCompression {
  static async compress(data: any): Promise<Uint8Array>;
  static async decompress(data: Uint8Array): Promise<any>;
}
```

## Composition System

### CompositionBuilder

Advanced composition pattern builder for chaining operations.

```typescript
class CompositionBuilder {
  constructor(session: Session);

  /**
   * Add a processing step
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
   */
  build(): Function;
}
```

### CompositionChains

Pre-built composition patterns for common use cases.

```typescript
class CompositionChains {
  static createTranslationChain(
    session: Session,
    options?: TranslationOptions
  ): (text: string, language: string) => Promise<string>;

  static createStreamingChain(
    session: Session,
    options?: StreamingOptions
  ): (prompt: string) => AsyncIterator<{ content: string }>;
}
```

## Monitoring System

### PerformanceAnalytics

Tracks and analyzes performance metrics.

```typescript
class PerformanceAnalytics {
  recordMetric(name: string, value: number): void;
  getMetrics(name: string): MetricsSummary;
  clearMetrics(): void;
  
  withTracking<T>(
    name: string,
    fn: (...args: any[]) => Promise<T>
  ): (...args: any[]) => Promise<T>;
}
```

### FallbackSystem

Manages fallback strategies and retries.

```typescript
class FallbackSystem {
  constructor(session: Session, options?: FallbackOptions);

  addFallback(name: string, handler: FallbackHandler): void;
  removeFallback(name: string): void;
  
  async execute<T>(
    fn: (...args: any[]) => Promise<T>
  ): Promise<T>;
}
```

## Types

### Common Types

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Template {
  messages: (string | [string, string])[];
  variables: string[];
}

interface MetricsSummary {
  count: number;
  mean: number;
  min: number;
  max: number;
  p95: number;
}

interface RetryOptions {
  maxAttempts?: number;
  backoff?: 'linear' | 'exponential';
  initialDelay?: number;
}

interface FallbackOptions {
  timeout?: number;
  maxAttempts?: number;
}

type FallbackHandler = (error: Error, attempt: number) => Promise<any>;
```

## Error Handling

The library uses custom error classes for specific error cases:

```typescript
class WindowChainError extends Error {}
class ValidationError extends WindowChainError {}
class CacheError extends WindowChainError {}
class ModelError extends WindowChainError {}
class TimeoutError extends WindowChainError {}
```

## Events

The library emits events for various operations:

```typescript
interface Events {
  'model.loaded': (modelName: string) => void;
  'prompt.start': (input: string | Message[]) => void;
  'prompt.end': (result: string) => void;
  'error': (error: WindowChainError) => void;
  'cache.hit': (key: string) => void;
  'cache.miss': (key: string) => void;
  'fallback.triggered': (error: Error, attempt: number) => void;
}
```

## Complete Example

```javascript
import { createWindowChain } from 'window-chain';

// Create instance with all features
const chain = await createWindowChain({
  session: {
    temperature: 0.7,
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
const template = chain.templates.create('Hello, {name}!');
const result = await chain.prompt(template({ name: 'World' }));

// Monitor performance
chain.analytics.record('responseTime', 150);

// Handle fallbacks
const response = await chain.fallback.execute(async () => {
  return await chain.prompt('Complex query');
});

// Clean up
await chain.destroy();
```

## Migration Guide

If you're upgrading from an earlier version, please note these changes:

### 0.1.0
- Initial release with core features

For more detailed information about specific components, please refer to the inline documentation in the source code.
