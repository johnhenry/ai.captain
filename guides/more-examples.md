# WindowChain Advanced Examples

This document provides detailed examples of using WindowChain's various features and capabilities.

## Translation with Templates and Streaming

```javascript
import { createSession, TemplateSystem } from "window-chain";

// Initialize components
const session = await createSession({ temperature: 0.7 });
const templates = new TemplateSystem();

// Create translation template
const translateTemplate = templates.register('translator',
  'You are a professional translator.\nTranslate "{text}" to {language}.',
  { text: '', language: '' }
);

// Basic translation
const result = await session.prompt(
  translateTemplate({
    text: "Hello world",
    language: "Spanish"
  })
);

// Streaming translation
const stream = await session.promptStreaming(
  translateTemplate({
    text: "Hello world",
    language: "Spanish"
  })
);

for await (const chunk of stream) {
  console.log(chunk.content);
}
```

## Advanced Composition with Caching and Analytics

```javascript
import { createSession, TemplateSystem, DistributedCache, CompositionBuilder, PerformanceAnalytics } from "window-chain";

// Initialize components
const session = await createSession();
const templates = new TemplateSystem();
const cache = new DistributedCache({ compression: true });
const analytics = new PerformanceAnalytics();

// Create composition chain
const composer = new CompositionBuilder(session)
  .pipe(async (messages) => {
    const result = await session.prompt(messages);
    return JSON.parse(result);
  })
  .parallel([
    async (data) => ({ sentiment: data.sentiment }),
    async (data) => ({ confidence: data.confidence })
  ])
  .build();

// Create template
const analyzeTemplate = templates.register('analyzer',
  'You are an AI trained to analyze text sentiment and extract key points. Respond with a JSON object containing "sentiment" (string), "confidence" (number between 0-1), and "key_points" (array of strings).\nAnalyze this text: {text}',
  { text: '' }
);

// Use the composed function
const result = await composer(
  analyzeTemplate({
    text: "This product is amazing! The quality is outstanding and the price is reasonable."
  })
);

// Check analytics
console.log(`Average response time: ${analytics.getAverageResponseTime()}ms`);
console.log(`Cache hit rate: ${analytics.getCacheHitRate()}%`);
```

## Model Capabilities and Fallback Handling

```javascript
import { createSession, Capabilities, FallbackSystem } from "window-chain";

// Initialize session and components
const session = await createSession();
const capabilities = await Capabilities.get();
const fallback = new FallbackSystem();

// Check if model is ready
if (capabilities.isReady()) {
  console.log("Model is ready to use");
  console.log("Default temperature:", capabilities.defaultTemperature);
} else if (capabilities.needsDownload()) {
  console.log("Model needs to be downloaded first");
}

// Get available models
const models = await capabilities.getAvailableModels();
console.log("Available models:", models);

// Set preferred model with fallback
try {
  await capabilities.setModel("gpt-4");
} catch (error) {
  console.log("Falling back to alternative model");
  await capabilities.setModel("gpt-3.5-turbo");
}

// Get current model
const currentModel = await capabilities.getCurrentModel();
console.log("Using model:", currentModel);

// Use fallback system for robust prompting
const robustPrompt = fallback.createRobustPrompt(
  session.prompt.bind(session),
  {
    maxRetries: 3,
    retryDelay: 1000
  }
);

try {
  const result = await robustPrompt("What is the meaning of life?");
  console.log(result);
} catch (error) {
  console.error("All retries failed:", error);
}
```

## Error Handling and Progress Tracking

```javascript
import { createSession, TemplateSystem } from "window-chain";

// Initialize with progress tracking
const session = await createSession({
  onDownloadProgress: (event) => {
    const progress = (event.loaded / event.total) * 100;
    console.log(`Download progress: ${progress.toFixed(1)}%`);
  }
});

try {
  // Monitor token usage
  console.log(`Starting tokens: ${session.tokensLeft}`);
  
  const response = await session.prompt("Generate a long response...");
  
  console.log(`Tokens used: ${session.tokensSoFar}`);
  console.log(`Tokens remaining: ${session.tokensLeft}`);
} catch (error) {
  if (error.message.includes("token limit")) {
    console.error("Exceeded token limit");
  } else {
    console.error("Unexpected error:", error);
  }
} finally {
  // Clean up
  await session.destroy();
}
```

## Best Practices

1. **Temperature Control**
   - Use lower temperature (0.1) for structured outputs like JSON
   - Use higher temperature (0.7-1.0) for creative tasks like story generation

2. **Streaming**
   - Always implement proper cleanup in finally blocks
   - Use AbortController for reliable stream stopping
   - Handle partial chunks appropriately

3. **Error Handling**
   - Implement specific handling for AbortError
   - Provide meaningful error messages to users
   - Clean up resources in finally blocks

4. **JSON Responses**
   - Use system messages to enforce JSON structure
   - Implement proper JSON extraction and parsing
   - Handle parsing errors gracefully

## Common Patterns

### Retry Pattern
```javascript
const robustPrompt = withRetry(prompt, {
  maxRetries: 3,
  delay: 1000
});
```

### Progress Tracking Pattern
```javascript
const model = await createModel({
  onDownloadProgress: (e) => {
    const percent = Math.round((e.loaded / e.total) * 100);
    updateProgressBar(percent);
  }
});
```

### Stream Processing Pattern
```javascript
let currentStream = null;
let abortController = null;

try {
  abortController = new AbortController();
  currentStream = await model.promptStreaming(prompt, {
    signal: abortController.signal
  });
  
  for await (const chunk of currentStream) {
    processChunk(chunk);
  }
} finally {
  currentStream = null;
  abortController = null;
}
```

## Advanced Configuration

### Model Configuration
```javascript
const model = await createModel({
  temperature: 0.7,
  systemPrompt: "Global system prompt here",
  format: "json", // for JSON outputs
});
```

### Template Configuration
```javascript
const template = createMessageTemplate(
  [
    ["system", "System message here"],
    ["human", "User message with {variable}"],
  ],
  ["variable"]
);
```

These examples demonstrate the key features and patterns available in WindowChain. For more detailed information about specific features, refer to the main documentation.
