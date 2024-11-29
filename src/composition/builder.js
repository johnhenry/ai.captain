/**
 * Advanced composition pattern builder
 */
export class CompositionBuilder {
  constructor(session) {
    this.session = session;
    this.steps = [];
    this.errorHandlers = new Map();
    this.middleware = [];
  }

  /**
   * Add a processing step
   * @param {Function} fn Processing function
   * @returns {CompositionBuilder} Builder instance
   */
  pipe(fn) {
    this.steps.push({
      type: 'pipe',
      fn
    });
    return this;
  }

  /**
   * Add a conditional branch
   * @param {Function} condition Condition function
   * @param {Function} ifTrue Function to execute if condition is true
   * @param {Function} ifFalse Function to execute if condition is false
   * @returns {CompositionBuilder} Builder instance
   */
  branch(condition, ifTrue, ifFalse) {
    this.steps.push({
      type: 'branch',
      condition,
      ifTrue,
      ifFalse
    });
    return this;
  }

  /**
   * Add parallel processing
   * @param {Function[]} fns Functions to execute in parallel
   * @returns {CompositionBuilder} Builder instance
   */
  parallel(fns) {
    this.steps.push({
      type: 'parallel',
      fns
    });
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
    const execute = async () => {
      switch (step.type) {
        case 'pipe':
          return await step.fn(...args);
        
        case 'branch':
          const condition = await step.condition(...args);
          return await (condition ? step.ifTrue : step.ifFalse)(...args);
        
        case 'parallel':
          return await Promise.all(step.fns.map(fn => fn(...args)));
        
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
    };

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
   * @returns {CompositionBuilder} New builder instance
   */
  static chain(fn) {
    const builder = new CompositionBuilder();
    return builder.pipe(fn);
  }
}
