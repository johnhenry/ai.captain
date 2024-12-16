import * as index from './index.mjs';

/**
 * Defines ai.captain components in a global object
 * @param {Object} [object={}] - Target object to define components in
 * @param {'silent'|'warn'|'error'} [overwrite='silent'] - Behavior when overwriting existing properties
 * @returns {Object} Empty object for chaining
 */
const defineGlobal = (object = {}, overwrite = 'silent') => {
  if (!object) {
    return;
  }

  for (const [key, value] of Object.entries(index)) {
    if (object[key]) {
      switch (overwrite) {
        case 'warn':
          console.warn(`Overwriting ${key} in global object`);
          break;
        case 'error':
          throw new Error(`Overwriting ${key} in global object`);
        case 'silent':
        default:
          break;
      }
    }
    object[key] = value;
  }
  return {};
}
export { defineGlobal };
export default defineGlobal;
