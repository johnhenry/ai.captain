/**
 * Advanced fallback system with model switching and monitoring
 */
export class FallbackSystem {
  constructor(session, options = {}) {
    this.primarySession = session;
    this.options = {
      maxAttempts: options.maxAttempts || 3,
      timeout: options.timeout || 10000,
      fallbackStrategies: options.fallbackStrategies || ['retry', 'alternate', 'degrade'],
      healthCheckInterval: options.healthCheckInterval || 60000,
      ...options
    };

    this.fallbackSessions = new Map();
    this.healthStatus = new Map();
    this.strategyHandlers = new Map();

    this._initializeStrategies();
    this._startHealthCheck();
  }

  /**
   * Initialize fallback strategies
   * @private
   */
  _initializeStrategies() {
    // Retry strategy
    this.strategyHandlers.set('retry', async (input, error) => {
      for (let i = 0; i < this.options.maxAttempts; i++) {
        try {
          return await this.primarySession.prompt(input);
        } catch (e) {
          if (i === this.options.maxAttempts - 1) throw e;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    });

    // Alternate model strategy
    this.strategyHandlers.set('alternate', async (input, error) => {
      const alternateSession = await this._getHealthyFallback();
      if (!alternateSession) {
        throw new Error('No healthy fallback sessions available');
      }
      return await alternateSession.prompt(input);
    });

    // Degraded mode strategy
    this.strategyHandlers.set('degrade', async (input, error) => {
      // Simplify the prompt and try again
      const simplifiedInput = await this._simplifyPrompt(input);
      return await this.primarySession.prompt(simplifiedInput);
    });
  }

  /**
   * Start health check monitoring
   * @private
   */
  _startHealthCheck() {
    setInterval(async () => {
      await this._checkHealth(this.primarySession, 'primary');
      for (const [name, session] of this.fallbackSessions) {
        await this._checkHealth(session, name);
      }
    }, this.options.healthCheckInterval);
  }

  /**
   * Check session health
   * @private
   */
  async _checkHealth(session, name) {
    try {
      const start = Date.now();
      await session.prompt('Test prompt for health check');
      const latency = Date.now() - start;

      this.healthStatus.set(name, {
        healthy: true,
        latency,
        lastCheck: Date.now(),
        errorCount: 0
      });
    } catch (error) {
      const status = this.healthStatus.get(name) || { errorCount: 0 };
      this.healthStatus.set(name, {
        healthy: false,
        error: error.message,
        lastCheck: Date.now(),
        errorCount: status.errorCount + 1
      });
    }
  }

  /**
   * Get a healthy fallback session
   * @private
   */
  async _getHealthyFallback() {
    const healthyFallbacks = [...this.fallbackSessions.entries()]
      .filter(([name]) => this.healthStatus.get(name)?.healthy)
      .sort((a, b) => {
        const aLatency = this.healthStatus.get(a[0]).latency;
        const bLatency = this.healthStatus.get(b[0]).latency;
        return aLatency - bLatency;
      });

    return healthyFallbacks[0]?.[1];
  }

  /**
   * Simplify a prompt for degraded mode
   * @private
   */
  async _simplifyPrompt(input) {
    // Basic prompt simplification
    return input
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .slice(0, 100); // Truncate if too long
  }

  /**
   * Add a fallback session
   * @param {string} name Session name
   * @param {Object} session Session instance
   */
  addFallback(name, session) {
    this.fallbackSessions.set(name, session);
    this._checkHealth(session, name);
  }

  /**
   * Remove a fallback session
   * @param {string} name Session name
   */
  removeFallback(name) {
    this.fallbackSessions.delete(name);
    this.healthStatus.delete(name);
  }

  /**
   * Execute with fallback
   * @param {Function} operation Operation to execute
   * @param {Object} context Operation context
   * @returns {Promise<any>} Operation result
   */
  async execute(operation, context = {}) {
    const strategies = [...this.options.fallbackStrategies];
    let lastError;

    while (strategies.length > 0) {
      const strategy = strategies.shift();
      const handler = this.strategyHandlers.get(strategy);

      try {
        const result = await Promise.race([
          operation(context),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), this.options.timeout)
          )
        ]);

        return result;
      } catch (error) {
        lastError = error;
        
        if (handler) {
          try {
            return await handler(context.input, error);
          } catch (fallbackError) {
            // Continue to next strategy
          }
        }
      }
    }

    throw lastError;
  }

  /**
   * Get health status for all sessions
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const status = {
      primary: this.healthStatus.get('primary'),
      fallbacks: {}
    };

    for (const [name] of this.fallbackSessions) {
      status.fallbacks[name] = this.healthStatus.get(name);
    }

    return status;
  }

  /**
   * Get fallback statistics
   * @returns {Object} Fallback statistics
   */
  getStats() {
    const stats = {
      primary: {
        health: this.healthStatus.get('primary'),
        usage: 0,
        successRate: 0
      },
      fallbacks: {}
    };

    for (const [name] of this.fallbackSessions) {
      stats.fallbacks[name] = {
        health: this.healthStatus.get(name),
        usage: 0,
        successRate: 0
      };
    }

    return stats;
  }
}
