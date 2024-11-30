# WindowChain Advanced Examples

This document provides detailed examples of using WindowChain's various features and capabilities.

## Translation with Templates and Streaming

```javascript
import { createWindowChain, TemplateSystem } from "window-chain";

// Initialize components
const chain = await createWindowChain();
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

## Advanced Composition with Error Handling

```javascript
import { createWindowChain, TemplateSystem, CompositionBuilder } from "window-chain";

// Initialize components
const chain = await createWindowChain();
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

> [!ERROR] VM6011:29 Language not supported: NotSupportedError: The model attempted to output text in an untested language, and was prevented from doing so.

> [!ERROR] Analysis error: TypeError: args is not iterable (cannot read property null)

## Template Inheritance Example

```javascript
import { createWindowChain, TemplateSystem } from "window-chain";

// Initialize components
const chain = await createWindowChain();
const templates = new TemplateSystem(chain.session);

// Register base template
templates.register('base',
  'You are a {role}.\n{query}',
  { role: '', query: '' }
);

// Create specialized templates
templates.inherit('translator', 'base', {
  role: 'professional translator',
  query: 'Translate "{text}" to {language}.'
});

templates.inherit('summarizer', 'base', {
  role: 'expert summarizer',
  query: 'Summarize the following text in {style} style:\n{text}'
});

// Use templates
async function translate(text, language) {
  const content = await templates.apply('translator', { text, language });
  return chain.session.prompt(content);
}

async function summarize(text, style = 'concise') {
  const content = await templates.apply('summarizer', { text, style });
  return chain.session.prompt(content);
}

// Example usage
try {
  const translation = await translate("Hello world", "Spanish");
  console.log('Translation:', translation);

  const summary = await summarize(
    "Long article text here...",
    "bullet-points"
  );
  console.log('Summary:', summary);
} catch (error) {
  console.error('Error:', error);
}
```

## Streaming with Progress Updates

```javascript
import { createWindowChain } from "window-chain";

// Initialize chain
const chain = await createWindowChain();

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
```

## Best Practices

1. Always initialize components with the session:
```javascript
const chain = await createWindowChain();
const templates = new TemplateSystem(chain.session);
const composer = new CompositionBuilder(chain.session);
```

2. Use template defaults to document required fields:
```javascript
templates.register('template',
  'Process this {input} using {method}.',
  { input: '', method: 'default' }  // Empty string indicates required
);
```

3. Always handle potential errors:
```javascript
try {
  const result = await chain.session.prompt(input);
  console.log(result);
} catch (error) {
  if (error instanceof NotSupportedError) {
    console.error('Language not supported:', error);
  } else {
    console.error('Error:', error);
  }
}
```

4. Clean up resources properly:
```javascript
const stream = await chain.session.promptStreaming(prompt);
const reader = stream.getReader();
try {
  // Use the stream
} finally {
  reader.releaseLock();
  await chain.destroy();  // When done with the chain
}
```
