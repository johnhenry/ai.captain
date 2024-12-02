import assert from 'node:assert';
import test from 'node:test';
import { DistributedCache } from '../src/index.mjs';

test('DistributedCache', async (t) => {
  let cache;

  t.beforeEach(() => {
    cache = new DistributedCache();
  });

  t.afterEach(async () => {
    await cache.clear();
  });

  // Core functionality tests
  await t.test('core operations', async (t) => {
    await t.test('should set and get values correctly', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');
      assert.equal(value, 'value1');
    });

    await t.test('should handle missing keys', async () => {
      const missing = await cache.get('nonexistent');
      assert.equal(missing, undefined);
    });

    await t.test('should store and retrieve complex values', async () => {
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
  });

  // TTL and expiration tests
  await t.test('expiration management', async (t) => {
    await t.test('should respect default TTL', async () => {
      cache = new DistributedCache({ defaultTTL: 100 }); // 100ms TTL
      
      await cache.set('key1', 'value1');
      const immediate = await cache.get('key1');
      assert.equal(immediate, 'value1');

      await new Promise(resolve => setTimeout(resolve, 150));
      const expired = await cache.get('key1');
      assert.equal(expired, undefined);
    });

    await t.test('should honor custom TTL over default', async () => {
      cache = new DistributedCache({ defaultTTL: 1000 });

      await cache.set('key1', 'value1', 100);
      const immediate = await cache.get('key1');
      assert.equal(immediate, 'value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      const expired = await cache.get('key1');
      assert.equal(expired, undefined);
    });
  });

  // Cache management tests
  await t.test('cache management', async (t) => {
    await t.test('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      await cache.clear();
      
      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');
      assert.equal(value1, undefined);
      assert.equal(value2, undefined);
    });
  });

  // Concurrency tests
  await t.test('concurrent operations', async (t) => {
    await t.test('should handle multiple concurrent operations', async () => {
      await Promise.all([
        cache.set('key1', 'value1'),
        cache.set('key2', 'value2'),
        cache.set('key3', 'value3')
      ]);

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
});
