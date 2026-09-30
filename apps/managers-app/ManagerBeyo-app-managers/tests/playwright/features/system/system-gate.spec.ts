import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures/app-fixture';
import { routeSystemControl, routeSystemHtml } from '../../helpers/system-control';

/** Counts every request the page sends to the backend API (any origin). */
function countApiRequests(page: Page): { readonly count: number } {
  const counter = { count: 0 };
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) counter.count += 1;
  });
  return counter;
}

/** No session to restore: the refresh answers with a credential verdict. */
async function routeNoSession(page: Page): Promise<{ readonly refreshCalls: number }> {
  let refreshCalls = 0;
  await page.route('**/api/v1/auth/refresh**', async (route) => {
    refreshCalls += 1;
    const origin = route.request().headers().origin ?? '*';
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        ok: false,
        error: 'Invalid refresh token.',
        code: 'auth_refresh_rejected',
      }),
    });
  });
  return {
    get refreshCalls() {
      return refreshCalls;
    },
  };
}

test.describe('System gate (managers)', () => {
  test('boots through SLEEPING -> wake -> STARTING -> READY to the sign-in page, with one wake', async ({
    page,
  }) => {
    const system = await routeSystemControl(page, 'SLEEPING');
    const session = await routeNoSession(page);

    await page.goto('/');

    await expect(page.getByTestId('system-gate-starting').or(page.getByTestId('system-gate-sleeping'))).toBeVisible();
    await expect.poll(() => system.wakeCalls).toBe(1);
    await expect(page.getByTestId('system-gate-starting')).toBeVisible();
    await expect(page.getByTestId('system-gate-phase')).toHaveText('Starting the database');
    expect(session.refreshCalls).toBe(0);
    await expect(page.getByTestId('auth-email-input')).toHaveCount(0);

    system.setState('READY');

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByTestId('auth-email-input')).toBeVisible();
    await expect(page.getByTestId('system-gate-starting')).toHaveCount(0);
    expect(session.refreshCalls).toBe(1);
    expect(system.wakeCalls).toBe(1);
  });

  test('fails closed on a text/html /system/status: the app never renders', async ({ page }) => {
    const html = await routeSystemHtml(page);
    const api = countApiRequests(page);

    await page.goto('/');

    await expect(page.getByTestId('system-gate-failed')).toBeVisible();
    await page.waitForTimeout(3_500);
    await page.getByTestId('system-gate-retry').click();
    await page.waitForTimeout(500);

    await expect(page.getByTestId('system-gate-failed')).toBeVisible();
    await expect(page.getByTestId('auth-email-input')).toHaveCount(0);
    expect(api.count).toBe(0);
    expect(html.wakeCalls).toBe(0);
  });

  test('a session check that is unavailable at boot never lands on sign-in until the backend answers', async ({
    page,
  }) => {
    let refresh: 'auth_unavailable' | 'rejected' = 'auth_unavailable';
    let refreshCalls = 0;
    await page.route('**/api/v1/auth/refresh**', async (route) => {
      refreshCalls += 1;
      const origin = route.request().headers().origin ?? '*';
      await route.fulfill({
        status: refresh === 'auth_unavailable' ? 503 : 401,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify(
          refresh === 'auth_unavailable'
            ? { ok: false, error: 'Auth unavailable.', code: 'auth_unavailable' }
            : { ok: false, error: 'Invalid refresh token.', code: 'auth_refresh_rejected' },
        ),
      });
    });

    await page.goto('/');

    await expect.poll(() => refreshCalls).toBeGreaterThanOrEqual(1);
    // The provider reported the raw refresh's outage to the gate.
    await expect(page.getByTestId('system-gate-reconnecting')).toBeVisible();
    await expect(page.getByTestId('auth-email-input')).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/sign-in$/);

    // The backend answers again (here: no valid session) -> sign-in.
    refresh = 'rejected';
    await expect(page.getByTestId('auth-email-input')).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/sign-in$/);
    expect(refreshCalls).toBeGreaterThanOrEqual(2);
  });
});
