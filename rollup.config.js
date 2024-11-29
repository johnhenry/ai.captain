import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/window-chain.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/window-chain.umd.js',
      format: 'umd',
      name: 'WindowChain',
      sourcemap: true
    }
  ],
  plugins: [
    nodeResolve()
  ]
};
