const isBrowser = typeof window !== 'undefined';
const ai = isBrowser ? window.ai : globalThis.ai;
export { ai }
export default ai;