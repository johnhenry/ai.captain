/**
 * Session management for Window.ai
 */

// Determine if running in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Create a new Window.ai session
 * @param {Object} options Configuration options
 * @returns {Promise<Object>} Window.ai session
 */
export async function createSession(options = {}) {
  // Use window.ai if available, otherwise use the mock implementation
  const ai = isBrowser ? window.ai : globalThis.ai;

  if (!ai) {
    throw new Error('Window.ai API not available');
  }

  const session = await ai.languageModel.create(options);
  return session;
}

/**
 * Destroy a Window.ai session
 * @param {Object} session Window.ai session
 * @returns {Promise<void>}
 */
export async function destroySession(session) {
  await session.destroy();
}

/**
 * A class representing a Window.ai session
 */
export class Session {
  #session;

  /**
   * Create a new Session instance
   * @param {Object} options Configuration options
   */
  constructor(session) {
    this.#session = session;
  }

  /**
   * Create a new Session instance
   * @param {Object} options Configuration options
   * @returns {Promise<Session>}
   */
  static async create(options = {}) {
    const session = await createSession(options);
    return new Session(session);
  }

  /**
   * Send a prompt to the Window.ai session
   * @param {string} text Prompt text
   * @param {Object} options Configuration options
   * @returns {Promise<string>} Response from Window.ai
   */
  async prompt(text, options = {}) {
    return this.#session.prompt(text, options);
  }

  /**
   * Send a prompt to the Window.ai session and receive a streaming response
   * @param {string} text Prompt text
   * @param {Object} options Configuration options
   * @returns {Promise<ReadableStream>} ReadableStream of responses from Window.ai
   */
  async promptStreaming(text, options = {}) {
    // Return the ReadableStream directly as required by the API spec
    return this.#session.promptStreaming(text, options);
  }

  /**
   * Clone the current session
   * @param {Object} options Configuration options
   * @returns {Promise<Session>} Cloned session
   */
  async clone(options = {}) {
    const clonedSession = await this.#session.clone(options);
    return new Session(clonedSession);
  }

  /**
   * Destroy the session
   * @returns {Promise<void>}
   */
  async destroy() {
    await destroySession(this.#session);
  }

  /**
   * Get the number of tokens used so far in the session
   * @returns {number} Number of tokens used
   */
  get tokensSoFar() {
    return this.#session.tokensSoFar;
  }

  /**
   * Get the maximum number of tokens allowed in the session
   * @returns {number} Maximum number of tokens
   */
  get maxTokens() {
    return this.#session.maxTokens;
  }

  /**
   * Get the number of tokens left in the session
   * @returns {number} Number of tokens left
   */
  get tokensLeft() {
    return this.#session.tokensLeft;
  }
}
