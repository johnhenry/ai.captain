/**
 * Session management for window.ai
 * @module session
 */

import { DistributedCache } from '../caching/distributed.mjs';
import { CacheCompression } from '../caching/compression.mjs';
import { TemplateSystem } from '../templates/system.mjs';
import { FallbackSystem } from '../monitoring/fallback.mjs';
import { PerformanceAnalytics } from '../monitoring/analytics.mjs';

// Determine if running in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * @typedef {Object} SessionOptions
 * @property {Object} [cache] - Cache configuration
 * @property {boolean} [cache.enabled] - Enable caching
 * @property {number} [cache.ttl] - Cache TTL in milliseconds
 * @property {Object} [cache.compression] - Compression options
 * @property {('lz'|'deflate')} [cache.compression.algorithm] - Compression algorithm
 * @property {('fast'|'default'|'max')} [cache.compression.level] - Compression level
 * @property {number} [cache.compression.threshold] - Compression threshold in bytes
 * @property {Object} [fallback] - Fallback configuration
 * @property {Function} [fallback.onFallback] - Fallback callback
 */

/**
 * @typedef {Object} PromptOptions
 * @property {string} [model] - Model name
 * @property {number} [temperature] - Temperature (0-1)
 * @property {number} [maxTokens] - Maximum tokens
 * @property {boolean} [cache] - Enable/disable caching for this request
 */

/**
 * Generate a cache key from input text and options
 * @private
 * @param {string} text - Input text
 * @param {PromptOptions} [options] - Prompt options
 * @returns {string} Cache key
 */
function generateCacheKey(text, options = {}) {
  // Create a string that includes both text and relevant options
  const keyString = JSON.stringify({
    text,
    // Only include options that affect the response
    model: options.model,
    temperature: options.temperature,
    maxTokens: options.maxTokens
  });

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    const char = keyString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `prompt_${hash}`;
}

/**
 * Create a new window.ai session
 * @param {SessionOptions} [options] - Configuration options
 * @returns {Promise<Object>} window.ai session
 * @throws {Error} If window.ai API is not available
 */
export async function createSession(options = {}) {
  // Use window.ai if available, otherwise use the mock implementation
  const ai = isBrowser ? window.ai : globalThis.ai;

  if (!ai) {
    throw new Error('window.ai API not available');
  }

  const session = await ai.languageModel.create(options);
  return session;
}

/**
 * Destroy a window.ai session
 * @param {Object} session - window.ai session
 * @returns {Promise<void>}
 */
export async function destroySession(session) {
  await session.destroy();
}

/**
 * A class representing a window.ai session with caching and template support
 */
export class Session {
  /** @type {Object} */ #session;
  /** @type {DistributedCache} */ #cache;
  /** @type {CacheCompression} */ #compression;
  /** @type {boolean} */ #cacheEnabled;
  /** @type {number} */ #cacheTTL;
  /** @type {TemplateSystem} */ #templates;
  /** @type {FallbackSystem} */ #fallback;
  /** @type {PerformanceAnalytics} */ #analytics;

  /** @returns {TemplateSystem} Template system instance */
  get templates() {
    return this.#templates;
  }

  /**
   * Create a new Session instance
   * @param {Object} session - window.ai session
   * @param {SessionOptions} [options] - Configuration options
   */
  constructor(session, options = {}) {
    this.#session = session;
    this.#cacheEnabled = options.cache?.enabled ?? false;
    this.#cacheTTL = options.cache?.ttl ?? 3600000; // 1 hour default
    
    // Initialize analytics
    this.#analytics = new PerformanceAnalytics();

    // Initialize caching system
    if (this.#cacheEnabled) {
      this.#cache = new DistributedCache({
        defaultTTL: this.#cacheTTL
      });
      this.#compression = new CacheCompression({
        algorithm: options.cache?.compression?.algorithm || 'lz',
        level: options.cache?.compression?.level || 'default',
        threshold: options.cache?.compression?.threshold || 1024
      });
    }

    // Initialize template system
    this.#templates = new TemplateSystem(this);

    // Initialize fallback system with template support
    this.#fallback = new FallbackSystem(this, {
      ...options.fallback,
      onFallback: (strategy, error) => {
        this.#analytics.record(`fallback_${strategy}`, 1);
        // Use fallback template if available
        const templateName = `fallback_${strategy}`;
        return this.#templates.apply(templateName, {
          error: error.message,
          strategy
        }).catch(() => {
          // If no template exists, use default error handling
          return `Error: ${error.message}. Using fallback strategy: ${strategy}`;
        });
      }
    });

    // Register default fallback templates
    this.registerTemplate('fallback_retry', 'Retrying due to error: {error}');
    this.registerTemplate('fallback_alternate', 'Using alternate model due to: {error}');
    this.registerTemplate('fallback_degrade', 'Using simplified mode due to: {error}');
  }

  /**
   * Create a new Session instance
   * @param {SessionOptions} [options] - Configuration options
   * @returns {Promise<Session>} New session instance
   */
  static async create(options = {}) {
    const session = await createSession(options);
    return new Session(session, options);
  }

  /**
   * Register a new template
   * @param {string} name - Template name
   * @param {string} content - Template content
   * @param {Object} [defaults={}] - Default values for template variables
   */
  registerTemplate(name, content, defaults = {}) {
    this.#templates.register(name, content, defaults);
  }

  /**
   * Create a new template that inherits from a parent template
   * @param {string} name - New template name
   * @param {string} parentName - Parent template name
   * @param {Object} [defaults={}] - Default values for template variables
   */
  inheritTemplate(name, parentName, defaults = {}) {
    this.#templates.inherit(name, parentName, defaults);
  }

  /**
   * Process input text, handling template arrays if provided
   * @private
   * @param {string|Array} input - Input text or template array
   * @returns {Promise<string>} Processed text
   * @throws {Error} If template array is empty
   */
  async #processInput(input) {
    if (Array.isArray(input)) {
      if (input.length === 0) {
        throw new Error('Template array cannot be empty');
      }
      const [templateName, variables] = input;
      return this.#templates.apply(templateName, variables);
    }
    return input;
  }

  /**
   * Send a prompt to the window.ai session
   * @param {string|Array} text - Prompt text or template array
   * @param {PromptOptions} [options] - Configuration options
   * @returns {Promise<string>} Response from window.ai
   * @throws {Error} If prompt fails
   */
  async prompt(text, options = {}) {
    const startTime = Date.now();
    const processedText = await this.#processInput(text);

    try {
      // Check if caching is enabled and not explicitly disabled for this request
      if (this.#cacheEnabled && options.cache !== false) {
        const cacheKey = generateCacheKey(processedText, options);
        
        // Try to get from cache
        const cachedResponse = await this.#cache.get(cacheKey);
        if (cachedResponse) {
          this.#analytics.record('cache_hit', 1);
          this.#analytics.record('cache_latency', Date.now() - startTime);
          // Decompress if necessary
          return this.#compression.decompress(cachedResponse);
        }
        this.#analytics.record('cache_miss', 1);

        // If not in cache, get from API with fallback support
        const response = await this.#fallback.execute(async () => {
          const result = await this.#session.prompt(processedText, options);
          this.#analytics.record('prompt_latency', Date.now() - startTime);
          return result;
        }, { input: processedText });
        
        // Cache the response
        const compressed = await this.#compression.compress(response);
        await this.#cache.set(cacheKey, compressed, this.#cacheTTL);
        
        return response;
      }

      // If caching is disabled, just forward to the session with fallback support
      return await this.#fallback.execute(async () => {
        const result = await this.#session.prompt(processedText, options);
        this.#analytics.record('prompt_latency', Date.now() - startTime);
        return result;
      }, { input: processedText });

    } catch (error) {
      this.#analytics.record('error', 1);
      throw error;
    }
  }

  /**
   * Send a prompt to the window.ai session and receive a streaming response
   * @param {string|Array} text - Prompt text or template array
   * @param {PromptOptions} [options] - Configuration options
   * @returns {Promise<ReadableStream>} ReadableStream of responses from window.ai
   * @throws {Error} If prompt fails
   */
  async promptStreaming(text, options = {}) {
    const startTime = Date.now();
    const processedText = await this.#processInput(text);

    try {
      // Check if caching is enabled and not explicitly disabled for this request
      if (this.#cacheEnabled && options.cache !== false) {
        const cacheKey = generateCacheKey(processedText, options);
        
        // Try to get from cache
        const cachedResponse = await this.#cache.get(cacheKey);
        if (cachedResponse) {
          this.#analytics.record('cache_hit', 1);
          this.#analytics.record('cache_latency', Date.now() - startTime);
          // Decompress if necessary
          const decompressed = await this.#compression.decompress(cachedResponse);
          
          // Convert cached response to a stream
          return new ReadableStream({
            start(controller) {
              controller.enqueue(decompressed);
              controller.close();
            }
          });
        }
        this.#analytics.record('cache_miss', 1);

        // If not in cache, get from API with fallback support
        const response = await this.#fallback.execute(async () => {
          return await this.#session.promptStreaming(processedText, options);
        }, { input: processedText });
        
        // Create a new stream that will both yield chunks and collect them
        let fullResponse = '';
        const compression = this.#compression;
        const cache = this.#cache;
        const cacheTTL = this.#cacheTTL;
        const analytics = this.#analytics;

        const transformStream = new TransformStream({
          transform(chunk, controller) {
            fullResponse += chunk;
            controller.enqueue(chunk);
          },
          async flush() {
            // Cache the complete response
            const compressed = await compression.compress(fullResponse);
            await cache.set(cacheKey, compressed, cacheTTL);
            analytics.record('prompt_latency', Date.now() - startTime);
          }
        });

        return response.pipeThrough(transformStream);
      }

      // If caching is disabled, just forward to the session with fallback support
      return await this.#fallback.execute(async () => {
        const response = await this.#session.promptStreaming(processedText, options);
        this.#analytics.record('prompt_latency', Date.now() - startTime);
        return response;
      }, { input: processedText });

    } catch (error) {
      this.#analytics.record('error', 1);
      throw error;
    }
  }

  /**
   * Add a fallback session
   * @param {string} name - Session name
   * @param {Object} session - Session instance
   */
  addFallback(name, session) {
    this.#fallback.addFallback(name, session);
  }

  /**
   * Remove a fallback session
   * @param {string} name - Session name
   */
  removeFallback(name) {
    this.#fallback.removeFallback(name);
  }

  /**
   * Clone the current session
   * @param {SessionOptions} [options] - Configuration options
   * @returns {Promise<Session>} Cloned session
   */
  async clone(options = {}) {
    const clonedSession = await this.#session.clone(options);
    return new Session(clonedSession, {
      cache: {
        enabled: this.#cacheEnabled,
        ttl: this.#cacheTTL,
        compression: this.#compression?.options
      },
      ...options
    });
  }

  /**
   * Destroy the session
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.#cacheEnabled) {
      await this.#cache.clear();
    }
    if (this.#fallback) {
      this.#fallback.destroy();
    }
    await destroySession(this.#session);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    if (!this.#cacheEnabled) {
      return { enabled: false };
    }

    return {
      enabled: true,
      ...this.#cache.getStats(),
      analytics: {
        hits: this.#analytics.getStats('cache_hit'),
        misses: this.#analytics.getStats('cache_miss'),
        latency: this.#analytics.getStats('cache_latency')
      }
    };
  }

  /**
   * Get fallback statistics
   * @returns {Object} Fallback statistics
   */
  getFallbackStats() {
    return {
      health: this.#fallback.getHealthStatus(),
      analytics: {
        retry: this.#analytics.getStats('fallback_retry'),
        alternate: this.#analytics.getStats('fallback_alternate'),
        degrade: this.#analytics.getStats('fallback_degrade')
      }
    };
  }

  /**
   * Get all analytics
   * @returns {Object} All analytics
   */
  getAnalytics() {
    return this.#analytics.getAllStats();
  }

  /**
   * Get the number of tokens used so far in the session
   * @returns {number} Number of tokens used
   */
  get tokensSoFar() {
    return this.#session.tokensSoFar;
  }

  /**
   * Get the maximum number of tokens allowed in the session
   * @returns {number} Maximum number of tokens
   */
  get maxTokens() {
    return this.#session.maxTokens;
  }

  /**
   * Get the number of tokens left in the session
   * @returns {number} Number of tokens left
   */
  get tokensLeft() {
    return this.#session.tokensLeft;
  }
  set overrideTemplates (templates){
    this.#templates = templates;
  }
}
