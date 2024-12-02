import assert from 'node:assert';
import test from 'node:test';
import { TemplateSystem, Session } from '../src/index.mjs';

// Mock session class for testing
class MockSession {
  async prompt(input) {
    return input;
  }

  registerTemplate() {}
  inheritTemplate() {}
  destroy() {}
}

test('TemplateSystem', async (t) => {
  let session;
  let templates;

  t.beforeEach(() => {
    session = new MockSession();
    templates = new TemplateSystem(session);
  });

  t.afterEach(async () => {
    if (session) {
      await session.destroy();
      session = null;
    }
  });

  // Core functionality tests
  await t.test('core functionality', async (t) => {
    await t.test('should register and apply basic templates', async () => {
      templates.register('translate', 'system: You are a helpful translator.\nhuman: Translate "{text}" to {language}."');
      
      const translatedText = await templates.apply('translate', { text: 'Hello', language: 'Spanish' });
      assert.ok(translatedText.includes('Translate "Hello" to Spanish'));
    });

    await t.test('should handle multiple templates', async () => {
      templates.register('translate', 'system: You are a helpful translator.\nhuman: Translate "{text}" to {language}."');
      templates.register('sentiment', 'system: You analyze sentiment and return JSON.\nhuman: Analyze the sentiment of this text: {text}');
      
      const sentimentText = await templates.apply('sentiment', { text: 'I love this!' });
      assert.ok(sentimentText.includes('Analyze the sentiment of this text: I love this!'));
    });
  });

  // Parameter validation tests
  await t.test('parameter validation', async (t) => {
    await t.test('should reject when required parameters are missing', async () => {
      templates.register('test', 'Hello {name}!');
      await assert.rejects(
        templates.apply('test', {}),
        { message: 'Missing required parameters: name' }
      );
    });
  });

  // Template inheritance tests
  await t.test('template inheritance', async (t) => {
    await t.test('should properly inherit and apply default parameters', async () => {
      templates.register('base', 'system: {role}\nhuman: {query}');
      templates.inherit('translator', 'base', { defaults: { role: 'You are a translator' } });

      const result = await templates.apply('translator', { query: 'Translate "hello"' });
      assert.equal(result, 'system: You are a translator\nhuman: Translate "hello"');
    });
  });

  // Template composition tests
  await t.test('template composition', async (t) => {
    await t.test('should compose multiple templates together', async () => {
      templates.register('header', '=== {title} ===');
      templates.register('footer', '--- {note} ---');
      templates.register('page', '{header}\n{content}\n{footer}');
      
      const result = await templates.apply('page', {
        header: await templates.apply('header', { title: 'Test' }),
        content: 'Main content',
        footer: await templates.apply('footer', { note: 'End' })
      });

      assert.ok(result.includes('=== Test ==='));
      assert.ok(result.includes('Main content'));
      assert.ok(result.includes('--- End ---'));
    });
  });
});
