/**
 * Enhanced capabilities wrapper for Window.ai
 */

// Determine if running in a browser environment
const isBrowser = typeof window !== 'undefined';

export class Capabilities {
  constructor(rawCapabilities) {
    // Store raw capabilities but don't expose them in object spread
    Object.defineProperty(this, 'raw', {
      value: rawCapabilities,
      enumerable: false
    });
    
    // Copy capabilities properties
    this.available = rawCapabilities.available;
    this.defaultTopK = rawCapabilities.defaultTopK;
    this.maxTopK = rawCapabilities.maxTopK;
    this.defaultTemperature = rawCapabilities.defaultTemperature;
  }

  /**
   * Get current Window.ai capabilities
   * @returns {Promise<Capabilities>} Capabilities instance
   */
  static async get() {
    // Use window.ai if available, otherwise use the mock implementation
    const ai = isBrowser ? window.ai : globalThis.ai;

    if (!ai) {
      throw new Error('Window.ai API not available');
    }

    const capabilities = await ai.languageModel.capabilities();
    return new Capabilities(capabilities);
  }

  /**
   * Check if the model is ready to use
   * @returns {boolean} True if model is ready
   */
  isReady() {
    return this.available === 'readily';
  }

  /**
   * Check if model needs to be downloaded
   * @returns {boolean} True if model needs download
   */
  needsDownload() {
    return this.available === 'after-download';
  }

  /**
   * Check if model is unavailable
   * @returns {boolean} True if model is unavailable
   */
  isUnavailable() {
    return this.available === 'no';
  }

  /**
   * Get recommended parameters based on capabilities
   * @param {Object} userConfig User-provided configuration
   * @returns {Object} Recommended parameters
   */
  getRecommendedParams(userConfig = {}) {
    return {
      temperature: userConfig.temperature || this.defaultTemperature,
      topK: userConfig.topK || this.defaultTopK
    };
  }

  /**
   * Validate user configuration against capabilities
   * @param {Object} config User configuration
   * @returns {Object} Validation result
   */
  validateConfig(config = {}) {
    const issues = [];

    if (config.topK && config.topK > this.maxTopK) {
      issues.push(`topK value ${config.topK} exceeds maximum ${this.maxTopK}`);
    }

    if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
      issues.push('temperature must be between 0 and 2');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
