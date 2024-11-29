/**
 * Simple composition chains for Window.ai
 */
export class CompositionChains {
  constructor(session) {
    this.session = session;
  }

  /**
   * Create a new chain
   * @returns {Chain} New chain instance
   */
  create() {
    return new Chain(this.session);
  }
}

/**
 * Chain class for composing operations
 */
class Chain {
  constructor(session) {
    this.session = session;
    this.steps = [];
    this.errorHandlers = [];
    this.validators = [];
  }

  /**
   * Add a step to the chain
   * @param {string} type Step type
   * @param {Object} params Step parameters
   * @returns {Chain} Chain instance for chaining
   */
  addStep(type, params = {}) {
    this.steps.push({ type, params });
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
    switch (step.type) {
      case 'translate':
        return this.session.prompt(
          `Translate "${input}" from ${step.params.from} to ${step.params.to}`
        );
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }
}
