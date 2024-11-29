/**
 * Cache compression utilities
 */
export class CacheCompression {
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
      default:
        compressed = this._compressLZ(serialized);
        break;
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
    if (!compressed.compressed) {
      return JSON.parse(compressed.data);
    }

    let decompressed;
    switch (compressed.algorithm) {
      case 'deflate':
        decompressed = await this._decompressDeflate(compressed.data);
        break;
      case 'lz':
      default:
        decompressed = this._decompressLZ(compressed.data);
        break;
    }

    return JSON.parse(decompressed);
  }

  /**
   * Compress using LZ-based algorithm
   * @private
   */
  _compressLZ(data) {
    // Simple LZ77-style compression
    const dictionary = new Map();
    let compressed = '';
    let current = '';
    
    for (let i = 0; i < data.length; i++) {
      current += data[i];
      
      if (!dictionary.has(current)) {
        dictionary.set(current, dictionary.size);
        if (current.length > 1) {
          const previous = current.slice(0, -1);
          compressed += `${dictionary.get(previous)}${data[i]}`;
        } else {
          compressed += data[i];
        }
        current = '';
      }
    }
    
    if (current) {
      compressed += dictionary.get(current);
    }

    return btoa(compressed);
  }

  /**
   * Decompress LZ-compressed data
   * @private
   */
  _decompressLZ(data) {
    const compressed = atob(data);
    const dictionary = new Map();
    let decompressed = '';
    let current = '';
    
    for (let i = 0; i < compressed.length; i++) {
      const code = dictionary.get(compressed[i]);
      
      if (code !== undefined) {
        current = code;
      } else {
        current += compressed[i];
      }
      
      if (current.length > 1) {
        decompressed += current;
        dictionary.set(String.fromCharCode(dictionary.size + 256), current);
        current = '';
      }
    }
    
    if (current) {
      decompressed += current;
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
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(btoa(reader.result));
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
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
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
        ratio: 1,
        algorithm: 'none'
      };
    }

    const originalSize = JSON.stringify(compressed.data).length;
    const compressedSize = compressed.data.length;

    return {
      originalSize,
      compressedSize,
      ratio: compressedSize / originalSize,
      algorithm: compressed.algorithm
    };
  }
}
