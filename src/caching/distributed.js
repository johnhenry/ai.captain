/**
 * Simple distributed caching system with TTL support
 */
export class DistributedCache {
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hour default
    this.store = new Map();
  }

  /**
   * Set a value in the cache
   * @param {string} key Cache key
   * @param {any} value Cache value
   * @param {number} ttl Time to live in milliseconds (optional)
   */
  async set(key, value, ttl = this.defaultTTL) {
    const expires = Date.now() + ttl;
    this.store.set(key, {
      value,
      expires
    });
  }

  /**
   * Get a value from the cache
   * @param {string} key Cache key
   * @returns {Promise<any>} Cache value
   */
  async get(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Delete a value from the cache
   * @param {string} key Cache key
   */
  async delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear the cache
   */
  async clear() {
    this.store.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      size: this.store.size,
      defaultTTL: this.defaultTTL
    };
  }
}
