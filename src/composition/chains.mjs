/**
 * Simple composition chains for window.ai
 */
export class CompositionChains {
  constructor(session) {
    this.session = session;
  }

  /**
   * Create a new chain
   * @param {Object} options Chain options
   * @returns {Chain} New chain instance
   */
  create(options = {}) {
    return new Chain(this.session, options);
  }
  registerTemplate(name, content, options = {}) {
    this.session.registerTemplate(name, content, options);
  }
}

/**
 * Chain class for composing operations
 */
class Chain {
  constructor(session, options = {}) {
    this.session = session;
    this.steps = [];
    this.errorHandlers = [];
    this.validators = [];
    
    // Cache configuration
    this.cacheConfig = {
      enabled: options.cache?.enabled ?? false,
      ttl: options.cache?.ttl,
      keyPrefix: options.cache?.keyPrefix || 'chain'
    };

    // Fallback configuration
    this.fallbackConfig = {
      enabled: options.fallback?.enabled ?? false,
      strategies: options.fallback?.strategies || ['retry', 'alternate', 'degrade'],
      maxAttempts: options.fallback?.maxAttempts || 3,
      timeout: options.fallback?.timeout || 10000
    };

    // Template configuration
    this.templateConfig = {
      enabled: options.template?.enabled ?? false,
      defaults: options.template?.defaults || {},
      schemas: options.template?.schemas || {}
    };
  }

  /**
   * Add a step to the chain
   * @param {string} type Step type
   * @param {Object} params Step parameters
   * @param {Object} options Step options
   * @returns {Chain} Chain instance for chaining
   */
  addStep(type, params = {}, options = {}) {
    this.steps.push({
      type,
      params,
      // Cache configuration
      cache: {
        enabled: options.cache?.enabled ?? this.cacheConfig.enabled,
        ttl: options.cache?.ttl ?? this.cacheConfig.ttl,
        key: options.cache?.key,
        keyPrefix: options.cache?.keyPrefix || `${this.cacheConfig.keyPrefix}_${type}`
      },
      // Fallback configuration
      fallback: {
        enabled: options.fallback?.enabled ?? this.fallbackConfig.enabled,
        strategies: options.fallback?.strategies ?? this.fallbackConfig.strategies,
        maxAttempts: options.fallback?.maxAttempts ?? this.fallbackConfig.maxAttempts,
        timeout: options.fallback?.timeout ?? this.fallbackConfig.timeout,
        templates: options.fallback?.templates
      },
      // Template configuration
      template: {
        enabled: options.template?.enabled ?? this.templateConfig.enabled,
        name: options.template?.name,
        variables: options.template?.variables,
        defaults: options.template?.defaults,
        schema: options.template?.schema
      }
    });

    // Register step template if provided
    if (options.template?.name && options.template?.content) {
      this.session.registerTemplate(
        options.template.name,
        options.template.content,
        {
          defaults: options.template.defaults,
          schema: options.template.schema
        }
      );
    }

    return this;
  }

  /**
   * Add error handler
   * @param {Function} handler Error handler function
   * @returns {Chain} Chain instance for chaining
   */
  onError(handler) {
    this.errorHandlers.push(handler);
    return this;
  }

  /**
   * Add validator
   * @param {Function} validator Validator function
   * @returns {Chain} Chain instance for chaining
   */
  validate(validator) {
    this.validators.push(validator);
    return this;
  }

  /**
   * Generate cache key for a step
   * @private
   */
  _generateCacheKey(step, input) {
    if (step.cache.key) {
      return typeof step.cache.key === 'function'
        ? step.cache.key(input)
        : step.cache.key;
    }

    // Create a string that includes step type, params, and input
    const keyString = JSON.stringify({
      type: step.type,
      params: step.params,
      input
    });

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `${step.cache.keyPrefix}_${hash}`;
  }

  /**
   * Process step input with template if enabled
   * @private
   */
  async _processStepInput(step, input) {
    if (step.template.enabled && step.template.name) {
      const variables = {
        ...this.templateConfig.defaults,
        ...step.template.defaults,
        ...step.template.variables,
        input // Make original input available to template
      };

      return await this.session.prompt([step.template.name, variables], {
        cache: false // Use step-level caching instead
      });
    }
    return input;
  }

  /**
   * Execute the chain
   * @param {string} input Input text
   * @returns {Promise<string>} Chain result
   */
  async execute(input) {
    let result = input;

    try {
      // Execute steps
      for (const step of this.steps) {
        result = await this._executeStep(step, result);
      }

      // Run validators
      for (const validator of this.validators) {
        if (!validator(result)) {
          throw new Error('Validation failed');
        }
      }

      return result;
    } catch (error) {
      // Run error handlers
      for (const handler of this.errorHandlers) {
        try {
          result = await handler(error, () => this.execute(input));
          return result;
        } catch (e) {
          // Continue to next handler
          continue;
        }
      }
      throw error;
    }
  }

  /**
   * Execute a single step
   * @private
   */
  async _executeStep(step, input) {
    // Create execution function
    const execute = async () => {
      // Process input with template if enabled
      const processedInput = await this._processStepInput(step, input);

      // Check if step has caching enabled
      if (step.cache.enabled) {
        const cacheKey = this._generateCacheKey(step, processedInput);
        
        // Try to get from cache
        const cachedResult = await this.session.prompt(['get_cache', cacheKey], {
          cache: false // Disable caching for cache operations
        });

        if (cachedResult !== null) {
          return cachedResult;
        }
      }

      // Execute step
      let result;
      switch (step.type) {
        case 'translate':
          result = await this.session.prompt(
            `Translate "${processedInput}" from ${step.params.from} to ${step.params.to}`,
            { cache: false } // Use step-level caching instead
          );
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Cache result if enabled
      if (step.cache.enabled) {
        const cacheKey = this._generateCacheKey(step, processedInput);
        await this.session.prompt(
          ['set_cache', cacheKey, result, step.cache.ttl],
          { cache: false } // Disable caching for cache operations
        );
      }

      return result;
    };

    // Apply fallback if enabled
    if (step.fallback.enabled) {
      const fallbackOptions = {
        maxAttempts: step.fallback.maxAttempts,
        timeout: step.fallback.timeout,
        fallbackStrategies: step.fallback.strategies
      };

      // If step has custom fallback templates, register them
      if (step.fallback.templates) {
        for (const [strategy, template] of Object.entries(step.fallback.templates)) {
          this.session.registerTemplate(`fallback_${strategy}_${step.type}`, template);
        }
      }

      return await this.session.prompt(['execute_with_fallback', execute, fallbackOptions], {
        cache: false // Disable caching for fallback operations
      });
    }

    // Execute without fallback
    return await execute();
  }

  /**
   * Configure caching for the entire chain
   * @param {Object} config Cache configuration
   * @returns {Chain} Chain instance for chaining
   */
  configureCaching(config = {}) {
    this.cacheConfig = {
      ...this.cacheConfig,
      ...config
    };
    return this;
  }

  /**
   * Configure fallback for the entire chain
   * @param {Object} config Fallback configuration
   * @returns {Chain} Chain instance for chaining
   */
  configureFallback(config = {}) {
    this.fallbackConfig = {
      ...this.fallbackConfig,
      ...config
    };
    return this;
  }

  /**
   * Configure templates for the entire chain
   * @param {Object} config Template configuration
   * @returns {Chain} Chain instance for chaining
   */
  configureTemplates(config = {}) {
    this.templateConfig = {
      ...this.templateConfig,
      ...config
    };
    return this;
  }

  /**
   * Clear cache for the entire chain
   * @returns {Promise<void>}
   */
  async clearCache() {
    await this.session.prompt(
      ['clear_cache', this.cacheConfig.keyPrefix],
      { cache: false }
    );
  }
}
