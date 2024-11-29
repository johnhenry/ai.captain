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
import {
  Session,
  TemplateSystem,
  CompositionBuilder,
  DistributedCache,
} from "window-chain";

// Initialize components
const session = await Session.create({ temperature: 0.7 });
const templates = new TemplateSystem(session);
const cache = new DistributedCache();
const composer = new CompositionBuilder(session);

// Create template
const translator = templates.create(
  [
    ["system", "You are a helpful translator."],
    ["human", 'Translate "{text}" to {language}.'],
  ],
  ["text", "language"]
);

// Create enhanced prompt function
const translate = composer.withCache(cache).build(session.prompt.bind(session));

// Use the template
const result = await translate(
  translator({
    text: "Hello, world!",
    language: "Spanish",
  })
);
```

## Core Components

### Session

The `Session` class manages interactions with Window.ai:

```javascript
import { Session } from "window-chain";

const session = new Session({
  temperature: 0.7,
  onDownloadProgress: (e) => console.log(`Downloaded: ${e.loaded}/${e.total}`),
});

const response = await session.prompt("Hello!");
```

### Template System

Create and manage message templates with validation:

```javascript
import { TemplateSystem, TemplateValidator } from "window-chain";

const templateSystem = new TemplateSystem();
const validator = new TemplateValidator({
  name: "string",
  age: "number",
});

const template = templateSystem.create(
  [["human", "Tell me about {name} who is {age} years old"]],
  ["name", "age"]
);
```

### Template Inheritance

The template system supports inheritance through a dedicated `inherit` method, allowing you to create specialized templates that build upon base templates. Here's how it works:

1. **Base Template**: Define a base template with placeholders for variables that can be overridden:

```javascript
templates.register("base", "system: {role}\nhuman: {query}");
```

2. **Derived Template**: Create a specialized template that inherits from the base, providing default values for some variables:

```javascript
templates.inherit("translator", "base", { role: "You are a translator" });
```

3. **Using the Template**: When applying the derived template, you only need to provide the remaining variables:

```javascript
const result = await templates.apply("translator", {
  query: 'Translate "hello"',
});
// Results in: "system: You are a translator\nhuman: Translate "hello""
```

The inheritance system allows you to:

- Create reusable base templates with common structure
- Specialize templates by providing default values
- Override defaults when applying the template
- Maintain consistent prompt structure across similar use cases

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
