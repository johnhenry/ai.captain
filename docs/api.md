# Window Chain API Reference

## Core Classes

### Session

The main class for interacting with Window.ai's language models.

```typescript
class Session {
  static async create(options: {
    temperature?: number;
    onDownloadProgress?: (event: ProgressEvent) => void;
  }): Promise<Session>;

  // Properties
  readonly tokensSoFar: number;
  readonly maxTokens: number;
  readonly tokensLeft: number;

  async prompt(input: string | Message[]): Promise<string>;
  async streamPrompt(input: string | Message[]): AsyncIterator<{ content: string }>;
  async initialize(): Promise<void>;
  async destroy(): Promise<void>;
}
```

### Capabilities

Manages model capabilities and configurations.

```typescript
class Capabilities {
  constructor(session: Session);

  async initialize(): Promise<void>;
  async getAvailableModels(): Promise<string[]>;
  async getCurrentModel(): Promise<string>;
  async setModel(modelName: string): Promise<void>;
}
```

## Template System

### TemplateSystem

Creates and manages message templates with variable substitution.

```typescript
class TemplateSystem {
  create(
    template: (string | [string, string])[],
    variables: string[]
  ): (values: Record<string, any>) => Message[];

  validate(template: any): boolean;
  inherit(baseTemplate: string, overrides: any): Template;
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

Builds chains of functions with various capabilities.

```typescript
class CompositionBuilder {
  withCache(cache: DistributedCache): this;
  withAnalytics(analytics: PerformanceAnalytics): this;
  withRetry(options?: RetryOptions): this;
  withFallback(fallback: FallbackSystem): this;
  withValidator(validator: TemplateValidator): this;
  
  build<T>(
    fn: (...args: any[]) => Promise<T>
  ): (...args: any[]) => Promise<T>;
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
const result = await chain.session.prompt(template({ name: 'World' }));

// Monitor performance
chain.analytics.record('responseTime', 150);

// Handle fallbacks
const response = await chain.fallback.execute(async () => {
  return await chain.session.prompt('Complex query');
});

// Clean up
await chain.destroy();
```

## Migration Guide

If you're upgrading from an earlier version, please note these changes:

### 0.1.0
- Initial release with core features

For more detailed information about specific components, please refer to the inline documentation in the source code.
