// Mock FileReader
export class FileReader {
  constructor() {
    this.onload = null;
  }

  readAsBinaryString(blob) {
    setTimeout(() => {
      if (this.onload) {
        this.result = blob._data;
        this.onload();
      }
    }, 0);
  }

  readAsText(blob) {
    setTimeout(() => {
      if (this.onload) {
        this.result = blob._data;
        this.onload();
      }
    }, 0);
  }
}

// Mock TextEncoder
export class TextEncoder {
  encode(str) {
    return new Uint8Array([...str].map(c => c.charCodeAt(0)));
  }
}

// Mock Blob
export class Blob {
  constructor(parts) {
    this._data = parts.map(part => 
      part instanceof Uint8Array ? String.fromCharCode(...part) : String(part)
    ).join('');
  }

  stream() {
    return {
      pipeThrough: (transform) => {
        return {
          getReader: () => ({
            read: async () => {
              const result = transform.transform(this._data);
              return { done: true, value: result };
            }
          })
        };
      }
    };
  }
}

// Mock CompressionStream
export class CompressionStream {
  constructor(format) {
    this.format = format;
  }

  transform(data) {
    // Simple mock compression - just base64 encode
    return btoa(data);
  }
}

// Mock DecompressionStream
export class DecompressionStream {
  constructor(format) {
    this.format = format;
  }

  transform(data) {
    // Simple mock decompression - just base64 decode
    return atob(data);
  }
}

// Mock Response for streams
export class Response {
  constructor(stream) {
    this._stream = stream;
  }

  async blob() {
    const reader = this._stream.getReader();
    const { value } = await reader.read();
    return new Blob([value]);
  }
}

// Mock btoa and atob if not available in Node.js
if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = str => Buffer.from(str).toString('base64');
}

if (typeof globalThis.atob === 'undefined') {
  globalThis.atob = str => Buffer.from(str, 'base64').toString();
}
