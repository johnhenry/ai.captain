import assert from 'node:assert';
import test from 'node:test';
import { 
  createAICaptain, 
  Session,
  TemplateSystem, 
  TemplateValidator, 
  DistributedCache, 
  PerformanceAnalytics, 
  CompositionChains
} from '../src/index.mjs';

// Mock implementation for window.ai
import ai from 'ai.matey/mock';

test('createAICaptain', async (t) => {
  let chain;

  t.afterEach(async () => {
    if (chain) {
      await chain.destroy();
      chain = null;
    }
  });

  // Core functionality tests
  await t.test('initialization', async (t) => {
    await t.test('should create chain with default components', async () => {
      chain = await createAICaptain({}, ai);
      assert.ok(chain.session instanceof Session);
      assert.ok(chain.capabilities);
      assert.ok(chain.templates instanceof TemplateSystem);
      assert.ok(chain.validator instanceof TemplateValidator);
      assert.ok(chain.cache instanceof DistributedCache);
      assert.ok(chain.analytics instanceof PerformanceAnalytics);
      assert.ok(chain.chains instanceof CompositionChains);
    });

    await t.test('should accept custom configuration', async () => {
      chain = await createAICaptain({
        temperature: 0.8,
        cache: { enabled: true },
        fallback: { enabled: true }
      }, ai);

      assert.ok(chain.session instanceof Session);
      const response = await chain.session.prompt('Test');
      assert.ok(response.includes("I'm a mock AI assistant"));
    });
  });

  // Integration tests
  await t.test('component integration', async (t) => {
    await t.test('should integrate templates with session', async () => {
      chain = await createAICaptain({}, ai);
      await chain.templates.register('test', 'Hello {name}!');
      const response = await chain.session.prompt(['test', { name: 'World' }]);
      assert.ok(response.includes("I'm a mock AI assistant"));
    });
  });
});
