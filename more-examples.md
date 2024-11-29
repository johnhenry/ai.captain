# WindowChain Advanced Examples

This document provides detailed examples of using WindowChain's various features and capabilities.

## Basic Translation with Templates

The translation demo shows how to use message templates and handle both basic and retry-enabled prompts.

```javascript
// Create a message template for translation
const translateTemplate = createMessageTemplate(
  [
    ["system", "You are a helpful translator."],
    ["human", "Translate '{text}' to {language}."],
  ],
  ["text", "language"]
);

// Basic translation
const result = await model.prompt(
  translateTemplate({
    text: "Hello world",
    language: "Spanish",
  })
);

// Translation with retry capability
const robustPrompt = withRetry(prompt);
const result = await robustPrompt(
  model,
  translateTemplate({
    text: "Hello world",
    language: "Spanish",
  })
);
```

## Story Generation with Streaming

This example demonstrates how to use streaming for real-time text generation with start/stop capabilities.

```javascript
// Basic story generation
const story = await model.prompt(`Write a short story about ${topic}`);

// Streaming story generation with abort control
const abortController = new AbortController();
const stream = await model.promptStreaming(
  `Write a short story about ${topic}`,
  { signal: abortController.signal }
);

// Process the stream
for await (const chunk of stream) {
  // Handle each chunk of text as it arrives
  console.log(chunk);
}

// Stop generation if needed
abortController.abort();
```

## Sentiment Analysis with JSON Output

This example shows how to get structured JSON output from the model with sentiment analysis.

```javascript
// Setup system message for JSON output
const systemMessage = {
  role: "system",
  content: "You are an AI trained to analyze text sentiment and extract key points. Always respond with a JSON object containing 'sentiment' (string), 'confidence' (number between 0-1), and 'key_points' (array of strings)."
};

// Create user message with text to analyze
const userMessage = {
  role: "user",
  content: `Analyze this text: "${textToAnalyze}"`
};

// Get JSON response with lower temperature for consistency
const result = await model.prompt([systemMessage, userMessage], {
  temperature: 0.1
});

// Parse JSON from response
const jsonMatch = result.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  const jsonResponse = JSON.parse(jsonMatch[0]);
  // jsonResponse will have:
  // {
  //   sentiment: "positive" | "negative" | "neutral",
  //   confidence: 0.85,
  //   key_points: ["point 1", "point 2", ...]
  // }
}
```

## Error Handling and Progress Tracking

Example of proper error handling and progress tracking in WindowChain applications.

```javascript
// Initialize model with progress tracking
const model = await createModel({
  temperature: 0.7,
  onDownloadProgress: (e) => {
    const percent = Math.round((e.loaded / e.total) * 100);
    console.log(`Downloaded ${percent}%`);
  },
});

// Error handling in prompts
try {
  const result = await model.prompt("Your prompt here");
  console.log(result);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Operation was cancelled");
  } else {
    console.error("Error:", error.message);
  }
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
