// Advanced template processing for dynamic prompt generation with validation and formatting
function createAdvancedTemplate(template, schema = {}) {
  // Built-in validators for common data types and formats
  const validators = {
    string: (value) => typeof value === "string",
    number: (value) => typeof value === "number",
    boolean: (value) => typeof value === "boolean",
    array: (value) => Array.isArray(value),
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    url: (value) => /^https?:\/\/.*/.test(value),
  };

  // Built-in formatters for data transformation
  const formatters = {
    lowercase: (value) => value.toLowerCase(),
    uppercase: (value) => value.toUpperCase(),
    trim: (value) => value.trim(),
    number: (value) => Number(value),
    json: (value) => JSON.stringify(value),
    date: (value) => new Date(value).toISOString(),
  };

  // Returns a function that processes values according to schema and applies them to template
  return (values) => {
    const processed = {};

    for (const [key, config] of Object.entries(schema)) {
      let value = values[key];

      // Handle default values and required fields
      if (value === undefined) {
        if (config.default !== undefined) {
          value = config.default;
        } else if (config.required !== false) {
          throw new Error(`Missing required value for ${key}`);
        }
      }

      // Validate value against schema
      if (value !== undefined) {
        if (config.type && !validators[config.type](value)) {
          throw new Error(`Invalid type for ${key}: expected ${config.type}`);
        }
        if (config.validate && !config.validate(value)) {
          throw new Error(`Validation failed for ${key}`);
        }
      }

      // Apply formatting if specified
      if (value !== undefined && config.format) {
        const formatter =
          typeof config.format === "function"
            ? config.format
            : formatters[config.format];
        if (formatter) {
          value = formatter(value);
        }
      }

      processed[key] = value;
    }

    // Replace template placeholders with processed values
    return template.replace(/\{([^}]+)\}/g, (_, key) => {
      return processed[key] === undefined ? `{${key}}` : processed[key];
    });
  };
}

// Progress tracking for long-running operations
function createProgressTracker() {
  const listeners = new Set();
  let progress = 0;
  let total = 0;

  return {
    // Register callback for progress updates
    onProgress(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    // Update progress and notify listeners
    update(current, newTotal = total) {
      progress = current;
      total = newTotal;
      listeners.forEach((listener) => listener({ progress, total }));
    },
    // Get current progress state
    get progress() {
      return { progress, total };
    },
  };
}

// // Token counting and management for LLM context windows
// function createTokenCounter(maxTokens = 4096) {
//   let usedTokens = 0;

//   // Simple token estimation - can be replaced with more accurate tokenizer
//   const estimateTokens = (text) => Math.ceil(text.length / 4);

//   return {
//     // Track tokens used by text
//     track(text) {
//       const tokens = estimateTokens(text);
//       usedTokens += tokens;
//       return tokens;
//     },
//     // Reset token count
//     reset() {
//       usedTokens = 0;
//     },
//     // Get remaining tokens
//     get remaining() {
//       return maxTokens - usedTokens;
//     },
//     // Get used tokens
//     get used() {
//       return usedTokens;
//     },
//     // Check if adding text would exceed token limit
//     wouldExceedLimit(text) {
//       return usedTokens + estimateTokens(text) > maxTokens;
//     },
//   };
// }

// Simple caching mechanism for LLM responses
function createCache(options = {}) {
  const cache = new Map();
  const ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
  const maxSize = options.maxSize || 100;

  return {
    // Get cached value if not expired
    async get(key) {
      const item = cache.get(key);
      if (!item) return undefined;
      if (Date.now() > item.expires) {
        cache.delete(key);
        return undefined;
      }
      return item.value;
    },
    // Set cache value with TTL
    async set(key, value) {
      if (cache.size >= maxSize) {
        // Remove oldest entry when cache is full
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, {
        value,
        expires: Date.now() + ttl,
      });
    },
    // Clear all cached values
    clear() {
      cache.clear();
    },
  };
}

// Enhanced caching with distributed support and compression
function createAdvancedCache(options = {}) {
  const {
    maxSize = 1000,
    ttl = 3600000,
    compression = true,
    distributed = false
  } = options;

  const cache = new Map();
  const metadata = new Map();
  
  const compress = (data) => {
    if (!compression) return data;
    return typeof data === 'string' 
      ? btoa(encodeURIComponent(data))
      : btoa(encodeURIComponent(JSON.stringify(data)));
  };

  const decompress = (data) => {
    if (!compression) return data;
    try {
      const decoded = decodeURIComponent(atob(data));
      return decoded.startsWith('{') ? JSON.parse(decoded) : decoded;
    } catch (e) {
      return data;
    }
  };

  const channel = distributed ? new BroadcastChannel('window-chain-cache') : null;
  
  if (channel) {
    channel.onmessage = (event) => {
      const { type, key, value, timestamp } = event.data;
      if (type === 'set') {
        const currentTimestamp = metadata.get(key)?.timestamp || 0;
        if (timestamp > currentTimestamp) {
          cache.set(key, value);
          metadata.set(key, { timestamp });
        }
      }
    };
  }

  return {
    set: (key, value) => {
      const timestamp = Date.now();
      const compressed = compress(value);
      
      cache.set(key, compressed);
      metadata.set(key, { timestamp });

      if (channel) {
        channel.postMessage({ type: 'set', key, value: compressed, timestamp });
      }

      if (cache.size > maxSize) {
        const oldestKey = Array.from(metadata.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
        cache.delete(oldestKey);
        metadata.delete(oldestKey);
      }
    },

    get: (key) => {
      const data = cache.get(key);
      if (!data) return null;

      const meta = metadata.get(key);
      if (Date.now() - meta.timestamp > ttl) {
        cache.delete(key);
        metadata.delete(key);
        return null;
      }

      return decompress(data);
    },

    clear: () => {
      cache.clear();
      metadata.clear();
    },
    
    size: () => cache.size
  };
}

// Parallel execution of multiple functions
function parallel(fns) {
  return async (input) => {
    const results = await Promise.all(fns.map((fn) => fn(input)));
    return results;
  };
}

// Conditional branching based on runtime conditions
function branch(condition, ifTrue, ifFalse) {
  return async (input) => {
    const shouldBranch = await (typeof condition === "function"
      ? condition(input)
      : condition);
    return shouldBranch ? ifTrue(input) : ifFalse(input);
  };
}

// Retry mechanism with configurable attempts
function retry(fn, options = {}) {
  return withRetry(fn, options);
}

// Error handling wrapper
function catchError(fn, handler) {
  return async (input) => {
    try {
      return await fn(input);
    } catch (error) {
      return handler(error, input);
    }
  };
}

// Enhanced prompting with caching, progress tracking, and token management
async function enhancedPrompt(model, input, options = {}) {
  const {
    cache,
    progressTracker,
    tokenCounter,
    retry = false,
    cacheKey,
    maxRetries = 3,
    signal,
  } = options;

  // Check cache if provided
  if (cache && cacheKey) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  // Check token limit if counter provided
  if (tokenCounter && tokenCounter.wouldExceedLimit(input)) {
    throw new Error("Token limit would be exceeded");
  }

  // Create prompt function with or without retry
  const promptFn = retry ? withRetry(prompt, { maxRetries }) : prompt;

  // Execute prompt
  const result = await promptFn(model, input, { signal });

  // Track tokens if counter provided
  if (tokenCounter) {
    tokenCounter.track(input);
    tokenCounter.track(result.content);
  }

  // Update progress if tracker provided
  if (progressTracker) {
    progressTracker.update(tokenCounter?.used || 0);
  }

  // Cache result if cache provided
  if (cache && cacheKey) {
    await cache.set(cacheKey, result);
  }

  return result;
}

// Create and configure window.ai model instance
async function createModel(config = {}) {
  const capabilities = await checkModelCapabilities();
  if (!capabilities.isAvailable) {
    throw new Error("Language model is not available");
  }

  const modelConfig = {
    temperature: config.temperature ?? capabilities.defaultTemperature,
    topK: config.topK ?? capabilities.defaultTopK,
    format: config.format,
  };

  // Add download progress monitoring if needed
  if (capabilities.needsDownload && config.onDownloadProgress) {
    modelConfig.monitor = (m) => {
      m.addEventListener("downloadprogress", config.onDownloadProgress);
    };
  }

  // Add system message if provided
  if (config.systemPrompt) {
    modelConfig.systemPrompt = config.systemPrompt;
  }

  return await window.ai.languageModel.create(modelConfig);
}

// Format messages for chat-style interactions
function formatMessages(messages) {
  return messages
    .map((msg) => {
      if (Array.isArray(msg)) {
        const [role, content] = msg;
        return `${role}: ${content}`;
      }
      return `${msg.role}: ${msg.content}`;
    })
    .join("\n");
}

// Check window.ai model capabilities and availability
async function checkModelCapabilities() {
  const capabilities = await window.ai.languageModel.capabilities();
  return {
    isAvailable: capabilities.available !== "no",
    needsDownload: capabilities.available === "after-download",
    defaultTemperature: capabilities.defaultTemperature,
    defaultTopK: capabilities.defaultTopK,
    maxTopK: capabilities.maxTopK,
  };
}

// Simple template processing
function createTemplate(template, variables = []) {
  return (values) => {
    let result = template;
    for (const key of variables) {
      if (!(key in values)) {
        throw new Error(`Missing value for variable: ${key}`);
      }
      result = result.replace(`{${key}}`, values[key]);
    }
    return result;
  };
}

// Chat message template processing
function createMessageTemplate(messages, variables = []) {
  return (values) => {
    return messages.map(([role, content]) => {
      const formattedContent = variables.reduce((acc, key) => {
        if (!(key in values)) {
          throw new Error(`Missing value for variable: ${key}`);
        }
        return acc.replace(`{${key}}`, values[key]);
      }, content);
      return [role, formattedContent];
    });
  };
}

// Core prompt execution
async function prompt(model, input, options = {}) {
  try {
    const response = await model.prompt(
      typeof input === "string" ? input : formatMessages(input),
      { signal: options.signal }
    );

    return {
      content: response,
      metadata: {
        tokensSoFar: model.tokensSoFar,
        maxTokens: model.maxTokens,
        tokensLeft: model.tokensLeft,
        created_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }
    throw new Error("Failed to execute prompt: " + error.message);
  }
}

// Streaming prompt execution
async function* streamPrompt(model, input, options = {}) {
  const stream = await model.promptStreaming(
    typeof input === "string" ? input : formatMessages(input),
    { signal: options.signal }
  );

  let previousChunk = "";
  try {
    for await (const chunk of stream) {
      const newChunk = chunk.startsWith(previousChunk)
        ? chunk.slice(previousChunk.length)
        : chunk;

      yield {
        content: newChunk,
        isPartial: true,
      };

      previousChunk = chunk;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }
    throw new Error("Stream failed: " + error.message);
  }
}

// Enhanced streaming with backpressure and chunking
async function* createStreamProcessor(stream, options = {}) {
  const {
    chunkSize = 1024,
    maxBackpressure = 5000,
    aggregationWindow = 100
  } = options;

  let buffer = '';
  let lastFlush = Date.now();
  
  // Backpressure handling
  const processWithBackpressure = async (chunk) => {
    if (buffer.length > maxBackpressure) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    buffer += chunk;
  };

  // Chunking strategy
  const shouldFlush = () => {
    const now = Date.now();
    return buffer.length >= chunkSize || (now - lastFlush) >= aggregationWindow;
  };

  const flush = () => {
    const chunk = buffer;
    buffer = '';
    lastFlush = Date.now();
    return chunk;
  };

  try {
    for await (const chunk of stream) {
      await processWithBackpressure(chunk);
      
      if (shouldFlush()) {
        yield flush();
      }
    }

    // Flush any remaining content
    if (buffer.length > 0) {
      yield flush();
    }
  } catch (error) {
    console.error('Stream processing error:', error);
    throw error;
  }
}

// Enhanced streaming prompt execution with backpressure and chunking
async function enhancedStreamPrompt(model, input, options = {}) {
  const {
    temperature = 0.7,
    maxTokens,
    stopSequences = [],
    streamOptions = {}
  } = options;

  const stream = await model.streamComplete({
    prompt: input,
    temperature,
    maxTokens,
    stop: stopSequences
  });

  return createStreamProcessor(stream, streamOptions);
}

// Function composition helper
function pipe(...fns) {
  return (x) => fns.reduce((v, f) => f(v), x);
}

// Retry wrapper with exponential backoff
function withRetry(fn, { maxRetries = 3, delay = 1000 } = {}) {
  return async (...args) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    throw lastError;
  };
}

// JSON output mode helper with enhanced validation and parsing
function withJsonOutput(model, schema) {
  return {
    ...model,
    async prompt(input, options) {
      // Add JSON-specific system message if not already present
      const systemPrompt = `You ONLY output valid JSON objects. NEVER give explanations or examples. NEVER use markdown formatting. NEVER use backticks. Output MUST be a single JSON object with exactly these fields: ${Object.keys(
        schema
      ).join(", ")}.`;

      const jsonModel = {
        ...model,
        systemPrompt: model.systemPrompt
          ? `${model.systemPrompt}\n${systemPrompt}`
          : systemPrompt,
        temperature: 0.1, // Lower temperature for more consistent JSON output
      };

      try {
        const response = await jsonModel.prompt(input, {
          ...options,
          format: "json",
          outputSchema: schema,
        });

        // Extract JSON from response (handling potential non-JSON content)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON object found in response");
        }

        const jsonResponse = JSON.parse(jsonMatch[0]);

        // Validate required fields
        for (const [key, type] of Object.entries(schema)) {
          if (!(key in jsonResponse)) {
            throw new Error(`Missing required field: ${key}`);
          }
          if (typeof jsonResponse[key] !== type) {
            throw new Error(
              `Invalid type for ${key}: expected ${type}, got ${typeof jsonResponse[
                key
              ]}`
            );
          }
        }

        return jsonResponse;
      } catch (error) {
        throw new Error(`JSON parsing failed: ${error.message}`);
      }
    },
  };
}

// Advanced composition pattern builder
function createCompositionBuilder() {
  const steps = [];
  let errorHandler = (error) => {
    throw error;
  };
  let finalizer = null;
  
  // Circuit breaker state
  const circuitState = {
    status: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
    failures: 0,
    lastFailure: null,
    resetTimeout: null
  };

  return {
    // Add function to composition pipeline
    pipe(fn) {
      steps.push(fn);
      return this;
    },

    // Add conditional branching
    branch(condition, ifTrue, ifFalse) {
      steps.push(async (input) => {
        const shouldBranch = await (typeof condition === "function"
          ? condition(input)
          : condition);
        return shouldBranch ? ifTrue(input) : ifFalse(input);
      });
      return this;
    },

    // Add array mapping operation
    map(fn) {
      steps.push(async (input) => {
        if (!Array.isArray(input)) {
          throw new Error("Map requires array input");
        }
        return Promise.all(input.map(fn));
      });
      return this;
    },

    // Add array filtering operation
    filter(predicate) {
      steps.push(async (input) => {
        if (!Array.isArray(input)) {
          throw new Error("Filter requires array input");
        }
        const results = await Promise.all(
          input.map(async (item) => ({
            item,
            keep: await predicate(item),
          }))
        );
        return results.filter((r) => r.keep).map((r) => r.item);
      });
      return this;
    },

    // Add retry mechanism to last step
    retry(options = {}) {
      const lastStep = steps[steps.length - 1];
      if (!lastStep) return this;

      steps[steps.length - 1] = withRetry(lastStep, options);
      return this;
    },

    // Add timeout to last step
    timeout(ms) {
      steps.push(async (input) => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Operation timed out")), ms);
        });
        return Promise.race([steps[steps.length - 1](input), timeoutPromise]);
      });
      return this;
    },

    // Add debounce to last step
    debounce(ms) {
      let timeout;
      steps.push(async (input) => {
        clearTimeout(timeout);
        return new Promise((resolve) => {
          timeout = setTimeout(
            () => resolve(steps[steps.length - 1](input)),
            ms
          );
        });
      });
      return this;
    },

    // Add throttle to last step
    throttle(ms) {
      let lastRun = 0;
      steps.push(async (input) => {
        const now = Date.now();
        if (now - lastRun < ms) {
          await new Promise((resolve) =>
            setTimeout(resolve, ms - (now - lastRun))
          );
        }
        lastRun = Date.now();
        return steps[steps.length - 1](input);
      });
      return this;
    },

    // Add caching to last step
    cache(options) {
      const cache = createEnhancedCache(options);
      steps.push(async (input) => {
        const key = JSON.stringify(input);
        const cached = await cache.get(key);
        if (cached) return cached;

        const result = await steps[steps.length - 1](input);
        await cache.set(key, result);
        return result;
      });
      return this;
    },

    // Set error handler
    onError(handler) {
      errorHandler = handler;
      return this;
    },

    // Set finalizer
    finally(fn) {
      finalizer = fn;
      return this;
    },

    // Add reduce operation
    reduce(fn, initialValue) {
      steps.push(async (input) => {
        if (!Array.isArray(input)) {
          throw new Error("Reduce requires array input");
        }
        let accumulator = initialValue;
        for (const item of input) {
          accumulator = await fn(accumulator, item);
        }
        return accumulator;
      });
      return this;
    },

    // Add batch processing
    batch(size, fn) {
      steps.push(async (input) => {
        if (!Array.isArray(input)) {
          throw new Error("Batch requires array input");
        }
        const batches = [];
        for (let i = 0; i < input.length; i += size) {
          batches.push(input.slice(i, i + size));
        }
        return Promise.all(batches.map(fn));
      });
      return this;
    },

    // Add rate limiting
    rateLimit(maxRequests, timeWindow) {
      const timestamps = [];
      steps.push(async (input) => {
        const now = Date.now();
        timestamps.push(now);
        
        // Remove timestamps outside the window
        while (timestamps[0] < now - timeWindow) {
          timestamps.shift();
        }

        if (timestamps.length > maxRequests) {
          const oldestTimestamp = timestamps[0];
          const waitTime = timeWindow - (now - oldestTimestamp);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        return steps[steps.length - 1](input);
      });
      return this;
    },

    // Add circuit breaker pattern
    circuitBreaker(options = {}) {
      const {
        failureThreshold = 5,
        resetTimeout = 60000,
        halfOpenTimeout = 30000
      } = options;

      steps.push(async (input) => {
        const now = Date.now();

        // Check circuit state
        switch (circuitState.status) {
          case 'OPEN':
            if (now - circuitState.lastFailure > resetTimeout) {
              circuitState.status = 'HALF_OPEN';
            } else {
              throw new Error('Circuit breaker is OPEN');
            }
            break;
          
          case 'HALF_OPEN':
            if (now - circuitState.lastFailure > halfOpenTimeout) {
              circuitState.status = 'CLOSED';
              circuitState.failures = 0;
            }
            break;
        }

        try {
          const result = await steps[steps.length - 1](input);
          if (circuitState.status === 'HALF_OPEN') {
            circuitState.status = 'CLOSED';
            circuitState.failures = 0;
          }
          return result;
        } catch (error) {
          circuitState.failures++;
          circuitState.lastFailure = now;
          
          if (circuitState.failures >= failureThreshold) {
            circuitState.status = 'OPEN';
          }
          throw error;
        }
      });
      return this;
    },

    // Add saga pattern for distributed transactions
    saga(compensations = []) {
      steps.push(async (input) => {
        const executedSteps = [];
        try {
          const result = await steps[steps.length - 1](input);
          return result;
        } catch (error) {
          // Execute compensating transactions in reverse order
          for (let i = executedSteps.length - 1; i >= 0; i--) {
            const compensation = compensations[i];
            if (compensation) {
              try {
                await compensation(executedSteps[i]);
              } catch (compensationError) {
                console.error('Compensation failed:', compensationError);
              }
            }
          }
          throw error;
        }
      });
      return this;
    },

    // Add parallel processing with concurrency limit
    parallelWithLimit(fn, limit) {
      steps.push(async (input) => {
        if (!Array.isArray(input)) {
          throw new Error("Parallel processing requires array input");
        }

        const results = [];
        const executing = new Set();

        for (const item of input) {
          if (executing.size >= limit) {
            await Promise.race(executing);
          }

          const promise = fn(item).then(result => {
            executing.delete(promise);
            return result;
          });

          executing.add(promise);
          results.push(promise);
        }

        return Promise.all(results);
      });
      return this;
    },

    // Add memoization with custom key generator
    memoize(keyGen = JSON.stringify) {
      const cache = new Map();
      steps.push(async (input) => {
        const key = keyGen(input);
        if (cache.has(key)) {
          return cache.get(key);
        }
        const result = await steps[steps.length - 1](input);
        cache.set(key, result);
        return result;
      });
      return this;
    },

    // Add event emission for monitoring
    emit(eventName, callback) {
      steps.push(async (input) => {
        const startTime = Date.now();
        try {
          const result = await steps[steps.length - 1](input);
          callback({
            event: eventName,
            status: 'success',
            duration: Date.now() - startTime,
            input,
            result
          });
          return result;
        } catch (error) {
          callback({
            event: eventName,
            status: 'error',
            duration: Date.now() - startTime,
            input,
            error
          });
          throw error;
        }
      });
      return this;
    },

    // Add validation step
    validate(schema) {
      steps.push(async (input) => {
        const errors = [];
        for (const [key, validator] of Object.entries(schema)) {
          try {
            if (!validator(input[key])) {
              errors.push(`Invalid ${key}`);
            }
          } catch (error) {
            errors.push(`Validation error for ${key}: ${error.message}`);
          }
        }
        
        if (errors.length > 0) {
          throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
        
        return steps[steps.length - 1](input);
      });
      return this;
    },

    // Build and return composed function
    build() {
      return async (input) => {
        try {
          let result = input;
          for (const step of steps) {
            result = await step(result);
          }
          return result;
        } catch (error) {
          return errorHandler(error);
        } finally {
          if (finalizer) {
            await finalizer();
          }
        }
      };
    },
  };
}

// Enhanced token estimation using BPE-like approach with model-specific tokenizers
function createEnhancedTokenCounter(maxTokens = 4096, modelType = 'gpt-3.5') {
  // Model-specific tokenizer configurations
  const modelConfigs = {
    'gpt-3.5': {
      avgTokenLength: 4,
      specialTokens: new Set([
        '<|reserved_special_token_0|>',
        '<|reserved_special_token_1|>',
        '<|reserved_special_token_2|>',
        '<|reserved_special_token_3|>',
        '<|reserved_special_token_4|>',
        '<|reserved_special_token_5|>',
        '<|reserved_special_token_6|>',
        '<|reserved_special_token_7|>',
        '<|reserved_special_token_8|>',
        '<|reserved_special_token_9|>',
        '<|reserved_special_token_10|>',
        '<|reserved_special_token_11|>',
        '<|reserved_special_token_12|>',
        '<|reserved_special_token_13|>',
        '<|reserved_special_token_14|>',
        '<|reserved_special_token_15|>',
        '<|reserved_special_token_16|>',
        '<|reserved_special_token_17|>',
        '<|reserved_special_token_18|>',
        '<|reserved_special_token_19|>',
        '<|reserved_special_token_20|>',
        '<|reserved_special_token_21|>',
        '<|reserved_special_token_22|>',
        '<|reserved_special_token_23|>',
        '<|reserved_special_token_24|>',
        '<|reserved_special_token_25|>',
        '<|reserved_special_token_26|>',
        '<|reserved_special_token_27|>',
        '<|reserved_special_token_28|>',
        '<|reserved_special_token_29|>',
        '<|reserved_special_token_30|>',
        '<|reserved_special_token_31|>',
        '<|reserved_special_token_32|>',
        '<|reserved_special_token_33|>',
        '<|reserved_special_token_34|>',
        '<|reserved_special_token_35|>',
        '<|reserved_special_token_36|>',
        '<|reserved_special_token_37|>',
        '<|reserved_special_token_38|>',
        '<|reserved_special_token_39|>',
        '<|reserved_special_token_40|>',
        '<|reserved_special_token_41|>',
        '<|reserved_special_token_42|>',
        '<|reserved_special_token_43|>',
        '<|reserved_special_token_44|>',
        '<|reserved_special_token_45|>',
        '<|reserved_special_token_46|>',
        '<|reserved_special_token_47|>',
        '<|reserved_special_token_48|>',
        '<|reserved_special_token_49|>',
        '<|reserved_special_token_50|>',
        '<|reserved_special_token_51|>',
        '<|reserved_special_token_52|>',
        '<|reserved_special_token_53|>',
        '<|reserved_special_token_54|>',
        '<|reserved_special_token_55|>',
        '<|reserved_special_token_56|>',
        '<|reserved_special_token_57|>',
        '<|reserved_special_token_58|>',
        '<|reserved_special_token_59|>',
        '<|reserved_special_token_60|>',
        '<|reserved_special_token_61|>',
        '<|reserved_special_token_62|>',
        '<|reserved_special_token_63|>',
        '<|reserved_special_token_64|>',
        '<|reserved_special_token_65|>',
        '<|reserved_special_token_66|>',
        '<|reserved_special_token_67|>',
        '<|reserved_special_token_68|>',
        '<|reserved_special_token_69|>',
        '<|reserved_special_token_70|>',
        '<|reserved_special_token_71|>',
        '<|reserved_special_token_72|>',
        '<|reserved_special_token_73|>',
        '<|reserved_special_token_74|>',
        '<|reserved_special_token_75|>',
        '<|reserved_special_token_76|>',
        '<|reserved_special_token_77|>',
        '<|reserved_special_token_78|>',
        '<|reserved_special_token_79|>',
        '<|reserved_special_token_80|>',
        '<|reserved_special_token_81|>',
        '<|reserved_special_token_82|>',
        '<|reserved_special_token_83|>',
        '<|reserved_special_token_84|>',
        '<|reserved_special_token_85|>',
        '<|reserved_special_token_86|>',
        '<|reserved_special_token_87|>',
        '<|reserved_special_token_88|>',
        '<|reserved_special_token_89|>',
        '<|reserved_special_token_90|>',
        '<|reserved_special_token_91|>',
        '<|reserved_special_token_92|>',
        '<|reserved_special_token_93|>',
        '<|reserved_special_token_94|>',
        '<|reserved_special_token_95|>',
        '<|reserved_special_token_96|>',
        '<|reserved_special_token_97|>',
        '<|reserved_special_token_98|>',
        '<|reserved_special_token_99|>',
      ]),
    },
  };

  const modelConfig = modelConfigs[modelType];

  if (!modelConfig) {
    throw new Error(`Unsupported model type: ${modelType}`);
  }

  const estimateTokens = (text) => {
    let tokens = 0;

    // Split into words
    const words = text.split(/\s+/);

    for (const word of words) {
      if (modelConfig.specialTokens.has(word)) {
        tokens += 1;
        continue;
      }

      // Count numbers as single tokens
      if (/\d+/.test(word)) {
        tokens += 1;
        continue;
      }

      // Estimate subwords
      let remainingWord = word;
      for (const subword of ['ing', 'ed', 'ly', 'er', 'est', 'tion', 'ment']) {
        if (remainingWord.includes(subword)) {
          tokens += 1;
          remainingWord = remainingWord.replace(subword, '');
        }
      }

      // Add remaining characters
      if (remainingWord.length > 0) {
        tokens += Math.ceil(remainingWord.length / modelConfig.avgTokenLength);
      }
    }

    // Add tokens for whitespace and formatting
    tokens += (text.match(/\n+/g) || []).length;

    return Math.max(1, tokens);
  };

  let usedTokens = 0;

  return {
    track(text) {
      const tokens = estimateTokens(text);
      usedTokens += tokens;
      return tokens;
    },
    reset() {
      usedTokens = 0;
    },
    get remaining() {
      return maxTokens - usedTokens;
    },
    get used() {
      return usedTokens;
    },
    wouldExceedLimit(text) {
      return usedTokens + estimateTokens(text) > maxTokens;
    },
    estimate(text) {
      return estimateTokens(text);
    },
  };
}

// Enhanced caching with multiple strategies
function createEnhancedCache(options = {}) {
  const {
    ttl = 5 * 60 * 1000,
    maxSize = 100,
    strategy = "lru",
    namespace = "default",
    persistent = false,
    onEvict = null,
  } = options;

  const cache = new Map();
  const metadata = new Map();
  let hits = 0;
  let misses = 0;

  // Load from persistent storage if enabled
  if (persistent) {
    try {
      const stored = localStorage.getItem(`windowchain_cache_${namespace}`);
      if (stored) {
        const { items, meta } = JSON.parse(stored);
        for (const [key, item] of Object.entries(items)) {
          cache.set(key, item);
        }
        for (const [key, data] of Object.entries(meta)) {
          metadata.set(key, data);
        }
      }
    } catch (e) {
      console.warn("Failed to load persistent cache:", e);
    }
  }

  // Persist cache to storage
  const persist = () => {
    if (persistent) {
      try {
        localStorage.setItem(
          `windowchain_cache_${namespace}`,
          JSON.stringify({
            items: Object.fromEntries(cache),
            meta: Object.fromEntries(metadata),
          })
        );
      } catch (e) {
        console.warn("Failed to persist cache:", e);
      }
    }
  };

  // Evict items based on strategy
  const evict = () => {
    if (cache.size <= maxSize) return;

    let keyToEvict;
    switch (strategy) {
      case "lru":
        // Evict least recently used
        keyToEvict = Array.from(metadata.entries()).sort(
          ([, a], [, b]) => a.lastAccessed - b.lastAccessed
        )[0][0];
        break;
      case "lfu":
        // Evict least frequently used
        keyToEvict = Array.from(metadata.entries()).sort(
          ([, a], [, b]) => a.hits - b.hits
        )[0][0];
        break;
      case "fifo":
        // Evict oldest entry
        keyToEvict = Array.from(metadata.entries()).sort(
          ([, a], [, b]) => a.created - b.created
        )[0][0];
        break;
      default:
        keyToEvict = cache.keys().next().value;
    }

    if (onEvict) {
      onEvict(keyToEvict, cache.get(keyToEvict));
    }

    cache.delete(keyToEvict);
    metadata.delete(keyToEvict);
    persist();
  };

  return {
    async get(key) {
      const item = cache.get(key);
      if (!item) {
        misses++;
        return undefined;
      }

      const meta = metadata.get(key);
      if (Date.now() > meta.expires) {
        cache.delete(key);
        metadata.delete(key);
        persist();
        misses++;
        return undefined;
      }

      hits++;
      meta.hits++;
      meta.lastAccessed = Date.now();
      metadata.set(key, meta);
      persist();
      return item.value;
    },

    async set(key, value) {
      evict(); // Ensure we're under maxSize

      cache.set(key, { value });
      metadata.set(key, {
        expires: Date.now() + ttl,
        created: Date.now(),
        lastAccessed: Date.now(),
        hits: 0,
      });

      persist();
    },

    async has(key) {
      if (!cache.has(key)) return false;
      const meta = metadata.get(key);
      return Date.now() <= meta.expires;
    },

    clear() {
      cache.clear();
      metadata.clear();
      persist();
    },

    stats() {
      return {
        size: cache.size,
        hits,
        misses,
        hitRate: hits / (hits + misses) || 0,
        oldestEntry: Math.min(
          ...Array.from(metadata.values()).map((m) => m.created)
        ),
        newestEntry: Math.max(
          ...Array.from(metadata.values()).map((m) => m.created)
        ),
      };
    },
  };
}

// Enhanced token counting with model-specific support
function createTokenCounter(options = {}) {
  const {
    model = 'gpt-3.5',
    maxTokens = 4096,
    trackUsage = true
  } = options;

  // Model-specific configurations
  const modelConfigs = {
    'gpt-3.5': {
      tokenizer: 'cl100k_base',
      avgCharsPerToken: 4,
      specialTokens: new Set([
        '<|reserved_special_token_0|>',
        '<|reserved_special_token_1|>',
        '<|reserved_special_token_2|>',
        '<|reserved_special_token_3|>',
        '<|reserved_special_token_4|>',
        '<|reserved_special_token_5|>',
        '<|reserved_special_token_6|>',
        '<|reserved_special_token_7|>',
        '<|reserved_special_token_8|>',
        '<|reserved_special_token_9|>',
        '<|reserved_special_token_10|>',
        '<|reserved_special_token_11|>',
        '<|reserved_special_token_12|>',
        '<|reserved_special_token_13|>',
        '<|reserved_special_token_14|>',
        '<|reserved_special_token_15|>',
        '<|reserved_special_token_16|>',
        '<|reserved_special_token_17|>',
        '<|reserved_special_token_18|>',
        '<|reserved_special_token_19|>',
        '<|reserved_special_token_20|>',
        '<|reserved_special_token_21|>',
        '<|reserved_special_token_22|>',
        '<|reserved_special_token_23|>',
        '<|reserved_special_token_24|>',
        '<|reserved_special_token_25|>',
        '<|reserved_special_token_26|>',
        '<|reserved_special_token_27|>',
        '<|reserved_special_token_28|>',
        '<|reserved_special_token_29|>',
        '<|reserved_special_token_30|>',
        '<|reserved_special_token_31|>',
        '<|reserved_special_token_32|>',
        '<|reserved_special_token_33|>',
        '<|reserved_special_token_34|>',
        '<|reserved_special_token_35|>',
        '<|reserved_special_token_36|>',
        '<|reserved_special_token_37|>',
        '<|reserved_special_token_38|>',
        '<|reserved_special_token_39|>',
        '<|reserved_special_token_40|>',
        '<|reserved_special_token_41|>',
        '<|reserved_special_token_42|>',
        '<|reserved_special_token_43|>',
        '<|reserved_special_token_44|>',
        '<|reserved_special_token_45|>',
        '<|reserved_special_token_46|>',
        '<|reserved_special_token_47|>',
        '<|reserved_special_token_48|>',
        '<|reserved_special_token_49|>',
        '<|reserved_special_token_50|>',
        '<|reserved_special_token_51|>',
        '<|reserved_special_token_52|>',
        '<|reserved_special_token_53|>',
        '<|reserved_special_token_54|>',
        '<|reserved_special_token_55|>',
        '<|reserved_special_token_56|>',
        '<|reserved_special_token_57|>',
        '<|reserved_special_token_58|>',
        '<|reserved_special_token_59|>',
        '<|reserved_special_token_60|>',
        '<|reserved_special_token_61|>',
        '<|reserved_special_token_62|>',
        '<|reserved_special_token_63|>',
        '<|reserved_special_token_64|>',
        '<|reserved_special_token_65|>',
        '<|reserved_special_token_66|>',
        '<|reserved_special_token_67|>',
        '<|reserved_special_token_68|>',
        '<|reserved_special_token_69|>',
        '<|reserved_special_token_70|>',
        '<|reserved_special_token_71|>',
        '<|reserved_special_token_72|>',
        '<|reserved_special_token_73|>',
        '<|reserved_special_token_74|>',
        '<|reserved_special_token_75|>',
        '<|reserved_special_token_76|>',
        '<|reserved_special_token_77|>',
        '<|reserved_special_token_78|>',
        '<|reserved_special_token_79|>',
        '<|reserved_special_token_80|>',
        '<|reserved_special_token_81|>',
        '<|reserved_special_token_82|>',
        '<|reserved_special_token_83|>',
        '<|reserved_special_token_84|>',
        '<|reserved_special_token_85|>',
        '<|reserved_special_token_86|>',
        '<|reserved_special_token_87|>',
        '<|reserved_special_token_88|>',
        '<|reserved_special_token_89|>',
        '<|reserved_special_token_90|>',
        '<|reserved_special_token_91|>',
        '<|reserved_special_token_92|>',
        '<|reserved_special_token_93|>',
        '<|reserved_special_token_94|>',
        '<|reserved_special_token_95|>',
        '<|reserved_special_token_96|>',
        '<|reserved_special_token_97|>',
        '<|reserved_special_token_98|>',
        '<|reserved_special_token_99|>',
      ]),
    },
  };

  const modelConfig = modelConfigs[model];

  if (!modelConfig) {
    throw new Error(`Unsupported model type: ${model}`);
  }

  const estimateTokens = (text) => {
    let tokens = 0;

    // Split into words
    const words = text.split(/\s+/);

    for (const word of words) {
      if (modelConfig.specialTokens.has(word)) {
        tokens += 1;
        continue;
      }

      // Count numbers as single tokens
      if (/\d+/.test(word)) {
        tokens += 1;
        continue;
      }

      // Estimate subwords
      let remainingWord = word;
      for (const subword of ['ing', 'ed', 'ly', 'er', 'est', 'tion', 'ment']) {
        if (remainingWord.includes(subword)) {
          tokens += 1;
          remainingWord = remainingWord.replace(subword, '');
        }
      }

      // Add remaining characters
      if (remainingWord.length > 0) {
        tokens += Math.ceil(remainingWord.length / modelConfig.avgCharsPerToken);
      }
    }

    // Add tokens for whitespace and formatting
    tokens += (text.match(/\n+/g) || []).length;

    return Math.max(1, tokens);
  };

  let usedTokens = 0;

  return {
    track(text) {
      const tokens = estimateTokens(text);
      usedTokens += tokens;
      return tokens;
    },
    reset() {
      usedTokens = 0;
    },
    get remaining() {
      return maxTokens - usedTokens;
    },
    get used() {
      return usedTokens;
    },
    wouldExceedLimit(text) {
      return usedTokens + estimateTokens(text) > maxTokens;
    },
    estimate(text) {
      return estimateTokens(text);
    },
  };
}

// Model management with advanced fallback chains and monitoring
function createModelManager(options = {}) {
  const models = new Map();
  let activeModel = null;
  const fallbackChain = [];
  const modelStats = new Map();
  const defaultStrategy = 'priority'; // 'priority', 'round-robin', 'performance'
  const monitor = createPerformanceMonitor(options.monitoring);

  // Initialize model statistics
  function initModelStats(name) {
    modelStats.set(name, {
      successes: 0,
      failures: 0,
      totalLatency: 0,
      averageLatency: 0,
      lastUsed: null,
      errorTypes: new Map()
    });
  }

  // Update model statistics
  function updateModelStats(name, success, latency, error = null) {
    const stats = modelStats.get(name);
    if (success) {
      stats.successes++;
      stats.totalLatency += latency;
      stats.averageLatency = stats.totalLatency / stats.successes;
    } else {
      stats.failures++;
      const errorType = error?.constructor.name || 'Unknown';
      stats.errorTypes.set(errorType, (stats.errorTypes.get(errorType) || 0) + 1);
    }
    stats.lastUsed = Date.now();
  }

  return {
    // Register a model with optional priority for fallback chain
    registerModel(name, model, priority = 0) {
      models.set(name, { model, priority });
      fallbackChain.push({ name, priority });
      fallbackChain.sort((a, b) => b.priority - a.priority);
      initModelStats(name);
      if (!activeModel) this.switchModel(name);
      return this;
    },

    // Switch to a different model
    switchModel(name) {
      if (!models.has(name)) {
        throw new Error(`Model ${name} not found`);
      }
      activeModel = name;
      return this;
    },

    // Get current active model
    getActiveModel() {
      return activeModel ? models.get(activeModel).model : null;
    },

    // Get model statistics
    getModelStats(name) {
      return name ? modelStats.get(name) : Object.fromEntries(modelStats);
    },

    // Get next model based on strategy
    getNextModel(strategy = defaultStrategy, excludeModel = null) {
      const availableModels = fallbackChain.filter(m => m.name !== excludeModel);
      if (!availableModels.length) return null;

      switch (strategy) {
        case 'priority':
          return availableModels[0].name;
        case 'round-robin':
          const lastUsedIndex = availableModels.findIndex(m => m.name === activeModel);
          return availableModels[(lastUsedIndex + 1) % availableModels.length].name;
        case 'performance':
          return Array.from(modelStats.entries())
            .filter(([name]) => name !== excludeModel)
            .sort((a, b) => {
              const aScore = a[1].successes / (a[1].successes + a[1].failures) * (1 / (a[1].averageLatency || 1));
              const bScore = b[1].successes / (b[1].successes + b[1].failures) * (1 / (b[1].averageLatency || 1));
              return bScore - aScore;
            })[0]?.[0];
        default:
          return availableModels[0].name;
      }
    },

    // Execute with enhanced fallback chain
    async execute(input, options = {}) {
      const { 
        fallbackStrategy = defaultStrategy,
        maxAttempts = fallbackChain.length,
        timeout = 30000 
      } = options;

      let attempts = 0;
      let currentModel = activeModel;
      let error = null;

      while (attempts < maxAttempts && currentModel) {
        const startTime = Date.now();
        try {
          const result = await Promise.race([
            models.get(currentModel).model(input, options),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          ]);

          const latency = Date.now() - startTime;
          monitor.recordEvent(currentModel, { 
            success: true, 
            latency 
          });
          return result;
        } catch (e) {
          error = e;
          const latency = Date.now() - startTime;
          monitor.recordEvent(currentModel, { 
            success: false, 
            latency,
            error: e,
            isTimeout: e.message === 'Timeout'
          });
          
          attempts++;
          currentModel = this.getNextModel(fallbackStrategy, currentModel);
        }
      }

      throw error || new Error('No available models to process request');
    },

    // Get performance metrics
    getPerformanceMetrics(modelName) {
      return monitor.getMetrics(modelName);
    },

    // Add performance monitoring listener
    addPerformanceListener(callback) {
      return monitor.addListener(callback);
    }
  };
}

// Performance monitoring system for model analytics
function createPerformanceMonitor(options = {}) {
  const {
    sampleSize = 100,
    alertThresholds = {
      errorRate: 0.2,
      latency: 5000,
      timeout: 30000
    }
  } = options;

  const metrics = new Map();
  const listeners = new Set();

  function createMetrics() {
    return {
      requests: 0,
      successes: 0,
      failures: 0,
      totalLatency: 0,
      latencyHistory: [],
      errorHistory: [],
      lastUsed: null,
      errorTypes: new Map(),
      timeouts: 0
    };
  }

  return {
    // Record a model execution event
    recordEvent(modelName, { success, latency, error = null, isTimeout = false }) {
      if (!metrics.has(modelName)) {
        metrics.set(modelName, createMetrics());
      }

      const modelMetrics = metrics.get(modelName);
      modelMetrics.requests++;
      modelMetrics.lastUsed = Date.now();

      if (success) {
        modelMetrics.successes++;
        modelMetrics.totalLatency += latency;
        modelMetrics.latencyHistory.push({ timestamp: Date.now(), latency });
      } else {
        modelMetrics.failures++;
        if (isTimeout) modelMetrics.timeouts++;
        if (error) {
          const errorType = error.constructor.name;
          modelMetrics.errorTypes.set(
            errorType,
            (modelMetrics.errorTypes.get(errorType) || 0) + 1
          );
          modelMetrics.errorHistory.push({ 
            timestamp: Date.now(),
            type: errorType,
            message: error.message
          });
        }
      }

      // Maintain history size
      if (modelMetrics.latencyHistory.length > sampleSize) {
        modelMetrics.latencyHistory = modelMetrics.latencyHistory.slice(-sampleSize);
      }
      if (modelMetrics.errorHistory.length > sampleSize) {
        modelMetrics.errorHistory = modelMetrics.errorHistory.slice(-sampleSize);
      }

      // Check thresholds and notify listeners
      this.checkThresholds(modelName);
    },

    // Add a listener for monitoring events
    addListener(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    // Check performance thresholds
    checkThresholds(modelName) {
      const modelMetrics = metrics.get(modelName);
      if (!modelMetrics) return;

      const errorRate = modelMetrics.failures / modelMetrics.requests;
      const avgLatency = modelMetrics.totalLatency / modelMetrics.successes;
      const recentTimeouts = modelMetrics.timeouts;

      const alerts = [];
      
      if (errorRate > alertThresholds.errorRate) {
        alerts.push({
          type: 'ERROR_RATE',
          message: `High error rate (${(errorRate * 100).toFixed(2)}%) for model: ${modelName}`,
          value: errorRate
        });
      }

      if (avgLatency > alertThresholds.latency) {
        alerts.push({
          type: 'LATENCY',
          message: `High average latency (${avgLatency.toFixed(2)}ms) for model: ${modelName}`,
          value: avgLatency
        });
      }

      if (recentTimeouts > 0) {
        alerts.push({
          type: 'TIMEOUTS',
          message: `${recentTimeouts} timeout(s) detected for model: ${modelName}`,
          value: recentTimeouts
        });
      }

      if (alerts.length > 0) {
        const event = {
          timestamp: Date.now(),
          model: modelName,
          metrics: this.getMetrics(modelName),
          alerts
        };
        listeners.forEach(listener => listener(event));
      }
    },

    // Get metrics for a specific model or all models
    getMetrics(modelName) {
      if (modelName) {
        const modelMetrics = metrics.get(modelName);
        if (!modelMetrics) return null;

        return {
          ...modelMetrics,
          errorRate: modelMetrics.failures / modelMetrics.requests,
          averageLatency: modelMetrics.totalLatency / modelMetrics.successes,
          recentLatency: modelMetrics.latencyHistory
            .slice(-10)
            .reduce((sum, { latency }) => sum + latency, 0) / 10,
          errorTypes: Object.fromEntries(modelMetrics.errorTypes),
          recentErrors: modelMetrics.errorHistory.slice(-10)
        };
      }
      return Object.fromEntries(
        Array.from(metrics.entries()).map(([name, metrics]) => [
          name,
          this.getMetrics(name)
        ])
      );
    },

    // Reset metrics for a specific model or all models
    resetMetrics(modelName) {
      if (modelName) {
        metrics.set(modelName, createMetrics());
      } else {
        metrics.clear();
      }
    }
  };
}

// Template inheritance system
function createTemplateSystem() {
  const templates = new Map();
  const templateVersions = new Map();
  const blockRegex = /\{\% block (\w+) \%\}([\s\S]*?)\{\% endblock \%\}/g;
  const extendsRegex = /\{\% extends ["'](.+?)["'] \%\}/;
  const includeRegex = /\{\% include ["'](.+?)["'] \%\}/g;
  const variableRegex = /\{\{ (\w+) \}\}/g;
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;

  function validateVersion(version) {
    if (!versionRegex.test(version)) {
      throw new Error('Invalid version format. Use semantic versioning (e.g., "1.0.0")');
    }
    return version;
  }

  function compareVersions(v1, v2) {
    const [major1, minor1, patch1] = v1.split('.').map(Number);
    const [major2, minor2, patch2] = v2.split('.').map(Number);

    if (major1 !== major2) return major1 - major2;
    if (minor1 !== minor2) return minor1 - minor2;
    return patch1 - patch2;
  }

  const validator = createTemplateValidator();

  return {
    // Register a template
    register(name, content, version = '1.0.0', validateRules = []) {
      if (validateRules.length > 0) {
        const validation = validator.validate(content, validateRules);
        if (!validation.valid) {
          throw new Error(
            'Template validation failed:\n' +
            validation.violations
              .map(v => `- ${v.severity.toUpperCase()}: ${v.message}`)
              .join('\n')
          );
        }
      }

      version = validateVersion(version);
      templates.set(name, content);
      
      // Initialize version control
      if (!templateVersions.has(name)) {
        templateVersions.set(name, new Map());
      }
      
      const templateVersion = {
        content,
        version,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      templateVersions.get(name).set(version, templateVersion);
      
      return this;
    },

    // Get a registered template
    get(name) {
      if (!templates.has(name)) {
        throw new Error(`Template not found: ${name}`);
      }
      return templates.get(name);
    },

    // Parse blocks from template
    parseBlocks(content) {
      const blocks = new Map();
      let match;
      while ((match = blockRegex.exec(content)) !== null) {
        blocks.set(match[1], match[2].trim());
      }
      return blocks;
    },

    // Process template inheritance
    processInheritance(content) {
      const extendsMatch = content.match(extendsRegex);
      if (!extendsMatch) return content;

      const parentName = extendsMatch[1];
      const parentTemplate = this.get(parentName);
      const childBlocks = this.parseBlocks(content);
      const parentBlocks = this.parseBlocks(parentTemplate);

      // Merge child blocks into parent template
      let result = parentTemplate;
      for (const [name, content] of parentBlocks) {
        const blockPattern = new RegExp(
          `\\{\\% block ${name} \\%\\}[\\s\\S]*?\\{\\% endblock \\%\\}`
        );
        const replacement = childBlocks.has(name)
          ? `{% block ${name} %}${childBlocks.get(name)}{% endblock %}`
          : `{% block ${name} %}${content}{% endblock %}`;
        result = result.replace(blockPattern, replacement);
      }

      // Add any new blocks from child
      for (const [name, content] of childBlocks) {
        if (!parentBlocks.has(name)) {
          result += `\n{% block ${name} %}${content}{% endblock %}`;
        }
      }

      return result;
    },

    // Process includes
    processIncludes(content) {
      let result = content;
      let match;
      while ((match = includeRegex.exec(content)) !== null) {
        const includeName = match[1];
        const includeContent = this.get(includeName);
        result = result.replace(match[0], includeContent);
      }
      return result;
    },

    // Render template with variables
    render(name, variables = {}, version) {
      let content;
      if (version) {
        content = this.getVersion(name, version).content;
      } else {
        content = this.get(name);
      }
      
      // Process inheritance
      content = this.processInheritance(content);
      
      // Process includes
      content = this.processIncludes(content);
      
      // Replace variables
      content = content.replace(variableRegex, (match, key) => {
        if (!(key in variables)) {
          throw new Error(`Missing variable: ${key}`);
        }
        return variables[key];
      });

      return content;
    },

    // Version control methods
    createVersion(name, content, version) {
      if (!templates.has(name)) {
        throw new Error(`Template not found: ${name}`);
      }

      version = validateVersion(version);
      const templateVersion = {
        content,
        version,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (!templateVersions.has(name)) {
        templateVersions.set(name, new Map());
      }
      
      const versions = templateVersions.get(name);
      versions.set(version, templateVersion);

      // Update the current template to the new version
      templates.set(name, content);

      return this;
    },

    getVersion(name, version) {
      if (!templateVersions.has(name)) {
        throw new Error(`No versions found for template: ${name}`);
      }

      const versions = templateVersions.get(name);
      if (!version) {
        // Return latest version if no specific version requested
        const latestVersion = Array.from(versions.keys())
          .sort(compareVersions)
          .pop();
        return versions.get(latestVersion);
      }

      version = validateVersion(version);
      const templateVersion = versions.get(version);
      if (!templateVersion) {
        throw new Error(`Version ${version} not found for template: ${name}`);
      }

      return templateVersion;
    },

    listVersions(name) {
      if (!templateVersions.has(name)) {
        return [];
      }

      return Array.from(templateVersions.get(name).keys())
        .sort(compareVersions)
        .map(version => ({
          version,
          createdAt: templateVersions.get(name).get(version).createdAt
        }));
    },

    rollback(name, version) {
      const targetVersion = this.getVersion(name, version);
      templates.set(name, targetVersion.content);
      return this;
    },

    // Create a new version with semantic versioning
    bumpVersion(name, type = 'patch') {
      const versions = this.listVersions(name);
      if (versions.length === 0) {
        throw new Error(`No versions found for template: ${name}`);
      }

      const currentVersion = versions[versions.length - 1].version;
      const [major, minor, patch] = currentVersion.split('.').map(Number);

      let newVersion;
      switch (type) {
        case 'major':
          newVersion = `${major + 1}.0.0`;
          break;
        case 'minor':
          newVersion = `${major}.${minor + 1}.0`;
          break;
        case 'patch':
          newVersion = `${major}.${minor}.${patch + 1}`;
          break;
        default:
          throw new Error('Invalid version bump type. Use: major, minor, or patch');
      }

      return this.createVersion(name, templates.get(name), newVersion);
    },

    // Add validation rule
    addValidationRule(name, config) {
      validator.addRule(name, config);
      return this;
    },

    // Validate template
    validate(name, rules = []) {
      const content = this.get(name);
      return validator.validate(content, rules);
    },

    // Get available validation rules
    getValidationRules() {
      return validator.getRules();
    },
  };
}

// Template validation system
function createTemplateValidator() {
  const rules = new Map();
  const RULE_TYPES = {
    REGEX: 'regex',
    FUNCTION: 'function',
    SCHEMA: 'schema',
    LENGTH: 'length',
    REQUIRED_BLOCKS: 'required_blocks',
    FORBIDDEN_BLOCKS: 'forbidden_blocks',
    VARIABLE_CONSTRAINTS: 'variable_constraints'
  };

  return {
    // Add a validation rule
    addRule(name, config) {
      const {
        type,
        pattern,
        message,
        severity = 'error', // 'error' | 'warning'
        options = {}
      } = config;

      if (!RULE_TYPES[type.toUpperCase()]) {
        throw new Error(`Invalid rule type: ${type}`);
      }

      rules.set(name, { type, pattern, message, severity, options });
      return this;
    },

    // Validate template content
    validate(content, activeRules = []) {
      const violations = [];
      const blockRegex = /\{\% block (\w+) \%\}([\s\S]*?)\{\% endblock \%\}/g;
      const variableRegex = /\{\{ (\w+) \}\}/g;

      // Helper to add violations
      const addViolation = (rule, message, location = null) => {
        violations.push({
          rule: rule.name,
          message: message || rule.message,
          severity: rule.severity,
          location
        });
      };

      // Process each active rule
      for (const ruleName of activeRules) {
        const rule = rules.get(ruleName);
        if (!rule) continue;

        switch (rule.type) {
          case RULE_TYPES.REGEX:
            {
              const matches = content.match(rule.pattern);
              if (matches && rule.options.forbidden) {
                addViolation(rule, `Found forbidden pattern: ${matches[0]}`);
              } else if (!matches && !rule.options.forbidden) {
                addViolation(rule, `Required pattern not found: ${rule.pattern}`);
              }
            }
            break;

          case RULE_TYPES.FUNCTION:
            {
              try {
                const result = rule.pattern(content);
                if (!result.valid) {
                  addViolation(rule, result.message);
                }
              } catch (error) {
                addViolation(rule, `Validation function error: ${error.message}`);
              }
            }
            break;

          case RULE_TYPES.SCHEMA:
            {
              const variables = new Set();
              let match;
              while ((match = variableRegex.exec(content)) !== null) {
                variables.add(match[1]);
              }

              // Validate required variables
              for (const [key, schema] of Object.entries(rule.pattern)) {
                if (schema.required && !variables.has(key)) {
                  addViolation(rule, `Missing required variable: ${key}`);
                }
              }
            }
            break;

          case RULE_TYPES.LENGTH:
            {
              const { min, max } = rule.options;
              if (min !== undefined && content.length < min) {
                addViolation(rule, `Template length ${content.length} is below minimum ${min}`);
              }
              if (max !== undefined && content.length > max) {
                addViolation(rule, `Template length ${content.length} exceeds maximum ${max}`);
              }
            }
            break;

          case RULE_TYPES.REQUIRED_BLOCKS:
            {
              const blocks = new Set();
              let match;
              while ((match = blockRegex.exec(content)) !== null) {
                blocks.add(match[1]);
              }

              for (const requiredBlock of rule.pattern) {
                if (!blocks.has(requiredBlock)) {
                  addViolation(rule, `Missing required block: ${requiredBlock}`);
                }
              }
            }
            break;

          case RULE_TYPES.FORBIDDEN_BLOCKS:
            {
              let match;
              while ((match = blockRegex.exec(content)) !== null) {
                if (rule.pattern.includes(match[1])) {
                  addViolation(rule, `Found forbidden block: ${match[1]}`);
                }
              }
            }
            break;

          case RULE_TYPES.VARIABLE_CONSTRAINTS:
            {
              let match;
              while ((match = variableRegex.exec(content)) !== null) {
                const varName = match[1];
                const constraints = rule.pattern[varName];
                
                if (constraints) {
                  if (constraints.format && !constraints.format.test(varName)) {
                    addViolation(rule, `Variable ${varName} does not match required format`);
                  }
                  if (constraints.prefix && !varName.startsWith(constraints.prefix)) {
                    addViolation(rule, `Variable ${varName} must start with ${constraints.prefix}`);
                  }
                  if (constraints.suffix && !varName.endsWith(constraints.suffix)) {
                    addViolation(rule, `Variable ${varName} must end with ${constraints.suffix}`);
                  }
                }
              }
            }
            break;
        }
      }

      return {
        valid: violations.length === 0,
        violations: violations.sort((a, b) => 
          a.severity === 'error' ? -1 : b.severity === 'error' ? 1 : 0
        )
      };
    },

    // Get all available rules
    getRules() {
      return Array.from(rules.entries()).map(([name, rule]) => ({
        name,
        type: rule.type,
        severity: rule.severity,
        message: rule.message
      }));
    },

    // Remove a rule
    removeRule(name) {
      rules.delete(name);
      return this;
    }
  };
}

export {
  createTemplate,
  createMessageTemplate,
  prompt,
  streamPrompt,
  pipe,
  withRetry,
  withJsonOutput,
  createCompositionBuilder,
  createEnhancedTokenCounter,
  createEnhancedCache,
  createAdvancedTemplate,
  createProgressTracker,
  createCache,
  parallel,
  branch,
  retry,
  catchError,
  enhancedPrompt,
  checkModelCapabilities,
  createModel,
  formatMessages,
  createAdvancedCache,
  enhancedStreamPrompt,
  createStreamProcessor,
  createTokenCounter,
  createModelManager,
  createPerformanceMonitor,
  createTemplateSystem,
};
