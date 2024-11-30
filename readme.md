# Window Chain

A powerful, modular library for integrating with Window.ai, featuring advanced template processing, caching, composition, and monitoring capabilities.

## Features

- **Session Management**: Robust session handling with Window.ai
- **Template System**: Advanced template processing with inheritance and validation
- **Distributed Caching**: Efficient caching with compression support
- **Function Composition**: Flexible composition patterns for advanced workflows
- **Performance Monitoring**: Built-in analytics and performance tracking
- **Fallback System**: Automatic retries and fallback handling

## Installation

```bash
npm install window-chain
```

## Quick Start

```javascript
import { Session, TemplateSystem, DistributedCache, CompositionBuilder } from "window-chain";

// Initialize session
const session = await Session.create({ temperature: 0.7, topK: 4 });

// Initialize components
const templates = new TemplateSystem();
const cache = new DistributedCache({ compression: true });
const composer = new CompositionBuilder(session);

// Create template
const translator = templates.retister(
  [
    ["system", "You are a helpful translator."],
    ["user", 'Translate "{text}" to {language}.']
  ],
  ["text", "language"]
);

// Create enhanced prompt function with caching
const translate = composer
  .withCache(cache)
  .build(async (messages) => await session.prompt(messages));

// Use the template
const result = await translate(
  translator({
    text: "Hello, world!",
    language: "Spanish"
  })
);
```

## Core Components

### Session

The `Session` class manages interactions with Window.ai:

```javascript
import { Session } from "window-chain";

// Create a new session
const session = await Session.create({
  temperature: 0.7,
  onDownloadProgress: (e) => console.log(`Downloaded: ${e.loaded}/${e.total}`)
});

// Basic prompt
const response = await session.prompt("Hello!");

// Stream responses
for await (const chunk of await session.streamPrompt("Tell me a story")) {
  console.log(chunk.content);
}

// Check token usage
console.log(`Tokens used: ${session.tokensSoFar}`);
console.log(`Tokens remaining: ${session.tokensLeft}`);
```

### Template System

Create and manage message templates with validation:

```javascript
import { TemplateSystem, TemplateValidator } from "window-chain";

// Create template system
const templateSystem = new TemplateSystem();

// Create validator for template variables
const validator = new TemplateValidator({
  name: "string",
  age: "number"
});

// Create a template with validation
const template = templateSystem.create(
  [
    ["system", "You are a helpful assistant."],
    ["user", "Tell me about {name} who is {age} years old"]
  ],
  ["name", "age"]
);

// Use the template
const messages = template({
  name: "Alice",
  age: 25
});
```

### Template Inheritance

Create specialized templates that build upon base templates:

```javascript
const baseTemplate = [
  ["system", "You are a {role}."],
  ["user", "{query}"]
];

// Create specialized template
const translatorTemplate = templateSystem.inherit(
  baseTemplate,
  {
    role: "professional translator",
    query: 'Translate "{text}" to {language}.'
  }
);
```

### Distributed Cache

Efficient caching with compression:

```javascript
import { DistributedCache, Session } from "window-chain";

const cache = new DistributedCache();
const session = new Session();

const response = await cache.withCache(session.prompt.bind(session))(
  "What is 2+2?"
);
```

### Composition

Build complex chains of functionality:

```javascript
import {
  CompositionBuilder,
  Session,
  PerformanceAnalytics,
} from "window-chain";

const session = new Session();
const analytics = new PerformanceAnalytics();
const composition = new CompositionBuilder();

const enhancedPrompt = composition
  .withAnalytics(analytics)
  .withRetry()
  .build(session.prompt.bind(session));

const result = await enhancedPrompt("Hello!");
```

## Advanced Usage

See our [Advanced Guide](guides/advanced.md) for detailed information about:

- Template inheritance and validation
- Distributed caching strategies
- Custom composition patterns
- Performance monitoring
- Error handling and retries

## Demo

Check out our [demo.html](demo.html) for a complete example of:

- Text translation with retry capability
- Story generation with streaming
- Sentiment analysis with JSON output

## API Reference

Detailed API documentation is available in our [API Reference](guides/api.md).

## Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
