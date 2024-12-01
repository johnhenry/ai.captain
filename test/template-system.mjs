import assert from 'node:assert';
import test from 'node:test';
import { TemplateSystem, Session } from '../src/index.js';

// Mock session class for testing
class MockSession {
  async prompt(input) {
    return input;
  }

  registerTemplate() {}
  inheritTemplate() {}
  destroy() {}
}


// Test suite for TemplateSystem
test('TemplateSystem', async (t) => {
  let session;
  let templates;

  t.afterEach(async () => {
    if (session) {
      await session.destroy();
      session = null;
    }
  });

  await t.test('basic functionality', async () => {
    session = new MockSession();
    templates = new TemplateSystem(session);
    
    // Test template registration
    templates.register('translate', 'system: You are a helpful translator.\nhuman: Translate "{text}" to {language}."');
    templates.register('sentiment', 'system: You analyze sentiment and return JSON.\nhuman: Analyze the sentiment of this text: {text}');
    
    // Test template application
    const translatedText = await templates.apply('translate', { text: 'Hello', language: 'Spanish' });
    assert.ok(translatedText.includes('Translate "Hello" to Spanish'));
    
    const sentimentText = await templates.apply('sentiment', { text: 'I love this!' });
    assert.ok(sentimentText.includes('Analyze the sentiment of this text: I love this!'));
  });

  await t.test('template validation', async () => {
    session = new MockSession();
    templates = new TemplateSystem(session);
    
    // Test missing parameter handling
    templates.register('test', 'Hello {name}!');
    await assert.rejects(
      templates.apply('test', {}),
      { message: 'Missing required parameters: name' }
    );
  });

  await t.test('template inheritance', async () => {
    session = new MockSession();
    templates = new TemplateSystem(session);
    
    templates.register('base', 'system: {role}\nhuman: {query}');
    templates.inherit('translator', 'base', { defaults: { role: 'You are a translator' } });

    const result = await templates.apply('translator', { query: 'Translate "hello"' });
    assert.equal(result, 'system: You are a translator\nhuman: Translate "hello"');
  });


  await t.test('template composition', async () => {
    session = new MockSession();
    templates = new TemplateSystem(session);
    
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
