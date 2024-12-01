import assert from 'node:assert';
import test from 'node:test';
import { DistributedCache } from '../src/index.js';

// Test suite for DistributedCache
test('DistributedCache', async (t) => {
  let cache;

  t.beforeEach(() => {
    cache = new DistributedCache();
  });

  t.afterEach(async () => {
    await cache.clear();
  });

  await t.test('basic operations', async () => {
    // Test set and get
    await cache.set('key1', 'value1');
    const value = await cache.get('key1');
    assert.equal(value, 'value1');

    // Test missing key
    const missing = await cache.get('nonexistent');
    assert.equal(missing, undefined);
  });

  await t.test('expiration', async () => {
    cache = new DistributedCache({ defaultTTL: 100 }); // 100ms TTL
    
    await cache.set('key1', 'value1');
    const immediate = await cache.get('key1');
    assert.equal(immediate, 'value1');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    const expired = await cache.get('key1');
    assert.equal(expired, undefined);
  });

  await t.test('custom TTL', async () => {
    cache = new DistributedCache({ defaultTTL: 1000 });

    await cache.set('key1', 'value1', 100); // Override with 100ms TTL
    const immediate = await cache.get('key1');
    assert.equal(immediate, 'value1');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    const expired = await cache.get('key1');
    assert.equal(expired, undefined);
  });

  await t.test('clear', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    
    await cache.clear();
    
    const value1 = await cache.get('key1');
    const value2 = await cache.get('key2');
    assert.equal(value1, undefined);
    assert.equal(value2, undefined);
  });
  await t.test('complex values', async () => {
    const complexValue = {
      string: 'test',
      number: 123,
      boolean: true,
      array: [1, 2, 3],
      nested: { a: 1, b: 2 }
    };
    
    await cache.set('complex', complexValue);
    const retrieved = await cache.get('complex');
    assert.deepStrictEqual(retrieved, complexValue);
  });

  await t.test('concurrent operations', async () => {
    // Test just 3 concurrent operations
    await Promise.all([
      cache.set('key1', 'value1'),
      cache.set('key2', 'value2'),
      cache.set('key3', 'value3')
    ]);

    // Verify all operations succeeded
    const [value1, value2, value3] = await Promise.all([
      cache.get('key1'),
      cache.get('key2'),
      cache.get('key3')
    ]);
    
    assert.equal(value1, 'value1');
    assert.equal(value2, 'value2');
    assert.equal(value3, 'value3');
  });
});
