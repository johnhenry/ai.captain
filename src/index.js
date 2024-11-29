/**
 * Window Chain - A powerful utility library for Window.ai
 */

// Core
import { Session } from './core/session.js';
import { Capabilities } from './core/capabilities.js';

// Templates
import { TemplateSystem } from './templates/system.js';
import { TemplateValidator } from './templates/validation.js';

// Caching
import { DistributedCache } from './caching/distributed.js';
import { CacheCompression } from './caching/compression.js';

// Composition
import { CompositionBuilder } from './composition/builder.js';
import { CompositionChains } from './composition/chains.js';

// Monitoring
import { PerformanceAnalytics } from './monitoring/analytics.js';
import { FallbackSystem } from './monitoring/fallback.js';

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
 * @param {Object} options Configuration options
 * @returns {Promise<Object>} Window Chain instance
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
     */
    async destroy() {
      await session.destroy();
      await cache.clear();
      fallback.destroy();
      // Add any other cleanup needed
    }
  };
}
