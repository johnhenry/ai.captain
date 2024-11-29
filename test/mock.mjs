import assert from 'node:assert';
import test from 'node:test';
import { windowAI } from '../window.ai.mock.mjs';

test('window.ai mock capabilities', async () => {
  const capabilities = await windowAI.languageModel.capabilities();
  assert.deepEqual(capabilities, {
    available: 'readily',
    defaultTopK: 3,
    maxTopK: 8,
    defaultTemperature: 1.0
  });
});

test('window.ai mock create', async () => {
  const session = await windowAI.languageModel.create();
  assert.ok(session instanceof windowAI.languageModel.MockAILanguageModelSession);
});

test('window.ai mock session prompt', async () => {
  const session = await windowAI.languageModel.create();
  const response = await session.prompt('Tell me a joke');
  assert.equal(response, "Why don't scientists trust atoms? Because they make up everything!");
});

test('window.ai mock session promptStreaming', async () => {
  const session = await windowAI.languageModel.create();
  const stream = await session.promptStreaming('Tell me a joke');
  const reader = stream.getReader();
  let response = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    response += value;
  }
  assert.equal(response, "Why don't scientists trust atoms? Because they make up everything! ");
});

test('window.ai mock session clone', async () => {
  const session = await windowAI.languageModel.create();
  const clonedSession = await session.clone();
  assert.ok(clonedSession instanceof windowAI.languageModel.MockAILanguageModelSession);
  assert.notEqual(session, clonedSession);
});

test('window.ai mock session destroy', async () => {
  const session = await windowAI.languageModel.create();
  session.destroy();
  assert.throws(() => session.prompt('Test'), /Session has been destroyed/);
});

test('window.ai mock session token counting', async () => {
  const session = await windowAI.languageModel.create();
  await session.prompt('This is a test prompt');
  assert.equal(session.tokensSoFar, 6); // Approximate token count
  assert.equal(session.tokensLeft, 4090); // Approximate tokens left
});

test('window.ai mock session token limit', async () => {
  const session = await windowAI.languageModel.create();
  const longPrompt = 'a'.repeat(4097); // Exceeds token limit
  await assert.rejects(session.prompt(longPrompt), /Prompt exceeds token limit/);
});

test('window.ai mock session signal abort', async () => {
  const session = await windowAI.languageModel.create();
  const controller = new AbortController();
  const signal = controller.signal;
  setTimeout(() => controller.abort(), 100); // Abort after 100ms
  await assert.rejects(session.promptStreaming('Test', { signal }), /Operation was aborted/);
});
