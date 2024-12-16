# AI Captain

A powerful, modular library for integrating with window.ai, featuring advanced template processing, caching, composition, and monitoring capabilities.

## Features

- **Session Management**: Robust session handling with window.ai
- **Template System**: Advanced template processing with inheritance and validation
- **Distributed Caching**: Efficient caching with compression support
- **Function Composition**: Flexible composition patterns for advanced workflows
- **Performance Monitoring**: Built-in analytics and performance tracking
- **Fallback System**: Automatic retries and fallback handling

## Installation

```bash
npm install ai.captain
```

## Quick Start

```javascript
import { createAICaptain, TemplateSystem, CompositionBuilder } from 'ai.captain';

// Initialize components
const chain = await createAICaptain();
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

The `Session` class manages interactions with window.ai:

```javascript
import { createAICaptain } from 'ai.captain';

// Create a new chain
const chain = await createAICaptain();

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
import { createAICaptain } from 'ai.captain';

// Initialize components
const chain = await createAICaptain();
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
import { createAICaptain } from 'ai.captain';

// Initialize components
const chain = await createAICaptain();
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
import { createAICaptain, CompositionBuilder } from 'ai.captain';

const chain = await createAICaptain();
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
import { createAICaptain, CompositionBuilder } from 'ai.captain';

const chain = await createAICaptain();
const composer = new CompositionBuilder(chain.session);

const enhancedPrompt = composer
  .pipe(async (input) => {
    const result = await chain.session.prompt(input);
    return result.trim();
  })
  .build();

const result = await enhancedPrompt("Hello!");
console.log(result);
```

## Advanced Usage

See our [Advanced Guide](advanced.md) for detailed information about:

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

### Core Functions

#### createAICaptain

Create a new AI Captain instance with all features enabled.

```typescript
function createAICaptain(options?: {
  session?: {
    temperature?: number;
  };
}): Promise<AICaptain>;
```

### Core Classes

#### AICaptain

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

#### Session

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

#### TemplateSystem

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

#### CompositionBuilder

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
   * @returns An async function that executes the composition
   */
  build(): (input: any) => Promise<any>;
}
```

### Error Handling

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

### Best Practices

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
    console.error("Failed to parse JSON response:", error);
    return null;
  }
  throw error; // Re-throw other errors
}
```

3. Always clean up resources:
```typescript
const chain = await createAICaptain();
try {
  // Use chain...
} finally {
  await chain.session.destroy();
}
```

## Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Translation with Templates and Streaming

```javascript
import { createAICaptain, TemplateSystem } from "ai.captain";

// Initialize components
const chain = await createAICaptain();
const templates = new TemplateSystem(chain.session);

// Register translation template
templates.register('translator',
  'You are a professional translator.\nTranslate "{text}" to {language}.',
  { text: '', language: '' }
);

// Basic translation
const message = await templates.apply('translator', {
  text: "Hello world",
  language: "Spanish"
});
const result = await chain.session.prompt(message);
console.log(result);

// Streaming translation
const content = await templates.apply('translator', {
  text: "Hello world",
  language: "Spanish"
});
const stream = await chain.session.promptStreaming(content);
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

### Advanced Composition with Error Handling

```javascript
import { createAICaptain, TemplateSystem, CompositionBuilder } from "ai.captain";

// Initialize components
const chain = await createAICaptain();
const templates = new TemplateSystem(chain.session);
const composer = new CompositionBuilder(chain.session);

// Register analysis template
templates.register('analyzer',
  'You are an AI trained to analyze text sentiment and extract key points.\nAnalyze this text: {text}\nRespond with a JSON object containing "sentiment" (string), "confidence" (number between 0-1), and "key_points" (array of strings).',
  { text: '' }
);

// Create composition chain with error handling
const analyzeText = composer
  .pipe(async (input) => {
    try {
      // Apply template
      const content = await templates.apply('analyzer', { text: input });
      
      // Get model response
      const result = await chain.session.prompt(content);
      
      // Parse JSON response
      return JSON.parse(result.trim());
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Failed to parse JSON response:', error);
        return null;
      }
      if (error.message?.includes('untested language')) {
        console.error('Language not supported:', error);
        return null;
      }
      throw error; // Re-throw other errors
    }
  })
  .pipe(async (data) => {
    if (!data) return 'Analysis failed';
    return `Sentiment: ${data.sentiment} (${data.confidence * 100}% confident)\nKey points:\n${data.key_points.join('\n')}`;
  })
  .build();

// Use the composed function
try {
  const result = await analyzeText(
    "This product is amazing! The quality is outstanding and the price is reasonable."
  );
  console.log(result);
} catch (error) {
  console.error('Analysis error:', error);
}
```

### Streaming with Progress Updates

```javascript
import { createAICaptain } from "ai.captain";

// Initialize chain
const chain = await createAICaptain();

// Function to stream with progress
async function streamWithProgress(prompt) {
  const stream = await chain.session.promptStreaming(prompt);
  const reader = stream.getReader();
  let response = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      response += value;
      // Update progress (e.g., word count)
      const words = response.split(/\s+/).length;
      console.log(`Progress: ${words} words generated`);
    }
    return response;
  } finally {
    reader.releaseLock();
  }
}

// Example usage
try {
  console.log('Generating story...');
  const story = await streamWithProgress(
    "Write a short story about a magical forest"
  );
  console.log('\nFinal story:', story);
} catch (error) {
  console.error('Error:', error);
}
