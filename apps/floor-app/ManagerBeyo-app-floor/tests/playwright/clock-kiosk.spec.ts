import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture';

function encodeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' }),
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

type KioskBackendOptions = {
  initiallyClockedIn?: boolean;
  autoReturnSeconds?: number;
  currentDelayMs?: number;
  transitionedSteps?: number;
};

async function mockAuthenticatedKiosk(
  page: Page,
  {
    initiallyClockedIn = false,
    autoReturnSeconds = 12,
    currentDelayMs = 0,
    transitionedSteps = 0,
  }: KioskBackendOptions = {},
) {
  const workspaceId = 'wrk_clock_kiosk';
  const workerId = 'usr_marco';
  const accessToken = encodeJwt({
    user_id: 'usr_floor_manager',
    username: 'Floor Manager',
    workspace_id: workspaceId,
    workspace_name: 'Beyo Workshop',
    workspace_role_id: 'wrole_floor_manager',
    workspace_role_name: 'manager',
    role_name: 'manager',
    app_scope: 'floor',
    time_zone: 'Europe/Stockholm',
    backend_permissions: [],
    ui: {
      apps: [],
      pages: [],
      buttons: [],
      actions: [],
      query_filters: [],
    },
    jti: 'clock-kiosk-e2e',
    exp: 4_102_444_800,
  });

  let clockedIn = initiallyClockedIn;
  let currentRequests = 0;
  let clockInRequests = 0;
  let clockOutRequests = 0;

  await page.addInitScript(
    ({ token, seconds }) => {
      localStorage.setItem('beyo.floor.access_token', token);
      localStorage.setItem(
        'beyo.floor.device-config',
        JSON.stringify({
          state: {
            terminalLabel: 'TERMINAL 04 · BAY B',
            autoReturnSeconds: seconds,
          },
          version: 1,
        }),
      );
    },
    { token: accessToken, seconds: autoReturnSeconds },
  );

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          user: {
            client_id: 'usr_floor_manager',
            email: 'manager@example.com',
            username: 'Floor Manager',
          },
        },
        warnings: [],
      }),
    });
  });

  await page.route(
    '**/api/v1/users?role=worker&compact=true&limit=200',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            users: [
              {
                client_id: workerId,
                username: 'Marco Silva',
                profile_picture: null,
                role: { name: 'Assembly' },
                clock_in_code: '4821',
                email: 'marco@shop.com',
              },
            ],
          },
          warnings: [],
        }),
      });
    },
  );

  await page.route('**/api/v1/worker-shifts/current?**', async (route) => {
    currentRequests += 1;
    expect(new URL(route.request().url()).searchParams.get('user_id')).toBe(
      workerId,
    );
    if (currentDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, currentDelayMs));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          user_id: workerId,
          clocked_in: clockedIn,
          shift_started_at: clockedIn
            ? '2026-07-29T06:58:00.000Z'
            : null,
          state: clockedIn ? 'idle' : null,
          state_entered_at: null,
          pause_reason: null,
          declared_state: null,
        },
        warnings: [],
      }),
    });
  });

  await page.route('**/api/v1/worker-shifts/clock-in', async (route) => {
    clockInRequests += 1;
    expect(route.request().postDataJSON()).toEqual({ user_id: workerId });
    clockedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { action: 'clock_in', user_id: workerId },
        warnings: [],
      }),
    });
  });

  await page.route('**/api/v1/worker-shifts/clock-out', async (route) => {
    clockOutRequests += 1;
    expect(route.request().postDataJSON()).toEqual({ user_id: workerId });
    clockedIn = false;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          action: 'clock_out',
          user_id: workerId,
          transitioned_steps: transitionedSteps,
          analytics: {
            date: '2026-07-29',
            timeline: {
              working_seconds: 3600,
              pause_seconds: 0,
              ended_shift_seconds: 0,
              idle_seconds: 0,
              completed_count: 99,
            },
          },
        },
        warnings: [],
      }),
    });
  });

  await page.goto('/');
  await expect(page.getByTestId('keypad-screen')).toBeVisible();

  return {
    get currentRequests() {
      return currentRequests;
    },
    get clockInRequests() {
      return clockInRequests;
    },
    get clockOutRequests() {
      return clockOutRequests;
    },
  };
}

test('clock-kiosk: physical keypad completes the clock-in journey', async ({
  page,
}) => {
  await page.clock.install({
    time: new Date('2026-07-29T13:00:00.000Z'),
  });
  const backend = await mockAuthenticatedKiosk(page, { currentDelayMs: 800 });

  await page.keyboard.type('4821');
  await expect(page.getByTestId('identity-confirm-screen')).toBeVisible();
  await expect(page.getByTestId('keypad-screen')).toBeAttached();
  await expect(page.getByTestId('code-cell')).toHaveCount(4);
  await expect(page.getByTestId('confirm-action')).toHaveText('Clock in now');
  const confirmPaperColor = await page
    .getByTestId('rise-surface')
    .getByTestId('kiosk-frame')
    .locator(':scope > div')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(confirmPaperColor).not.toBe('rgba(0, 0, 0, 0)');

  await page.getByTestId('confirm-action').click();

  await expect(page.getByTestId('result-screen-in')).toBeVisible();
  await expect(page.getByTestId('result-greeting')).toHaveText(
    'Good afternoon, Marco',
  );
  const resultPaperColor = await page
    .getByTestId('rise-surface')
    .last()
    .getByTestId('kiosk-frame')
    .locator(':scope > div')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(resultPaperColor).toBe(confirmPaperColor);
  await expect(page.getByTestId('dark-time-plate')).toContainText(
    'CLOCKED IN AT',
  );
  expect(backend.currentRequests).toBe(2);
  expect(backend.clockInRequests).toBe(1);

  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('result-screen-in')).toBeAttached();
  await expect(page.getByTestId('keypad-screen')).toBeVisible();
  await expect(page.getByTestId('rise-surface')).toHaveCount(0);
  await expect(page.getByTestId('code-cell')).toHaveText(['', '', '', '']);
});

test('clock-kiosk: clock-out renders the plain result and stopped-task notice', async ({
  page,
}) => {
  const backend = await mockAuthenticatedKiosk(page, {
    initiallyClockedIn: true,
    transitionedSteps: 2,
  });

  for (const digit of ['4', '8', '2', '1']) {
    await page.getByTestId(`keypad-key-${digit}`).click();
  }
  await expect(page.getByTestId('confirm-action')).toHaveText('Clock out now');
  await expect(page.getByTestId('confirm-context-row')).toContainText(
    'Clocked in at',
  );
  await page.getByTestId('confirm-action').click();

  await expect(page.getByTestId('result-screen-out')).toBeVisible();
  await expect(page.getByTestId('result-greeting')).toHaveText(
    'Shift complete, Marco',
  );
  await expect(page.getByTestId('result-notice')).toHaveText(
    '2 active tasks were stopped',
  );
  await expect(page.getByText('99', { exact: true })).toHaveCount(0);
  expect(backend.currentRequests).toBe(2);
  expect(backend.clockOutRequests).toBe(1);
});

test('clock-kiosk: wrong code uses the generic local error and clears', async ({
  page,
}) => {
  const backend = await mockAuthenticatedKiosk(page);

  for (const digit of ['9', '9', '9', '9']) {
    await page.getByTestId(`keypad-key-${digit}`).click();
  }

  await expect(page.getByTestId('code-cells')).toHaveClass(/kiosk-shake/);
  await expect(page.getByTestId('keypad-error')).toHaveText(
    'No worker matches this code or email',
  );
  await expect(page.getByTestId('code-cell')).toHaveText(['', '', '', '']);
  expect(backend.currentRequests).toBe(0);
});

test('clock-kiosk: email fallback matches case-insensitively without identify traffic', async ({
  page,
}) => {
  const backend = await mockAuthenticatedKiosk(page);

  await page.getByTestId('clock-with-email').click();
  await page.getByTestId('email-input').fill('  MARCO@SHOP.COM  ');
  await page.getByTestId('email-submit').click();
  await expect(page.getByTestId('confirm-name')).toHaveText('Marco Silva');
  await expect(page.getByTestId('confirm-action')).toHaveText('Clock in now');
  expect(backend.currentRequests).toBe(1);

  await page.getByTestId('confirm-action').click();
  await expect(page.getByTestId('result-screen-in')).toBeVisible();
  expect(backend.currentRequests).toBe(2);
});

test('clock-kiosk: result timeout atomically resets to a cleared keypad', async ({
  page,
}) => {
  await mockAuthenticatedKiosk(page, { autoReturnSeconds: 4 });

  await page.keyboard.type('4821');
  await expect(page.getByTestId('confirm-action')).toHaveText('Clock in now');
  await page.getByTestId('confirm-action').click();
  await expect(page.getByTestId('auto-return-countdown')).toHaveText(
    'Returning to the keypad in 4s',
  );

  await expect(page.getByTestId('keypad-screen')).toBeVisible({
    timeout: 7_000,
  });
  await expect(page.getByTestId('rise-surface')).toHaveCount(0);
  await expect(page.getByTestId('code-cell')).toHaveText(['', '', '', '']);
});

test('clock-kiosk: device settings accepts digits and blocks kiosk keyboard input', async ({
  page,
}) => {
  await mockAuthenticatedKiosk(page);

  const identity = page.getByTestId('kiosk-header-identity');
  await identity.dispatchEvent('pointerdown', { button: 0 });
  await page.waitForTimeout(650);
  await identity.dispatchEvent('pointerup', { button: 0 });

  await expect(page.getByText('Terminal settings', { exact: true })).toBeVisible();
  const autoReturnInput = page.getByTestId('device-auto-return-input');
  await autoReturnInput.selectText();
  await autoReturnInput.pressSequentially('30');
  await expect(autoReturnInput).toHaveValue('30');

  await page.getByText('Terminal settings', { exact: true }).click();
  await page.keyboard.type('4821');

  await expect(page.getByTestId('identity-confirm-screen')).toHaveCount(0);
  await expect(page.getByTestId('device-settings-save')).toBeVisible();
});
