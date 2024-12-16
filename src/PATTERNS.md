# Code Organization Patterns

## Export Patterns

### Primary Exports
Each file should have a single primary export that matches the filename:

```javascript
// session.mjs
export class Session {
  // ...
}

// createChain.mjs
export function createChain() {
  // ...
}
```

### Utility Exports
Utility functions and constants should use named exports:

```javascript
// utils.mjs
export const DEFAULT_TIMEOUT = 5000;

export function validateInput(input) {
  // ...
}
```

### No Default Exports
Avoid default exports to maintain consistency and make imports explicit:

```javascript
// ❌ Bad
export default class Session {}

// ✅ Good
export class Session {}
```

## Documentation Patterns

### Class Documentation
```javascript
/**
 * @class
 * @description A class representing a session with an AI model
 * @typedef {Object} SessionOptions
 * @property {boolean} [cache.enabled=false] - Enable caching
 * @property {number} [cache.ttl=3600000] - Cache TTL in milliseconds
 */
export class Session {
  /**
   * Create a new Session instance
   * @param {Object} session - window.ai session
   * @param {SessionOptions} [options] - Configuration options
   */
  constructor(session, options = {}) {
    // ...
  }
}
```

### Function Documentation
```javascript
/**
 * Create a new window.ai session
 * @param {Object} options - Configuration options
 * @param {string} [options.model] - Model name
 * @param {number} [options.temperature] - Sampling temperature
 * @returns {Promise<Object>} window.ai session
 * @throws {Error} If window.ai is not available
 */
export function createSession(options = {}, ai = window.ai) {
  // ...
}
```

## File Organization

### Directory Structure
```
src/
  core/           # Core functionality
    session.mjs
    capabilities.mjs
  templates/      # Template system
    system.mjs
    validation.mjs
  caching/        # Caching system
    distributed.mjs
    compression.mjs
  composition/    # Chain composition
    builder.mjs
    chains.mjs
  monitoring/     # Monitoring and analytics
    analytics.mjs
    fallback.mjs
  index.mjs       # Main entry point
```

### Import Order
1. External dependencies
2. Core modules
3. Feature modules
4. Utility modules

```javascript
// External dependencies
import { EventEmitter } from 'events';

// Core modules
import { Session } from './core/session.mjs';
import { Capabilities } from './core/capabilities.mjs';

// Feature modules
import { TemplateSystem } from './templates/system.mjs';
import { CacheCompression } from './caching/compression.mjs';

// Utility modules
import { validateInput, DEFAULT_TIMEOUT } from './utils.mjs';
```
