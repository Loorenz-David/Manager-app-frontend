import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://api.test'),
  },
  test: {
    environment: 'jsdom',
    include: ['packages/api-client/src/**/*.test.ts'],
    restoreMocks: true,
  },
});
