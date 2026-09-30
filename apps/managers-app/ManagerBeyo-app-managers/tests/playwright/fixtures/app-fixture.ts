import { test as base, expect } from '@playwright/test';
import { AuthHelper } from './auth-fixture';
import { routeSystemReady } from '../helpers/system-control';

type AppFixtures = {
  auth: AuthHelper;
};

export const test = base.extend<AppFixtures>({
  page: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const known = [
          // Vite HMR noise
          '[HMR] Cannot apply update',
          // Chromium logs every non-2xx fetch() response as a console.error at the
          // browser level — including expected 401/403/429 error-path responses.
          // Real application errors (React errors, uncaught exceptions) never
          // produce this message; those are caught via page.on('pageerror').
          'Failed to load resource',
        ];
        if (!known.some((k) => msg.text().includes(k))) {
          errors.push(`[console.error] ${msg.text()}`);
        }
      }
    });

    page.on('pageerror', (err) => {
      errors.push(`[pageerror] ${err.message}`);
    });

    // Every page boots through the system gate: answer its control plane
    // READY unless the test routes another state.
    await routeSystemReady(page);

    await use(page);

    expect(errors, 'Console errors or uncaught exceptions occurred').toEqual([]);
  },

  auth: async ({ page }, use) => {
    await use(new AuthHelper(page));
  },
});

export { expect };
