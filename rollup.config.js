import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.mjs',
  output: [
    {
      file: 'dist/ai.captain.mjs',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/ai.captain.umd.mjs',
      format: 'umd',
      name: 'AICaptain',
      sourcemap: true
    }
  ],
  plugins: [
    nodeResolve()
  ]
};
