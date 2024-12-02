/**
 * Window Chain - A powerful utility library for window.ai
 * @module window-chain
 */

// Core
import { Session } from './core/session.mjs';
import { Capabilities } from './core/capabilities.mjs';

// Templates
import { TemplateSystem } from './templates/system.mjs';
import { TemplateValidator } from './templates/validation.mjs';

// Caching
import { DistributedCache } from './caching/distributed.mjs';
import { CacheCompression } from './caching/compression.mjs';

// Composition
import { CompositionBuilder } from './composition/builder.mjs';
import { CompositionChains } from './composition/chains.mjs';

// Monitoring
import { PerformanceAnalytics } from './monitoring/analytics.mjs';
import { FallbackSystem } from './monitoring/fallback.mjs';

/**
 * @typedef {Object} WindowChainOptions
 * @property {Object} [session] - Session configuration options
 * @property {number} [session.temperature] - Model temperature (0-1)
 * @property {Object} [cache] - Cache configuration
 * @property {Object} [compression] - Compression settings
 * @property {Object} [analytics] - Analytics configuration
 * @property {Object} [fallback] - Fallback system settings
 */

/**
 * @typedef {Object} WindowChain
 * @property {Session} session - Session instance
 * @property {Capabilities} capabilities - Capabilities instance
 * @property {TemplateSystem} templates - Template system instance
 * @property {TemplateValidator} validator - Template validator instance
 * @property {DistributedCache} cache - Distributed cache instance
 * @property {CacheCompression} compression - Cache compression instance
 * @property {CompositionBuilder} composer - Composition builder instance
 * @property {CompositionChains} chains - Composition chains instance
 * @property {PerformanceAnalytics} analytics - Performance analytics instance
 * @property {FallbackSystem} fallback - Fallback system instance
 * @property {Function} destroy - Cleanup function
 */

// Re-export all components
export {
  Session,
  Capabilities,
  TemplateSystem,
  TemplateValidator,
  DistributedCache,
  CacheCompression,
  CompositionBuilder,
  CompositionChains,
  PerformanceAnalytics,
  FallbackSystem
};

/**
 * Create a new Window Chain instance with all features enabled
 * @param {WindowChainOptions} [options={}] - Configuration options
 * @returns {Promise<WindowChain>} Window Chain instance
 */
export async function createWindowChain(options = {}) {
  // Initialize core components
  const capabilities = await Capabilities.get();
  const session = await Session.create(options.session);

  // Initialize template system
  const templates = new TemplateSystem(session);
  const validator = new TemplateValidator();

  // Initialize caching
  const cache = new DistributedCache(options.cache);
  const compression = new CacheCompression(options.compression);

  // Initialize composition
  const composer = new CompositionBuilder(session);
  const chains = new CompositionChains(session);

  // Initialize monitoring
  const analytics = new PerformanceAnalytics(options.analytics);
  const fallback = new FallbackSystem(session, options.fallback);

  return {
    // Core
    session,
    capabilities,

    // Templates
    templates,
    validator,

    // Caching
    cache,
    compression,

    // Composition
    composer,
    chains,

    // Monitoring
    analytics,
    fallback,

    /**
     * Destroy all resources
     * @returns {Promise<void>}
     */
    async destroy() {
      await session.destroy();
      await cache.clear();
      fallback.destroy();
      // Add any other cleanup needed
    }
  };
}
