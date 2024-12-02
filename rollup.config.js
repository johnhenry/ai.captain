import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.mjs',
  output: [
    {
      file: 'dist/window-chain.mjs',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/window-chain.umd.mjs',
      format: 'umd',
      name: 'WindowChain',
      sourcemap: true
    }
  ],
  plugins: [
    nodeResolve()
  ]
};
