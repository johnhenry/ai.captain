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
};
