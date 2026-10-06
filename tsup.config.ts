import { defineConfig } from 'tsup';

export default defineConfig([
  {
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
    // khudam stays external and is loaded with import() on first use, so the
    // converter costs nothing until a reader switches to traditional script.
    external: ['react', 'react-dom', 'khudam'],
  },
  {
    // The <script> tag build for sites without a bundler: one file, no React.
    entry: { mongol: 'src/browser.ts', 'mongol-converter': 'src/browser-engine.ts' },
    format: ['iife'],
    outExtension: () => ({ js: '.global.js' }),
    minify: true,
    sourcemap: false,
    target: 'es2019',
    noExternal: [/.*/],
  },
]);
