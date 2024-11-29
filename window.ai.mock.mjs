// Mock implementation of window.ai API

// Constants for the mock implementation
const MOCK_MAX_TOKENS = 4096;
const MOCK_PER_PROMPT_LIMIT = 1024;
const MOCK_CAPABILITIES = {
  available: 'readily',
  defaultTopK: 3,
  maxTopK: 8,
  defaultTemperature: 1.0
};

// Mock session class implementing AILanguageModelSession
class MockAILanguageModelSession {
  #destroyed = false;
  #tokensSoFar = 0;
  #systemPrompt = '';
  #conversationHistory = [];
  #temperature;
  #topK;
  #signal;

  constructor(options = {}) {
    this.#systemPrompt = options.systemPrompt || '';
    this.#temperature = options.temperature ?? MOCK_CAPABILITIES.defaultTemperature;
    this.#topK = options.topK ?? MOCK_CAPABILITIES.defaultTopK;
    this.#signal = options.signal;

    // Initialize conversation history with initial prompts if provided
    if (options.initialPrompts) {
      this.#conversationHistory = [...options.initialPrompts];
    }

    // Add system prompt to history if provided
    if (this.#systemPrompt) {
      this.#conversationHistory.unshift({
        role: 'system',
        content: this.#systemPrompt
      });
    }
  }

  get tokensSoFar() {
    return this.#tokensSoFar;
  }

  get maxTokens() {
    return MOCK_MAX_TOKENS;
  }

  get tokensLeft() {
    return this.maxTokens - this.tokensSoFar;
  }

  #checkDestroyed() {
    if (this.#destroyed) {
      throw new Error('Session has been destroyed');
    }
  }

  #checkSignal(signal) {
    if (signal?.aborted) {
      throw new DOMException('Operation was aborted', 'AbortError');
    }
  }

  #mockResponse(prompt) {
    // Simple mock response generation
    const responses = {
      'Tell me a joke': "Why don't scientists trust atoms? Because they make up everything!",
      'What is the capital of Italy?': 'The capital of Italy is Rome.',
      'Write me a poem!': 'Roses are red\nViolets are blue\nThis is a mock\nJust testing with you!',
      'default': "I'm a mock AI assistant. I understand your prompt was: " + prompt
    };

    return responses[prompt] || responses.default;
  }

  async prompt(text, options = {}) {
    this.#checkDestroyed();
    this.#checkSignal(options.signal);
    this.#checkSignal(this.#signal);

    // Simulate token counting
    const promptTokens = Math.ceil(text.length / 4);
    if (promptTokens > MOCK_PER_PROMPT_LIMIT) {
      throw new Error('Prompt exceeds token limit');
    }

    this.#tokensSoFar += promptTokens;
    if (this.#tokensSoFar > this.maxTokens) {
      throw new Error('Session token limit exceeded');
    }

    // Add user prompt to history
    this.#conversationHistory.push({
      role: 'user',
      content: text
    });

    // Generate response
    const response = this.#mockResponse(text);

    // Add response to history
    this.#conversationHistory.push({
      role: 'assistant',
      content: response
    });

    return response;
  }

  async *#generateStreamingResponse(text, options) {
    const response = this.#mockResponse(text);
    const chunks = response.split(' ');

    for (let i = 0; i < chunks.length; i++) {
      // Check for signal abort before yielding each chunk
      if (options.signal?.aborted || this.#signal?.aborted) {
        return; // Stop the generator if signal is aborted
      }

      const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
      yield chunk;
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async promptStreaming(text, options = {}) {
    this.#checkDestroyed();

    const promptTokens = Math.ceil(text.length / 4);
    if (promptTokens > MOCK_PER_PROMPT_LIMIT) {
      throw new Error('Prompt exceeds token limit');
    }

    this.#tokensSoFar += promptTokens;
    if (this.#tokensSoFar > this.maxTokens) {
      throw new Error('Session token limit exceeded');
    }

    // Add user prompt to history
    this.#conversationHistory.push({
      role: 'user',
      content: text
    });

    // Return a promise that resolves with the stream or rejects with an AbortError
    return new Promise((resolve, reject) => {
      const self = this;
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const generator = self.#generateStreamingResponse(text, options);
            let fullResponse = '';

            for await (const chunk of generator) {
              controller.enqueue(chunk);
              fullResponse += chunk;
            }

            // Add complete response to history
            self.#conversationHistory.push({
              role: 'assistant',
              content: fullResponse
            });

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
        cancel(reason) {
          if (reason instanceof DOMException && reason.name === 'AbortError') {
            reject(reason); // Reject the promise with the AbortError
          } else {
            reject(new Error('Stream cancelled'));
          }
        }
      });

      // If the signal is already aborted, reject the promise immediately
      if (options.signal?.aborted || this.#signal?.aborted) {
        reject(new DOMException('Operation was aborted', 'AbortError'));
      } else {
        resolve(stream);
      }
    });
  }

  async clone(options = {}) {
    this.#checkDestroyed();

    return new MockAILanguageModelSession({
      systemPrompt: this.#systemPrompt,
      temperature: this.#temperature,
      topK: this.#topK,
      signal: options.signal
    });
  }

  destroy() {
    this.#destroyed = true;
    this.#conversationHistory = [];
  }
}

// Mock implementation of window.ai.languageModel namespace
const mockLanguageModel = {
  async capabilities() {
    return { ...MOCK_CAPABILITIES };
  },

  async create(options = {}) {
    // Simulate download progress if monitor is provided
    if (options.monitor) {
      const monitor = {
        addEventListener: (event, callback) => {
          if (event === 'downloadprogress') {
            // Simulate download progress
            const total = 1000000;
            let loaded = 0;
            const interval = setInterval(() => {
              loaded += 100000;
              callback({ loaded, total });
              if (loaded >= total) {
                clearInterval(interval);
              }
            }, 100);
          }
        }
      };
      options.monitor(monitor);
    }

    return new MockAILanguageModelSession(options);
  }
};

// Export the mock implementation
export const windowAI = {
  languageModel: mockLanguageModel
};

// Attach to window object if in browser environment
if (typeof window !== 'undefined') {
  window.ai = windowAI;
}
