/**
 * Advanced composition pattern builder
 */
export class CompositionBuilder {
  constructor(session) {
    this.session = session;
    this.steps = [];
    this.errorHandlers = new Map();
    this.middleware = [];
    
    // Cache configuration
    this.cacheConfig = {
      enabled: false,
      ttl: 3600000, // 1 hour default
      keyPrefix: 'builder'
    };

    // Fallback configuration
    this.fallbackConfig = {
      enabled: false,
      strategies: ['retry', 'alternate', 'degrade'],
      maxAttempts: 3,
      timeout: 10000
    };

    // Template configuration
    this.templateConfig = {
      enabled: false,
      defaults: {},
      schemas: {}
    };
  }

  /**
   * Configure caching
   * @param {Object} config Cache configuration
   * @returns {CompositionBuilder} Builder instance
   */
  configureCaching(config = {}) {
    this.cacheConfig = {
      ...this.cacheConfig,
      ...config
    };
    return this;
  }

  /**
   * Configure fallback
   * @param {Object} config Fallback configuration
   * @returns {CompositionBuilder} Builder instance
   */
  configureFallback(config = {}) {
    this.fallbackConfig = {
      ...this.fallbackConfig,
      ...config
    };
    return this;
  }

  /**
   * Configure templates
   * @param {Object} config Template configuration
   * @returns {CompositionBuilder} Builder instance
   */
  configureTemplates(config = {}) {
    this.templateConfig = {
      ...this.templateConfig,
      ...config
    };
    return this;
  }

  /**
   * Generate cache key for a step
   * @private
   */
  _generateCacheKey(step, args) {
    if (step.cache?.key) {
      return typeof step.cache.key === 'function'
        ? step.cache.key(...args)
        : step.cache.key;
    }

    // Create a string that includes step type and arguments
    const keyString = JSON.stringify({
      type: step.type,
      args
    });

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `${step.cache?.keyPrefix || this.cacheConfig.keyPrefix}_${hash}`;
  }

  /**
   * Process step input with template if enabled
   * @private
   */
  async _processStepInput(step, args) {
    if (step.template?.enabled && step.template?.name) {
      const variables = {
        ...this.templateConfig.defaults,
        ...step.template.defaults,
        ...step.template.variables,
        args // Make original arguments available to template
      };

      return await this.session.prompt([step.template.name, variables], {
        cache: false // Use step-level caching instead
      });
    }
    return args;
  }

  /**
   * Add a processing step
   * @param {Function} fn Processing function
   * @param {Object} options Step options
   * @returns {CompositionBuilder} Builder instance
   */
  pipe(fn, options = {}) {
    this.steps.push({
      type: 'pipe',
      fn,
      cache: {
        enabled: options.cache?.enabled ?? this.cacheConfig.enabled,
        ttl: options.cache?.ttl ?? this.cacheConfig.ttl,
        key: options.cache?.key,
        keyPrefix: options.cache?.keyPrefix
      },
      fallback: {
        enabled: options.fallback?.enabled ?? this.fallbackConfig.enabled,
        strategies: options.fallback?.strategies ?? this.fallbackConfig.strategies,
        maxAttempts: options.fallback?.maxAttempts ?? this.fallbackConfig.maxAttempts,
        timeout: options.fallback?.timeout ?? this.fallbackConfig.timeout,
        templates: options.fallback?.templates
      },
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
   * Add a conditional branch
   * @param {Function} condition Condition function
   * @param {Function} ifTrue Function to execute if condition is true
   * @param {Function} ifFalse Function to execute if condition is false
   * @param {Object} options Step options
   * @returns {CompositionBuilder} Builder instance
   */
  branch(condition, ifTrue, ifFalse, options = {}) {
    this.steps.push({
      type: 'branch',
      condition,
      ifTrue,
      ifFalse,
      cache: {
        enabled: options.cache?.enabled ?? this.cacheConfig.enabled,
        ttl: options.cache?.ttl ?? this.cacheConfig.ttl,
        key: options.cache?.key,
        keyPrefix: options.cache?.keyPrefix
      },
      fallback: {
        enabled: options.fallback?.enabled ?? this.fallbackConfig.enabled,
        strategies: options.fallback?.strategies ?? this.fallbackConfig.strategies,
        maxAttempts: options.fallback?.maxAttempts ?? this.fallbackConfig.maxAttempts,
        timeout: options.fallback?.timeout ?? this.fallbackConfig.timeout,
        templates: options.fallback?.templates
      },
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
   * Add parallel processing
   * @param {Function[]} fns Functions to execute in parallel
   * @param {Object} options Step options
   * @returns {CompositionBuilder} Builder instance
   */
  parallel(fns, options = {}) {
    this.steps.push({
      type: 'parallel',
      fns,
      cache: {
        enabled: options.cache?.enabled ?? this.cacheConfig.enabled,
        ttl: options.cache?.ttl ?? this.cacheConfig.ttl,
        key: options.cache?.key,
        keyPrefix: options.cache?.keyPrefix
      },
      fallback: {
        enabled: options.fallback?.enabled ?? this.fallbackConfig.enabled,
        strategies: options.fallback?.strategies ?? this.fallbackConfig.strategies,
        maxAttempts: options.fallback?.maxAttempts ?? this.fallbackConfig.maxAttempts,
        timeout: options.fallback?.timeout ?? this.fallbackConfig.timeout,
        templates: options.fallback?.templates
      },
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
   * Add retry logic
   * @param {Object} options Retry options
   * @returns {CompositionBuilder} Builder instance
   */
  retry(options = {}) {
    const lastStep = this.steps[this.steps.length - 1];
    if (!lastStep) return this;

    lastStep.retry = {
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay || 1000,
      backoff: options.backoff || 'exponential',
      condition: options.condition || (error => true)
    };
    return this;
  }

  /**
   * Add timeout
   * @param {number} ms Timeout in milliseconds
   * @returns {CompositionBuilder} Builder instance
   */
  timeout(ms) {
    const lastStep = this.steps[this.steps.length - 1];
    if (!lastStep) return this;

    lastStep.timeout = ms;
    return this;
  }

  /**
   * Add error handler
   * @param {Function} handler Error handler function
   * @returns {CompositionBuilder} Builder instance
   */
  catch(handler) {
    const lastStep = this.steps[this.steps.length - 1];
    if (!lastStep) return this;

    this.errorHandlers.set(this.steps.length - 1, handler);
    return this;
  }

  /**
   * Add middleware
   * @param {Function} fn Middleware function
   * @returns {CompositionBuilder} Builder instance
   */
  use(fn) {
    this.middleware.push(fn);
    return this;
  }

  /**
   * Build the composition
   * @returns {Function} Composed function
   */
  build() {
    return async (...args) => {
      let result = args;

      // Apply middleware
      for (const middleware of this.middleware) {
        result = await middleware(result);
      }

      // Execute steps
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        try {
          result = await this._executeStep(step, result);
        } catch (error) {
          const handler = this.errorHandlers.get(i);
          if (handler) {
            result = await handler(error, result);
          } else {
            throw error;
          }
        }
      }

      return result;
    };
  }

  /**
   * Execute a single step
   * @private
   */
  async _executeStep(step, args) {
    // Create execution function
    const execute = async () => {
      // Process input with template if enabled
      const processedArgs = await this._processStepInput(step, args);

      // Check if step has caching enabled
      if (step.cache?.enabled) {
        const cacheKey = this._generateCacheKey(step, processedArgs);
        
        // Try to get from cache
        try {
          const cachedResult = await this.session.prompt(['get_cache', cacheKey], {
            cache: false // Disable caching for cache operations
          });

          if (cachedResult !== null) {
            return cachedResult;
          }
        } catch (error) {
          // Continue with execution if cache retrieval fails
        }
      }

      // Execute step
      let result;
      switch (step.type) {
        case 'pipe':
          result = await step.fn(...processedArgs);
          break;
        
        case 'branch':
          const condition = await step.condition(...processedArgs);
          result = await (condition ? step.ifTrue : step.ifFalse)(...processedArgs);
          break;
        
        case 'parallel':
          result = await Promise.all(step.fns.map(fn => fn(...processedArgs)));
          break;
        
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Cache result if enabled
      if (step.cache?.enabled) {
        const cacheKey = this._generateCacheKey(step, processedArgs);
        try {
          await this.session.prompt(
            ['set_cache', cacheKey, result, step.cache.ttl],
            { cache: false } // Disable caching for cache operations
          );
        } catch (error) {
          // Continue if cache storage fails
        }
      }

      return result;
    };

    // Apply fallback if enabled
    if (step.fallback?.enabled) {
      // Register step-specific fallback templates if provided
      if (step.fallback.templates) {
        for (const [strategy, template] of Object.entries(step.fallback.templates)) {
          this.session.registerTemplate(`fallback_${strategy}_${step.type}`, template);
        }
      }

      return await this.session.prompt(['execute_with_fallback', execute, {
        maxAttempts: step.fallback.maxAttempts,
        timeout: step.fallback.timeout,
        fallbackStrategies: step.fallback.strategies
      }], {
        cache: false // Disable caching for fallback operations
      });
    }

    // Apply timeout if specified
    if (step.timeout) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Step timeout')), step.timeout);
      });
      return await Promise.race([execute(), timeoutPromise]);
    }

    // Apply retry if specified
    if (step.retry) {
      let lastError;
      for (let attempt = 1; attempt <= step.retry.maxAttempts; attempt++) {
        try {
          return await execute();
        } catch (error) {
          lastError = error;
          if (!step.retry.condition(error) || attempt === step.retry.maxAttempts) {
            throw error;
          }
          const delay = step.retry.backoff === 'exponential'
            ? step.retry.delay * Math.pow(2, attempt - 1)
            : step.retry.delay;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw lastError;
    }

    return await execute();
  }

  /**
   * Create a new composition chain
   * @param {Function} fn Initial function
   * @param {Object} options Chain options
   * @returns {CompositionBuilder} New builder instance
   */
  static chain(fn, options = {}) {
    const builder = new CompositionBuilder();
    if (options.cache) {
      builder.configureCaching(options.cache);
    }
    if (options.fallback) {
      builder.configureFallback(options.fallback);
    }
    if (options.template) {
      builder.configureTemplates(options.template);
    }
    return builder.pipe(fn);
  }

  /**
   * Clear cache for the entire builder
   * @returns {Promise<void>}
   */
  async clearCache() {
    await this.session.prompt(
      ['clear_cache', this.cacheConfig.keyPrefix],
      { cache: false }
    );
  }
}
