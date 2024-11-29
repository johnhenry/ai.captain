// Message types and base classes
class BaseMessage {
  constructor(content, additionalKwargs = {}) {
    this.content = content;
    this.additional_kwargs = additionalKwargs;
  }
}

class AIMessage extends BaseMessage {
  constructor(content, metadata = {}) {
    super(content);
    this.response_metadata = metadata.response_metadata || {};
    this.usage_metadata = metadata.usage_metadata || {};
  }
}

class HumanMessage extends BaseMessage {
  constructor(content, additionalKwargs = {}) {
    super(content, additionalKwargs);
  }
}

class SystemMessage extends BaseMessage {
  constructor(content, additionalKwargs = {}) {
    super(content, additionalKwargs);
  }
}
class ChainError extends Error {
  constructor(message, type, cause) {
    super(message);
    this.name = "ChainError";
    this.type = type;
    this.cause = cause;
  }
}

// Utility for token tracking and formatting
class TokenTracker {
  constructor(maxTokens) {
    this.maxTokens = maxTokens;
    this.usedTokens = 0;
  }

  track(tokens) {
    this.usedTokens += tokens;
    return this.usedTokens;
  }

  remaining() {
    return this.maxTokens - this.usedTokens;
  }

  exceedsLimit(additionalTokens) {
    return this.usedTokens + additionalTokens > this.maxTokens;
  }
}

// Variable formatter and validator
class TemplateVariable {
  constructor(name, options = {}) {
    this.name = name;
    this.required = options.required ?? true;
    this.default = options.default;
    this.validator = options.validator;
    this.formatter = options.formatter;
  }

  process(value) {
    if (value === undefined) {
      if (this.required && this.default === undefined) {
        throw new ChainError(
          `Missing required variable: ${this.name}`,
          "VALIDATION_ERROR"
        );
      }
      value = this.default;
    }

    if (this.validator && !this.validator(value)) {
      throw new ChainError(
        `Invalid value for ${this.name}`,
        "VALIDATION_ERROR"
      );
    }

    return this.formatter ? this.formatter(value) : value;
  }
}

// Enhanced ChatPromptTemplate with variable processing
class ChatPromptTemplate {
  constructor(messages, variables = {}) {
    this.messages = messages;
    this.variables = Object.fromEntries(
      Object.entries(variables).map(([name, options]) => [
        name,
        new TemplateVariable(name, options),
      ])
    );
  }

  static fromMessages(messages, variables = {}) {
    return new ChatPromptTemplate(messages, variables);
  }

  format(values) {
    const processedValues = {};
    for (const [name, variable] of Object.entries(this.variables)) {
      processedValues[name] = variable.process(values[name]);
    }

    return this.messages.map(([role, content]) => {
      const formattedContent = Object.entries(processedValues).reduce(
        (acc, [key, value]) => acc.replace(`{${key}}`, value),
        content
      );
      return { role, content: formattedContent };
    });
  }

  pipe(chain) {
    return {
      invoke: async (inputs, options) =>
        chain.invoke(this.format(inputs), options),
    };
  }
}

// Base Chain with enhanced error handling and retries
class BaseChain {
  constructor(config = {}) {
    this.config = {
      temperature: config.temperature,
      topK: config.topK,
      maxTokens: config.maxTokens,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      signal: config.signal,
      onProgress: config.onProgress,
      format: config.format,
      systemPrompt: config.systemPrompt,
      initialMessages: config.initialMessages,
    };
    this.model = null;
    this.tokenTracker = null;
  }

  async retry(fn, retries = this.config.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.retryDelay * (i + 1))
        );
      }
    }
  }

  async initialize() {
    try {
      if (!window.ai) {
        throw new ChainError("window.ai not available", "MODULE_ERROR");
      }
      const capabilities = await window.ai.languageModel.capabilities();

      if (capabilities.available === "no") {
        throw new ChainError(
          "Language model is not available",
          "AVAILABILITY_ERROR"
        );
      }

      const modelConfig = {
        temperature: this.config.temperature ?? capabilities.defaultTemperature,
        topK: this.config.topK ?? capabilities.defaultTopK,
        format: this.config.format,
      };

      if (capabilities.available === "after-download") {
        modelConfig.monitor = (m) => {
          m.addEventListener("downloadprogress", (e) => {
            if (this.config.onProgress) {
              this.config.onProgress({
                type: "download",
                loaded: e.loaded,
                total: e.total,
              });
            }
          });
        };
      }

      this.model = await window.ai.languageModel.create(modelConfig);
      this.tokenTracker = new TokenTracker(this.model.maxTokens);
      return this;
    } catch (error) {
      throw new ChainError(
        "Failed to initialize model",
        "INITIALIZATION_ERROR",
        error
      );
    }
  }

  async getModelInfo() {
    if (!this.model) {
      await this.initialize();
    }
    return {
      tokensSoFar: this.model.tokensSoFar,
      maxTokens: this.model.maxTokens,
      tokensLeft: this.model.tokensLeft,
      usedTokens: this.tokenTracker.usedTokens,
    };
  }

  destroy() {
    if (this.model) {
      this.model.destroy();
      this.model = null;
      this.tokenTracker = null;
    }
  }
}

// Enhanced LLM Chain with streaming and structured output support
class LLMChain extends BaseChain {
  constructor(config = {}) {
    super(config);
    this.promptTemplate = config.promptTemplate;
  }

  async invoke(inputs, options = {}) {
    if (!this.model) {
      await this.initialize();
    }

    let messageContent;
    if (typeof inputs === "string") {
      messageContent = inputs;
    } else if (Array.isArray(inputs)) {
      messageContent = inputs
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");
    } else if (this.promptTemplate) {
      const formattedMessages = this.promptTemplate.format(inputs);
      messageContent = formattedMessages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");
    } else {
      throw new ChainError(
        "No prompt template provided and inputs is not a string or array of messages",
        "INVALID_INPUT_ERROR"
      );
    }

    if (this.tokenTracker.exceedsLimit(messageContent.length / 4)) {
      // Rough token estimate
      throw new ChainError("Token limit exceeded", "TOKEN_LIMIT_ERROR");
    }

    try {
      if (options.streaming) {
        return this._invokeStreaming(messageContent, options);
      }

      const response = await this.retry(async () => {
        return await this.model.prompt(messageContent, {
          signal: options.signal,
          ...(this.config.format === "json"
            ? { outputSchema: options.outputSchema }
            : {}),
        });
      });

      const modelInfo = await this.getModelInfo();
      let content = response;
      let structuredOutput = null;

      if (this.config.format === "json") {
        try {
          structuredOutput = JSON.parse(response);
          content = response; // Keep raw JSON as content
        } catch (error) {
          throw new ChainError(
            "Failed to parse JSON response",
            "JSON_PARSE_ERROR",
            error
          );
        }
      }

      return new AIMessage(content, {
        response_metadata: {
          created_at: new Date().toISOString(),
          tokensSoFar: modelInfo.tokensSoFar,
          maxTokens: modelInfo.maxTokens,
          tokensLeft: modelInfo.tokensLeft,
          structuredOutput,
        },
      });
    } catch (error) {
      if (error instanceof ChainError) throw error;
      throw new ChainError("Chain execution failed", "EXECUTION_ERROR", error);
    }
  }

  async *_invokeStreaming(messageContent, options = {}) {
    if (!this.model) {
      await this.initialize();
    }

    try {
      const stream = await this.model.promptStreaming(messageContent, {
        signal: options.signal,
      });

      let previousChunk = "";
      let totalChunks = 0;

      for await (const chunk of stream) {
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length)
          : chunk;

        if (this.config.onProgress) {
          this.config.onProgress({
            type: "chunk",
            chunk: newChunk,
            chunkNumber: ++totalChunks,
          });
        }

        yield newChunk;
        previousChunk = chunk;

        // Rough token estimation for tracking
        this.tokenTracker.track(newChunk.length / 4);
      }
    } catch (error) {
      throw new ChainError("Streaming failed", "STREAMING_ERROR", error);
    }
  }

  async clone(config = {}) {
    try {
      const clonedModel = await this.model.clone({
        signal: config.signal,
      });

      return new LLMChain({
        ...this.config,
        ...config,
        promptTemplate: this.promptTemplate,
      });
    } catch (error) {
      throw new ChainError("Failed to clone chain", "CLONE_ERROR", error);
    }
  }

  // Structured output helper
  withStructuredOutput(schema) {
    return new LLMChain({
      ...this.config,
      format: "json",
      promptTemplate: this.promptTemplate,
      outputSchema: schema,
    });
  }
}

export {
  BaseMessage,
  AIMessage,
  HumanMessage,
  SystemMessage,
  BaseChain,
  ChatPromptTemplate,
  LLMChain,
  ChainError,
  TemplateVariable,
};
