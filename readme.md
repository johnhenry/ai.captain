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
import { createWindowChain, TemplateSystem, CompositionBuilder } from 'window-chain';

// Initialize components
const chain = await createWindowChain();
const templates = new TemplateSystem(chain.session);  // Pass session to TemplateSystem
const composer = new CompositionBuilder(chain.session);  // Pass session to CompositionBuilder

// Register template
templates.register('translator',
  'You are a professional translator.\nTranslate "{text}" to {language}.',
  { text: '', language: '' }
);

// Create enhanced prompt function with caching
const enhancedPrompt = composer
  .pipe(async (input) => {
    // Apply template and get processed content
    const content = await templates.apply('translator', input);
    // Send to model using chain.session.prompt
    const result = await chain.session.prompt(content);
    return result.trim();
  })
  .build();

// Use the enhanced prompt
const translation = await enhancedPrompt({
  text: 'Hello world',
  language: 'Spanish'
});

console.log(translation); // Hola mundo
```

## Core Components

### Session

The `Session` class manages interactions with Window.ai:

```javascript
import { createWindowChain } from 'window-chain';

// Create a new chain
const chain = await createWindowChain();

// Basic prompt
const response = await chain.session.prompt("Hello!");

// Stream response
const stream = await chain.session.promptStreaming("Tell me a story");
const reader = stream.getReader();

try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(value);
  }
} finally {
  reader.releaseLock();
}
```

### Template System

Create and manage message templates with validation:

```javascript
import { createWindowChain } from 'window-chain';

// Initialize components
const chain = await createWindowChain();
const templates = new TemplateSystem(chain.session);

// Register a template
templates.register('assistant', 
  'You are a helpful assistant.\n{query}',
  { query: '' }
);

// Use the template
const message = await templates.apply('assistant', {
  query: 'Tell me about Alice who is 25 years old'
});

// Send to model
const response = await chain.session.prompt(message);
```

### Template Inheritance

Templates can inherit from other templates:

```javascript
import { createWindowChain } from 'window-chain';

// Initialize components
const chain = await createWindowChain();
const templates = new TemplateSystem(chain.session);

// Register base template
templates.register('base', 
  'You are a {role}.\n{query}',
  { role: '', query: '' }
);

// Register specialized template that inherits from base
templates.inherit('translator', 'base', {
  role: 'professional translator',
  query: 'Translate "{text}" to {language}.'
});

// Use the inherited template
const message = await templates.apply('translator', {
  text: 'Hello world',
  language: 'Spanish'
});

// Send to model
const translation = await chain.session.prompt(message);
console.log(translation);
```

### Distributed Caching

Efficient caching with composition:


```javascript
import { createWindowChain, CompositionBuilder } from 'window-chain';

const chain = await createWindowChain();
const composer = new CompositionBuilder(chain.session);

const cachedPrompt = composer
  .pipe(async (messages) => {
    const result = await chain.session.prompt(messages);
    return result.trim();
  })
  .build();

const response = await cachedPrompt("What is 2+2?");
console.log(response);
```

> [!ERROR]
> Uncaught NotSupportedError: The model attempted to output text in an untested language, and was prevented from doing so.

### Composition

Build complex chains of functionality:

```javascript
import { createWindowChain, CompositionBuilder } from 'window-chain';

const chain = await createWindowChain();
const composer = new CompositionBuilder(chain.session);

const enhancedPrompt = composer
  .pipe(async (input) => {
    const result = await chain.session.prompt(input);
    return result.trim();
  })
  .build();

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
