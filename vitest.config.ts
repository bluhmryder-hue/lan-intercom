import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    deps: {
      inline: ['vitest-canvas-mock'],
    },
    // For Windows compatibility issues in CI, sometimes threadpool or similar might be needed,
    // but for now, the defaults should suffice for this browser-based logic.
  },
});
