# Window Chain

Window Chain is a powerful utility library that bridges Window.ai's language model capabilities with LangChain-style patterns and abstractions. It provides a comprehensive set of tools for building robust AI-powered applications using Window.ai's in-browser language models.

## Features

- 🔄 **Advanced Template Processing**: Sophisticated template system with validation and formatting
- 📊 **Progress Tracking**: Monitor long-running operations
- 🎯 **Token Management**: Accurate token counting and context window management
- 💾 **Caching**: Multiple caching strategies with persistence options
- 🔁 **Composition Patterns**: Rich set of functional composition utilities
- 🚰 **Streaming**: Efficient streaming of model responses
- 🛠️ **Error Handling**: Robust error handling
- 🔀 **Parallel Processing**: Execute multiple operations concurrently
- 🌳 **Branching Logic**: Conditional execution paths
- 🔁 **Retry Mechanisms**: Automatic retry with configurable backoff

## Installation

```bash
npm install window-chain
```

## Quick Start

```javascript
import { createModel, prompt, createTemplate } from "window-chain";

// Create a model instance
const model = await createModel({
  temperature: 0.7,
});

// Simple prompt
const response = await prompt(model, "What is the capital of France?");
console.log(response.content);

// Using templates
const template = createTemplate("Tell me about {topic}", ["topic"]);
const result = await prompt(
  model,
  template({ topic: "artificial intelligence" })
);
```

## Advanced Usage

### Template Processing

```javascript
import { createAdvancedTemplate } from "window-chain";

const template = createAdvancedTemplate("Email to: {email} about {subject}", {
  email: { type: "email", required: true },
  subject: { type: "string", format: "lowercase" },
});

const result = template({
  email: "user@example.com",
  subject: "MEETING REQUEST",
}); // "Email to: user@example.com about meeting request"
```

### Progress Tracking

```javascript
import { createProgressTracker, enhancedPrompt } from "window-chain";

const tracker = createProgressTracker();
tracker.onProgress(({ progress, total }) => {
  console.log(`Progress: ${progress}/${total}`);
});

const result = await enhancedPrompt(model, input, { progressTracker: tracker });
```

### Caching

```javascript
import { createEnhancedCache } from "window-chain";

const cache = createEnhancedCache({
  ttl: 3600000, // 1 hour
  maxSize: 1000,
  strategy: "lru",
  persistent: true,
  namespace: "my-app",
});

const result = await enhancedPrompt(model, input, {
  cache,
  cacheKey: "unique-key",
});
```

### Composition

```javascript
import { createCompositionBuilder } from "window-chain";

const pipeline = createCompositionBuilder()
  .pipe(preprocessInput)
  .branch(shouldProcessFurther, processMore, skipProcessing)
  .retry({ maxRetries: 3 })
  .timeout(5000)
  .cache({ ttl: 3600000 })
  .build();

const result = await pipeline(input);
```

### Streaming

```javascript
import { streamPrompt } from "window-chain";

const stream = await streamPrompt(model, "Generate a long story");
for await (const chunk of stream) {
  console.log(chunk.content);
}
```

## API Reference

### Core Functions

- `createModel(config)`: Create a new Window.ai model instance
- `prompt(model, input, options)`: Execute a prompt
- `streamPrompt(model, input, options)`: Stream model responses
- `enhancedPrompt(model, input, options)`: Advanced prompting with features

### Templates

- `createTemplate(template, variables)`: Simple template processing
- `createAdvancedTemplate(template, schema)`: Advanced template with validation
- `createMessageTemplate(messages, variables)`: Chat message templates

### Utilities

- `createProgressTracker()`: Track operation progress
- `createTokenCounter(maxTokens)`: Manage token usage
- `createEnhancedTokenCounter(maxTokens)`: Advanced token estimation
- `createCache(options)`: Simple caching
- `createEnhancedCache(options)`: Advanced caching with strategies

### Composition

- `pipe(...fns)`: Function composition
- `parallel(fns)`: Parallel execution
- `branch(condition, ifTrue, ifFalse)`: Conditional branching
- `retry(fn, options)`: Retry mechanism
- `catchError(fn, handler)`: Error handling
- `createCompositionBuilder()`: Advanced composition patterns

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
