import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// react-mongol is linked from the repo root, which has its own React for tests.
// Dedupe so the demo and the library share one React instance.
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
});
