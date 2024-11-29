import assert from 'node:assert';
import test from 'node:test';
import { windowAI } from '../window.ai.mock.mjs';

// Replace global window.ai with the mock implementation
globalThis.ai = windowAI;

// Import the functions to be tested
import {
  Session,
  Capabilities,
  TemplateSystem,
  TemplateValidator,
  DistributedCache,
  CacheCompression,
  CompositionBuilder,
  CompositionChains,
  PerformanceAnalytics,
  FallbackSystem,
  createWindowChain
} from '../src/index.js';

// Test suite for Session
test('Session', async (t) => {
  await t.test('create and destroy', async () => {
    const session = await Session.create();
    assert.ok(session instanceof Session);
    await session.destroy();
  });

  await t.test('prompt', async () => {
    const session = await Session.create();
    const response = await session.prompt('Tell me a joke');
    assert.equal(response, "Why don't scientists trust atoms? Because they make up everything!");
    await session.destroy();
  });

  await t.test('promptStreaming', async () => {
    const session = await Session.create();
    const streamPromise = session.promptStreaming('Tell me a joke');
    const stream = await streamPromise; // Resolve the promise before the loop
    assert.ok(stream instanceof ReadableStream);

    let fullResponse = '';
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      fullResponse += value;
    }

    assert.equal(fullResponse, "Why don't scientists trust atoms? Because they make up everything!");
    await session.destroy();
  });

  await t.test('clone', async () => {
    const session = await Session.create();
    const clonedSession = await session.clone();
    assert.ok(clonedSession instanceof Session);
    assert.notEqual(session, clonedSession);
    await session.destroy();
    await clonedSession.destroy();
  });

  await t.test('tokensSoFar, maxTokens, tokensLeft', async () => {
    const session = await Session.create();
    assert.equal(session.tokensSoFar, 0);
    assert.equal(session.maxTokens, 4096);
    assert.equal(session.tokensLeft, 4096);

    await session.prompt('Test prompt');
    assert.ok(session.tokensSoFar > 0);
    assert.ok(session.tokensLeft < 4096);

    await session.destroy();
  });

  await t.test('prompt exceeding token limit', async () => {
    const session = await Session.create();
    const longPrompt = 'a'.repeat(1025); // Exceeds the mock per-prompt limit
    await assert.rejects(session.prompt(longPrompt), { message: 'Prompt exceeds token limit' });
    await session.destroy();
  });

  await t.test('session token limit exceeded', async () => {
    const session = await Session.create();
    // Send enough prompts to exceed the mock session token limit
    for (let i = 0; i < 10; i++) {
      await session.prompt('a'.repeat(400));
    }
    await assert.rejects(session.prompt('Test prompt'), { message: 'Session token limit exceeded' });
    await session.destroy();
  });

  await t.test('prompt with signal', async () => {
    const session = await Session.create();
    const controller = new AbortController();
    const signal = controller.signal;

    // Prompt with a signal that is not aborted
    const response = await session.prompt('Tell me a joke', { signal });
    assert.equal(response, "Why don't scientists trust atoms? Because they make up everything!");

    // Prompt with an aborted signal
    controller.abort();
    await assert.rejects(session.prompt('Test prompt', { signal }), { message: 'Operation was aborted' });

    await session.destroy();
  });

  await t.test('session with signal', async () => {
    const controller = new AbortController();
    const signal = controller.signal;
    const session = await Session.create({ signal });

    // Prompt with a signal that is not aborted
    const response = await session.prompt('Tell me a joke');
    assert.equal(response, "Why don't scientists trust atoms? Because they make up everything!");

    // Prompt with an aborted signal
    controller.abort();
    await assert.rejects(session.prompt('Test prompt'), { message: 'Operation was aborted' });

    await session.destroy();
  });

  await t.test('promptStreaming with signal', async () => {
    const session = await Session.create();
    const controller = new AbortController();
    const signal = controller.signal;

    // Prompt with a signal that is not aborted
    const streamPromise = session.promptStreaming('Tell me a joke', { signal });
    const stream = await streamPromise; // Resolve the promise before the loop
    assert.ok(stream instanceof ReadableStream);

    let fullResponse = '';
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      fullResponse += value;
    }

    assert.equal(fullResponse, "Why don't scientists trust atoms? Because they make up everything!");

    // Prompt with an aborted signal
    controller.abort();
    const streamPromise2 = await session.promptStreaming('Test prompt', { signal }); // Await the call
    await assert.rejects(streamPromise2, { name: 'AbortError' }); // Await the promise rejection

    await session.destroy();
  });

  await t.test('session with signal and promptStreaming with signal', async () => {
    const sessionController = new AbortController();
    const sessionSignal = sessionController.signal;
    const session = await Session.create({ signal: sessionSignal });

    const promptController = new AbortController();
    const promptSignal = promptController.signal;

    // Prompt with a signal that is not aborted
    const streamPromise = session.promptStreaming('Tell me a joke', { signal: promptSignal });
    const stream = await streamPromise; // Resolve the promise before the loop
    assert.ok(stream instanceof ReadableStream);

    let fullResponse = '';
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      fullResponse += value;
    }

    assert.equal(fullResponse, "Why don't scientists trust atoms? Because they make up everything!");

    // Prompt with an aborted signal
    promptController.abort();
    const streamPromise2 = await session.promptStreaming('Test prompt', { signal: promptSignal }); // Await the call
    await assert.rejects(streamPromise2, { name: 'AbortError' }); // Await the promise rejection

    // Prompt with session signal aborted
    sessionController.abort();
    const streamPromise3 = await session.promptStreaming('Test prompt', { signal: promptSignal }); // Await the call
    await assert.rejects(streamPromise3, { name: 'AbortError' }); // Await the promise rejection

    await session.destroy();
  });

  await t.test('destroyed session', async () => {
    const session = await Session.create();
    await session.destroy();

    await assert.rejects(session.prompt('Test prompt'), { message: 'Session has been destroyed' });
    await assert.rejects(session.promptStreaming('Test prompt'), { message: 'Session has been destroyed' });
    await assert.rejects(session.clone(), { message: 'Session has been destroyed' });
  });
});

// Test suite for Capabilities
test('Capabilities', async (t) => {
  await t.test('get', async () => {
    const capabilities = await Capabilities.get();
    assert.deepEqual(capabilities, {
      available: 'readily',
      defaultTopK: 3,
      maxTopK: 8,
      defaultTemperature: 1.0
    });
  });
});

// Test suite for TemplateSystem
test('TemplateSystem', async (t) => {
  await t.test('basic functionality', async () => {
    const session = await Session.create();
    const templates = new TemplateSystem(session);
    const template = 'Hello, {{name}}!';
    const data = { name: 'world' };
    const result = await templates.render(template, data);
    assert.equal(result, 'Hello, world!');
    await session.destroy();
  });
});

// Test suite for TemplateValidator
test('TemplateValidator', async (t) => {
  await t.test('basic functionality', async () => {
    const validator = new TemplateValidator();
    const template = 'Hello, {{name}}!';
    const data = { name: 'world' };
    const result = validator.validate(template, data);
    assert.ok(result);
  });
});

// Test suite for DistributedCache
test('DistributedCache', async (t) => {
  // Implement tests for DistributedCache
});

// Test suite for CacheCompression
test('CacheCompression', async (t) => {
  // Implement tests for CacheCompression
});

// Test suite for CompositionBuilder
test('CompositionBuilder', async (t) => {
  // Implement tests for CompositionBuilder
});

// Test suite for CompositionChains
test('CompositionChains', async (t) => {
  // Implement tests for CompositionChains
});

// Test suite for PerformanceAnalytics
test('PerformanceAnalytics', async (t) => {
  // Implement tests for PerformanceAnalytics
});

// Test suite for FallbackSystem
test('FallbackSystem', async (t) => {
  // Implement tests for FallbackSystem
});

// Test suite for createWindowChain
test('createWindowChain', async (t) => {
  await t.test('basic functionality', async () => {
    const chain = await createWindowChain();
    assert.ok(chain.session instanceof Session);
    assert.ok(chain.capabilities);
    assert.ok(chain.templates instanceof TemplateSystem);
    assert.ok(chain.validator instanceof TemplateValidator);
    // ... (assert other components)
    await chain.destroy();
  });
});
