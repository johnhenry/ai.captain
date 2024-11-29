/**
 * Distributed caching system with multiple storage strategies
 */
export class DistributedCache {
  constructor(options = {}) {
    this.options = {
      namespace: options.namespace || 'window-chain',
      ttl: options.ttl || 3600000, // 1 hour default
      maxSize: options.maxSize || 1000,
      strategy: options.strategy || 'lru',
      ...options
    };

    this.stores = new Map();
    this.channel = options.distributed ? new BroadcastChannel(`${this.options.namespace}-cache`) : null;
    
    if (this.channel) {
      this.channel.onmessage = this._handleMessage.bind(this);
    }

    this._initializeStores();
  }

  /**
   * Initialize cache stores
   * @private
   */
  _initializeStores() {
    // Memory store (always available)
    this.stores.set('memory', new Map());

    // LocalStorage store (if available)
    if (typeof localStorage !== 'undefined') {
      this.stores.set('localStorage', {
        get: key => {
          const item = localStorage.getItem(`${this.options.namespace}:${key}`);
          return item ? JSON.parse(item) : undefined;
        },
        set: (key, value) => {
          localStorage.setItem(`${this.options.namespace}:${key}`, JSON.stringify(value));
        },
        delete: key => {
          localStorage.removeItem(`${this.options.namespace}:${key}`);
        },
        clear: () => {
          Object.keys(localStorage)
            .filter(key => key.startsWith(`${this.options.namespace}:`))
            .forEach(key => localStorage.removeItem(key));
        }
      });
    }

    // IndexedDB store (if available)
    if (typeof indexedDB !== 'undefined') {
      // Initialize IndexedDB store (implementation details omitted for brevity)
    }
  }

  /**
   * Handle messages from other cache instances
   * @private
   */
  _handleMessage(event) {
    const { type, key, value, timestamp } = event.data;
    
    switch (type) {
      case 'set':
        this._setLocal(key, value, timestamp);
        break;
      case 'delete':
        this._deleteLocal(key);
        break;
      case 'clear':
        this._clearLocal();
        break;
    }
  }

  /**
   * Set a value in the cache
   * @param {string} key Cache key
   * @param {any} value Cache value
   * @param {number} timestamp Optional timestamp
   */
  async set(key, value, timestamp = Date.now()) {
    await this._setLocal(key, value, timestamp);
    
    if (this.channel) {
      this.channel.postMessage({ type: 'set', key, value, timestamp });
    }
  }

  /**
   * Set a value locally
   * @private
   */
  async _setLocal(key, value, timestamp) {
    const entry = {
      value,
      timestamp,
      expires: timestamp + this.options.ttl
    };

    // Set in all stores
    for (const store of this.stores.values()) {
      store.set(key, entry);
    }

    // Apply cache size limit
    if (this.options.strategy === 'lru') {
      this._applyLRU();
    }
  }

  /**
   * Get a value from the cache
   * @param {string} key Cache key
   * @returns {Promise<any>} Cache value
   */
  async get(key) {
    // Try each store in order
    for (const store of this.stores.values()) {
      const entry = store.get(key);
      
      if (entry) {
        if (Date.now() > entry.expires) {
          this.delete(key);
          return undefined;
        }
        return entry.value;
      }
    }

    return undefined;
  }

  /**
   * Delete a value from the cache
   * @param {string} key Cache key
   */
  async delete(key) {
    await this._deleteLocal(key);
    
    if (this.channel) {
      this.channel.postMessage({ type: 'delete', key });
    }
  }

  /**
   * Delete a value locally
   * @private
   */
  async _deleteLocal(key) {
    for (const store of this.stores.values()) {
      store.delete(key);
    }
  }

  /**
   * Clear the cache
   */
  async clear() {
    await this._clearLocal();
    
    if (this.channel) {
      this.channel.postMessage({ type: 'clear' });
    }
  }

  /**
   * Clear the cache locally
   * @private
   */
  async _clearLocal() {
    for (const store of this.stores.values()) {
      store.clear();
    }
  }

  /**
   * Apply LRU cache strategy
   * @private
   */
  _applyLRU() {
    const memoryStore = this.stores.get('memory');
    if (!memoryStore || memoryStore.size <= this.options.maxSize) {
      return;
    }

    // Sort entries by timestamp
    const entries = [...memoryStore.entries()]
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // Remove oldest entries
    while (memoryStore.size > this.options.maxSize) {
      const [key] = entries.shift();
      this.delete(key);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const memoryStore = this.stores.get('memory');
    
    return {
      size: memoryStore ? memoryStore.size : 0,
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
      distributed: Boolean(this.channel),
      stores: [...this.stores.keys()]
    };
  }
}
