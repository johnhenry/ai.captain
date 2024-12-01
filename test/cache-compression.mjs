import assert from 'node:assert';
import test from 'node:test';
import { CacheCompression } from '../src/index.js';

// Test suite for CacheCompression
test('CacheCompression', async (t) => {
  let compression;

  t.beforeEach(() => {
    compression = new CacheCompression({
      threshold: 10 // Set lower threshold for testing
    });
  });

  await t.test('constructor options', () => {
    const custom = new CacheCompression({
      algorithm: 'deflate',
      level: 'max',
      threshold: 2048
    });

    assert.strictEqual(custom.options.algorithm, 'deflate');
    assert.strictEqual(custom.options.level, 'max');
    assert.strictEqual(custom.options.threshold, 2048);
  });

  await t.test('compression threshold', async () => {
    const smallData = { test: 'small' };
    const result = await compression.compress(smallData);
    
    assert.strictEqual(result.compressed, true);
    assert.strictEqual(result.algorithm, 'lz');
    assert.ok(result.data);
  });

  await t.test('LZ compression/decompression', async () => {
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

  await t.test('deflate compression/decompression', async () => {
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

  await t.test('compression statistics', async () => {
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

  await t.test('error handling', async () => {
    await assert.rejects(
      () => compression.compress(undefined),
      {
        name: 'Error',
        message: 'Cannot compress undefined data'
      }
    );

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
  await t.test('compression levels', async () => {
    const testData = { text: 'Test compression levels'.repeat(10) };

    // Test fast compression
    const fastCompression = new CacheCompression({
      level: 'fast',
      threshold: 10
    });
    const fastResult = await fastCompression.compress(testData);

    // Test max compression
    const maxCompression = new CacheCompression({
      level: 'max',
      threshold: 10
    });
    const maxResult = await maxCompression.compress(testData);
    
    // Verify both compress successfully
    assert.ok(fastResult.compressed);
    assert.ok(maxResult.compressed);
  });

  await t.test('large data handling', async () => {
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
