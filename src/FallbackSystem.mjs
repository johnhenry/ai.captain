/**
 * Simple fallback system for handling multiple strategies
 */
export class FallbackSystem {
  constructor() {
    this.handlers = new Map();
  }

  /**
   * Register a fallback handler
   * @param {string} name Handler name
   * @param {Function} handler Async handler function
   */
  register(name, handler) {
    this.handlers.set(name, handler);
  }

  /**
   * Execute handlers with fallback
   * @param {Object} context Execution context
   * @returns {Promise<any>} Result from first successful handler
   */
  async execute(context = {}) {
    const errors = [];

    for (const [name, handler] of this.handlers) {
      try {
        return await handler(context);
      } catch (error) {
        errors.push(`${name}: ${error.message}`);
      }
    }

    throw new Error('All fallbacks failed');
  }
}
