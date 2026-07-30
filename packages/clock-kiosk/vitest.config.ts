import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://api.test'),
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@clock-kiosk': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: [
      'packages/clock-kiosk/src/**/*.test.ts',
      'packages/clock-kiosk/src/**/*.test.tsx',
    ],
    restoreMocks: true,
  },
});
