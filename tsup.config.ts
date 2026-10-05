import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // Dual output on purpose: Create React App 5 / webpack 4 era projects and
  // anything still on `require` cannot consume an ESM-only package, and that is
  // exactly the audience this library exists for.
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2021',
  external: ['react', 'react-dom'],
});
