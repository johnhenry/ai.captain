import assert from 'node:assert';
import test from 'node:test';
import { Capabilities } from '../src/index.js';

test('Capabilities', async (t) => {
  let capabilities;

  t.beforeEach(async () => {
    capabilities = await Capabilities.get();
  });

  // Core functionality tests
  await t.test('initialization', async (t) => {
    await t.test('static get method', async () => {
      const caps = await Capabilities.get();
      assert.ok(caps instanceof Capabilities);
      assert.ok(caps.available);
      assert.ok(caps.defaultTopK);
      assert.ok(caps.maxTopK);
      assert.ok(caps.defaultTemperature);
    });

    await t.test('availability status methods', async () => {
      // Test isReady
      capabilities.available = 'readily';
      assert.strictEqual(capabilities.isReady(), true);
      capabilities.available = 'after-download';
      assert.strictEqual(capabilities.isReady(), false);

      // Test needsDownload
      assert.strictEqual(capabilities.needsDownload(), true);
      capabilities.available = 'no';
      assert.strictEqual(capabilities.needsDownload(), false);

      // Test isUnavailable
      assert.strictEqual(capabilities.isUnavailable(), true);
      capabilities.available = 'readily';
      assert.strictEqual(capabilities.isUnavailable(), false);
    });
  });

  // Parameter management tests
  await t.test('parameter management', async (t) => {
    await t.test('getRecommendedParams', async () => {
      capabilities.defaultTemperature = 0.7;
      capabilities.defaultTopK = 40;

      // Test with no user config
      const defaultParams = capabilities.getRecommendedParams();
      assert.strictEqual(defaultParams.temperature, 0.7);
      assert.strictEqual(defaultParams.topK, 40);

      // Test with user config
      const userParams = capabilities.getRecommendedParams({
        temperature: 0.9,
        topK: 50
      });
      assert.strictEqual(userParams.temperature, 0.9);
      assert.strictEqual(userParams.topK, 50);
    });

    await t.test('validateConfig', async () => {
      capabilities.maxTopK = 100;

      // Test valid config
      const validResult = capabilities.validateConfig({
        temperature: 1.0,
        topK: 50
      });
      assert.strictEqual(validResult.valid, true);
      assert.strictEqual(validResult.issues.length, 0);

      // Test invalid topK
      const invalidTopK = capabilities.validateConfig({
        topK: 150
      });
      assert.strictEqual(invalidTopK.valid, false);
      assert.strictEqual(invalidTopK.issues.length, 1);
      assert.ok(invalidTopK.issues[0].includes('topK value 150 exceeds maximum 100'));

      // Test invalid temperature
      const invalidTemp = capabilities.validateConfig({
        temperature: 2.5
      });
      assert.strictEqual(invalidTemp.valid, false);
      assert.strictEqual(invalidTemp.issues.length, 1);
      assert.ok(invalidTemp.issues[0].includes('temperature must be between 0 and 2'));

      // Test multiple issues
      const multipleIssues = capabilities.validateConfig({
        temperature: -1,
        topK: 200
      });
      assert.strictEqual(multipleIssues.valid, false);
      assert.strictEqual(multipleIssues.issues.length, 2);
    });
  });
});
