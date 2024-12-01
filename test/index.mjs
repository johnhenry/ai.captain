// Import the functions to be tested
import * as w from './mocks/window.mjs';
for(const [key, value] of Object.entries(w)) {
  globalThis[key] = value;
}
// Import tests
import "./fallback.mjs";
import "./validation.mjs";
import "./session.mjs";
import "./capabilities.mjs";
import "./template-system.mjs";
import "./distributed-cache.mjs";
import "./performance-analytics.mjs";
import "./composition-chains.mjs";
import "./create-window-chain.mjs";
import "./cache-compression.mjs";
