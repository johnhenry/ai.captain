// Import the functions to be tested
import * as w from './mocks/window.mjs';
for(const [key, value] of Object.entries(w)) {
  globalThis[key] = value;
}

// Core functionality tests
import "./session.mjs";           // Core session management
import "./validation.mjs";        // Core validation system
import "./capabilities.mjs";      // Core capabilities detection

// Feature-specific tests
import "./template-system.mjs";   // Template handling
import "./distributed-cache.mjs"; // Caching system
import "./performance-analytics.mjs"; // Performance monitoring

// Integration tests
import "./composition-chains.mjs";   // Chain composition
import "./create-ai.captain.mjs";  // AI Captain creation

// Enhancement tests
import "./cache-compression.mjs";    // Cache compression features
import "./fallback.mjs";            // Fallback behavior
