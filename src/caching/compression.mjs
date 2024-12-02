/**
 * Cache compression utilities
 */
class CacheCompression {
  constructor(options = {}) {
    this.options = {
      algorithm: options.algorithm || 'lz',  // 'lz' or 'deflate'
      level: options.level || 'default',     // 'fast', 'default', or 'max'
      threshold: options.threshold || 1024,   // Minimum size for compression
      ...options
    };
  }

  /**
   * Compress data if it meets the threshold
   * @param {any} data Data to compress
   * @returns {Object} Compressed data with metadata
   */
  async compress(data) {
    if (data === undefined || data === null) {
      throw new Error('Cannot compress undefined data');
    }

    const serialized = JSON.stringify(data);
    
    if (serialized.length < this.options.threshold) {
      return {
        compressed: false,
        data: serialized
      };
    }

    let compressed;
    switch (this.options.algorithm) {
      case 'deflate':
        compressed = await this._compressDeflate(serialized);
        break;
      case 'lz':
        compressed = this._compressLZ(serialized);
        break;
      default:
        throw new Error(`Unsupported compression algorithm: ${this.options.algorithm}`);
    }

    return {
      compressed: true,
      algorithm: this.options.algorithm,
      data: compressed
    };
  }

  /**
   * Decompress data
   * @param {Object} compressed Compressed data with metadata
   * @returns {any} Original data
   */
  async decompress(compressed) {
    if (!compressed || typeof compressed !== 'object') {
      throw new Error('Invalid compressed data format');
    }

    if (!compressed.compressed) {
      return JSON.parse(compressed.data);
    }

    let decompressed;
    switch (compressed.algorithm) {
      case 'deflate':
        decompressed = await this._decompressDeflate(compressed.data);
        break;
      case 'lz':
        decompressed = this._decompressLZ(compressed.data);
        break;
      default:
        throw new Error(`Unsupported compression algorithm: ${compressed.algorithm}`);
    }

    try {
      return JSON.parse(decompressed);
    } catch (error) {
      throw new Error('Failed to parse decompressed data');
    }
  }

  /**
   * Compress using LZ-based algorithm
   * @private
   */
  _compressLZ(data) {
    // For testing purposes, use simple run-length encoding
    let compressed = '';
    let count = 1;
    let current = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i] === current && count < 9) {
        count++;
      } else {
        compressed += count + current;
        current = data[i];
        count = 1;
      }
    }
    
    if (current) {
      compressed += count + current;
    }

    return btoa(compressed);
  }

  /**
   * Decompress LZ-compressed data
   * @private
   */
  _decompressLZ(data) {
    // Decode run-length encoding
    const compressed = atob(data);
    let decompressed = '';
    
    for (let i = 0; i < compressed.length; i += 2) {
      const count = parseInt(compressed[i]);
      const char = compressed[i + 1];
      decompressed += char.repeat(count);
    }

    return decompressed;
  }

  /**
   * Compress using Deflate algorithm
   * @private
   */
  async _compressDeflate(data) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    
    const compressed = await new Response(
      new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))
    ).blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(btoa(reader.result));
      reader.onerror = () => reject(new Error('Failed to read compressed data'));
      reader.readAsBinaryString(compressed);
    });
  }

  /**
   * Decompress Deflate-compressed data
   * @private
   */
  async _decompressDeflate(data) {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    
    const decompressed = await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))
    ).blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read decompressed data'));
      reader.readAsText(decompressed);
    });
  }

  /**
   * Get compression statistics
   * @param {Object} compressed Compressed data with metadata
   * @returns {Object} Compression statistics
   */
  getStats(compressed) {
    if (!compressed.compressed) {
      return {
        originalSize: compressed.data.length,
        compressedSize: compressed.data.length,
        compressionRatio: 1,
        spaceSaved: 0,
        algorithm: 'none'
      };
    }

    const originalSize = compressed.data.length;
    const compressedSize = Buffer.from(compressed.data, 'base64').length;
    const compressionRatio = originalSize / compressedSize;
    const spaceSaved = originalSize - compressedSize;

    return {
      originalSize,
      compressedSize,
      compressionRatio,
      spaceSaved,
      algorithm: compressed.algorithm
    };
  }
}

export { CacheCompression };
