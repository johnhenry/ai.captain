import assert from 'node:assert';
import test from 'node:test';
import { CacheCompression } from '../src/index.mjs';

test('CacheCompression', async (t) => {
  let compression;

  t.beforeEach(() => {
    compression = new CacheCompression({
      threshold: 10 // Set lower threshold for testing
    });
  });

  // Initialization tests
  await t.test('initialization', async (t) => {
    await t.test('should accept custom constructor options', async () => {
      const custom = new CacheCompression({
        algorithm: 'deflate',
        level: 'max',
        threshold: 2048
      });

      assert.strictEqual(custom.options.algorithm, 'deflate');
      assert.strictEqual(custom.options.level, 'max');
      assert.strictEqual(custom.options.threshold, 2048);
    });
  });

  // Core functionality tests
  await t.test('compression operations', async (t) => {
    await t.test('should respect compression threshold', async () => {
      const smallData = { test: 'small' };
      const result = await compression.compress(smallData);
      
      assert.strictEqual(result.compressed, true);
      assert.strictEqual(result.algorithm, 'lz');
      assert.ok(result.data);
    });

    await t.test('should perform LZ compression and decompression', async () => {
      const testData = {
        text: 'AAAAABBBCC', // String with repeating characters
        numbers: [1, 1, 1, 2, 2, 3] // Array with repeating numbers
      };

      const compressed = await compression.compress(testData);
      assert.strictEqual(compressed.compressed, true);
      assert.strictEqual(compressed.algorithm, 'lz');
      assert.ok(compressed.data);

      const decompressed = await compression.decompress(compressed);
      assert.deepStrictEqual(decompressed, testData);
    });

    await t.test('should perform deflate compression and decompression', async () => {
      compression = new CacheCompression({
        algorithm: 'deflate',
        threshold: 10
      });
      
      const testData = {
        text: 'Test deflate compression'
      };

      const compressed = await compression.compress(testData);
      assert.strictEqual(compressed.compressed, true);
      assert.strictEqual(compressed.algorithm, 'deflate');
      assert.ok(compressed.data);

      const decompressed = await compression.decompress(compressed);
      assert.deepStrictEqual(decompressed, testData);
    });
  });

  // Performance and statistics tests
  await t.test('performance', async (t) => {
    await t.test('should provide accurate compression statistics', async () => {
      const testData = {
        text: 'This is a test string that should be long enough to compress'
      };

      const compressed = await compression.compress(testData);
      const stats = compression.getStats(compressed);

      assert.ok(stats.originalSize > 0);
      assert.ok(stats.compressedSize > 0);
      assert.ok(stats.compressionRatio > 0);
      assert.ok(stats.spaceSaved >= 0);
      assert.strictEqual(stats.algorithm, 'lz');
    });

    await t.test('should support different compression levels', async () => {
      const testData = { text: 'Test compression levels'.repeat(10) };

      const fastCompression = new CacheCompression({
        level: 'fast',
        threshold: 10
      });
      const fastResult = await fastCompression.compress(testData);

      const maxCompression = new CacheCompression({
        level: 'max',
        threshold: 10
      });
      const maxResult = await maxCompression.compress(testData);
      
      assert.ok(fastResult.compressed);
      assert.ok(maxResult.compressed);
    });

    await t.test('should handle large data sets', async () => {
      const largeData = {
        text: 'Large text '.repeat(100),
        numbers: Array(100).fill(0).map((_, i) => i)
      };
      
      const compressed = await compression.compress(largeData);
      assert.ok(compressed.compressed);
      
      const decompressed = await compression.decompress(compressed);
      assert.deepStrictEqual(decompressed, largeData);
    });
  });

  // Error handling tests
  await t.test('error handling', async (t) => {
    await t.test('should handle invalid inputs', async () => {
      await assert.rejects(
        () => compression.compress(undefined),
        {
          name: 'Error',
          message: 'Cannot compress undefined data'
        }
      );
    });

    await t.test('should handle unsupported algorithms', async () => {
      await assert.rejects(
        () => compression.decompress({
          compressed: true,
          algorithm: 'invalid',
          data: btoa('test')
        }),
        {
          name: 'Error',
          message: 'Unsupported compression algorithm: invalid'
        }
      );
    });
  });
});
