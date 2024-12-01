// Import the functions to be tested
import { windowAI } from './window.ai.mock.mjs';
import {
  FileReader,
  TextEncoder,
  Blob,
  CompressionStream,
  DecompressionStream,
  Response,

} from './browser.mock.mjs';

// Set up browser API mocks
globalThis.ai = windowAI;
globalThis.FileReader = FileReader;
globalThis.TextEncoder = TextEncoder;
globalThis.Blob = Blob;
globalThis.CompressionStream = CompressionStream;
globalThis.DecompressionStream = DecompressionStream;
globalThis.Response = Response;



import "./fallback.mjs";
import "./validation.mjs";
import "./session.mjs";
import "./capabilities.mjs";
import "./template-system.mjs";
import "./distributed-cache.mjs";
import "./performance-analytics.mjs";
import "./composition-chains.mjs";
import "./create-window-chain.mjs";
import "./cache-compression.mjs";
