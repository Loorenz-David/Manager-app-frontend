import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture';

/**
 * Controls INSIDE PullToRefresh need real taps on touch projects — the
 * use-gesture `filterTaps` drag handler swallows Playwright's synthetic
 * mouse clicks there (documented kiosk hazard; same workaround as the
 * workers-app suites). Non-touch projects keep plain clicks.
 */
async function pressControl(page: Page, testId: string): Promise<void> {
  const locator = page.getByTestId(testId);
  if (test.info().project.use.hasTouch) {
    await locator.tap();
  } else {
    await locator.click();
  }
}

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
  coldSurfaceLoad?: boolean;
  transitionedSteps?: number;
  analytics?: Record<string, unknown> | null;
  productionAdapters?: boolean;
};

async function mockAuthenticatedKiosk(
  page: Page,
  {
    initiallyClockedIn = false,
    autoReturnSeconds = 12,
    currentDelayMs = 0,
    coldSurfaceLoad = false,
    transitionedSteps = 0,
    productionAdapters = false,
    analytics = {
      date: '2026-07-29',
      timeline: {
        working_seconds: 3600,
        pause_seconds: 0,
        ended_shift_seconds: 0,
        idle_seconds: 0,
        completed_count: 99,
      },
    },
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
  let rosterRequests = 0;
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
      rosterRequests += 1;
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
          scheduled_shift: {
            start: '2026-07-29T05:00:00.000Z',
            end: '2026-07-29T13:30:00.000Z',
          },
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
          analytics,
        },
        warnings: [],
      }),
    });
  });

  const params = new URLSearchParams();
  if (productionAdapters) params.set('kiosk-adapters', 'production');
  if (coldSurfaceLoad) params.set('kiosk-cold-load', '1');
  await page.goto(params.size > 0 ? `/?${params}` : '/');
  await expect(page.getByTestId('keypad-screen')).toBeVisible();

  return {
    get rosterRequests() {
      return rosterRequests;
    },
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
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    const seen: string[] = [];
    const recordSkeletons = (root: ParentNode) => {
      for (const testId of [
        'surface-skeleton',
        'kiosk-surface-skeleton',
      ]) {
        if (
          root instanceof Element &&
          root.getAttribute('data-testid') === testId
        ) {
          seen.push(testId);
        }
        if (root.querySelector?.(`[data-testid="${testId}"]`)) {
          seen.push(testId);
        }
      }
    };
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) recordSkeletons(node);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    (
      window as typeof window & { __kioskSkeletonsSeen?: string[] }
    ).__kioskSkeletonsSeen = seen;
  });

  await page.keyboard.type('4821');
  await expect(page.getByTestId('identity-confirm-screen')).toBeVisible();
  await expect(page.getByTestId('keypad-screen')).toBeAttached();
  await expect(page.getByTestId('code-cell')).toHaveCount(4);
  await expect(page.getByTestId('confirm-action')).toHaveText('Clock in now');
  await expect(page.getByTestId('confirm-context-row')).toContainText(
    "Today's shift",
  );
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
  await expect(page.getByTestId('plate-right')).toContainText('SCHEDULED');
  await expect(page.getByTestId('announcements-list')).toBeVisible();
  await expect(page.getByTestId('announcement-card')).toHaveCount(3);
  expect(backend.currentRequests).toBe(2);
  expect(backend.clockInRequests).toBe(1);
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & {
            __kioskSkeletonsSeen?: string[];
          }
        ).__kioskSkeletonsSeen ?? [],
    ),
  ).toEqual([]);

  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('result-screen-in')).toBeAttached();
  await expect(page.getByTestId('keypad-screen')).toBeVisible();
  await expect(page.getByTestId('rise-surface')).toHaveCount(0);
  await expect(page.getByTestId('code-cell')).toHaveText(['', '', '', '']);
});

test('clock-kiosk: a cold confirm chunk shows the kiosk skeleton inside the frame', async ({
  page,
}) => {
  await page.route('**/IdentityConfirmSurfacePage.tsx*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await mockAuthenticatedKiosk(page, { coldSurfaceLoad: true });

  await page.keyboard.type('4821');
  await expect(
    page.getByTestId('kiosk-frame').getByTestId('kiosk-surface-skeleton'),
  ).toBeVisible();
  await expect(page.getByTestId('identity-confirm-screen')).toBeVisible();
});

test('kiosk-summary: analytics null preserves the Phase 4 plain result', async ({
  page,
}) => {
  const backend = await mockAuthenticatedKiosk(page, {
    initiallyClockedIn: true,
    transitionedSteps: 2,
    analytics: null,
  });

  for (const digit of ['4', '8', '2', '1']) {
    await pressControl(page, `keypad-key-${digit}`);
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
  await expect(page.getByTestId('summary-screen')).toHaveCount(0);
  await expect(page.getByTestId('worked-today-plate')).toHaveCount(0);
  await expect(page.getByTestId('items-completed')).toHaveCount(0);
  await expect(page.getByTestId('week-bar-chart')).toHaveCount(0);
  await expect(page.getByTestId('rate-tile')).toHaveCount(0);
  expect(backend.currentRequests).toBe(2);
  expect(backend.clockOutRequests).toBe(1);
});

test('kiosk-summary: full analytics and showcase adapters render in breakpoint order', async ({
  page,
}) => {
  const backend = await mockAuthenticatedKiosk(page, {
    initiallyClockedIn: true,
    transitionedSteps: 2,
    analytics: {
      date: '2026-07-29',
      timeline: {
        working_seconds: 60,
        pause_seconds: 999_999,
        ended_shift_seconds: 0,
        idle_seconds: 0,
        completed_count: 7,
      },
      segments: [
        {
          start: '2026-07-29T06:58:00Z',
          end: '2026-07-29T06:58:00Z',
          state: 'started_shift',
          reason: null,
          is_open: false,
          manually_recorded: false,
          seconds: 0,
          steps: [],
        },
        {
          start: '2026-07-29T15:10:00Z',
          end: '2026-07-29T15:10:00Z',
          state: 'ended_shift',
          reason: null,
          is_open: false,
          manually_recorded: false,
          seconds: 0,
          steps: [],
        },
      ],
      segments_truncated: true,
      insights: [
        {
          code: 'working_time_vs_baseline',
          polarity: 'positive',
          metric: 'working_seconds',
          target_value: 29_520,
          baseline_value: 27_720,
          delta: 1_800,
          delta_pct: 6.5,
          sample_size: 12,
          severity: 'info',
        },
      ],
    },
  });

  await page.keyboard.type('4821');
  await expect(page.getByTestId('confirm-action')).toHaveText('Clock out now');
  await page.getByTestId('confirm-action').click();

  await expect(page.getByTestId('summary-screen')).toBeVisible();
  await expect(page.getByTestId('worked-today-value')).toHaveText('8h 12m');
  await expect(page.getByTestId('worked-today-plate')).toContainText('08:58');
  await expect(page.getByTestId('worked-today-plate')).toContainText('17:10');
  await expect(page.getByTestId('summary-notice')).toHaveText(
    '2 active tasks were stopped',
  );
  await expect(page.getByTestId('items-completed')).toBeVisible();
  await expect(page.getByTestId('week-bar-chart')).toBeVisible();
  await expect(page.getByTestId('rate-tile')).toBeVisible();
  await expect(page.getByTestId('insight-row')).toHaveCount(1);
  await expect(page.getByTestId('insight-row')).toContainText('+6.5%');

  const top = async (testId: string): Promise<number> => {
    const box = await page.getByTestId(testId).first().boundingBox();
    expect(box).not.toBeNull();
    return box!.y;
  };
  const workedTop = await top('worked-today-plate');
  const insightTop = await top('insight-row');
  const itemsTop = await top('items-completed');
  const weekTop = await top('week-bar-chart');
  const rateTop = await top('rate-tile');
  const viewport = page.viewportSize();

  if ((viewport?.width ?? 0) < 640) {
    expect(workedTop).toBeLessThan(insightTop);
    expect(insightTop).toBeLessThan(itemsTop);
    expect(itemsTop).toBeLessThan(weekTop);
  } else {
    expect(workedTop).toBeLessThan(itemsTop);
    expect(itemsTop).toBeLessThan(weekTop);
    expect(itemsTop).toBeLessThan(rateTop);
    expect(weekTop).toBeLessThan(insightTop);
    expect(rateTop).toBeLessThan(insightTop);
  }

  expect(backend.currentRequests).toBe(2);
  expect(backend.clockOutRequests).toBe(1);
});

test('kiosk-summary: production adapter defaults keep GAP tiles absent', async ({
  page,
}) => {
  const backend = await mockAuthenticatedKiosk(page, {
    initiallyClockedIn: true,
    transitionedSteps: 1,
    productionAdapters: true,
    analytics: {
      date: '',
      timeline: {},
      segments: [
        {
          start: '2026-07-29T06:58:00Z',
          end: '2026-07-29T06:58:00Z',
          state: 'started_shift',
          reason: null,
          is_open: false,
          seconds: 0,
        },
        {
          start: '2026-07-29T15:10:00Z',
          end: '2026-07-29T15:10:00Z',
          state: 'ended_shift',
          reason: null,
          is_open: false,
          seconds: 0,
        },
      ],
      insights: [
        {
          code: 'working_time_vs_baseline',
          polarity: 'positive',
          metric: 'working_seconds',
          target_value: 29_520,
          baseline_value: 27_720,
          delta: 1_800,
          delta_pct: 6.5,
          sample_size: 12,
          severity: 'info',
        },
      ],
    },
  });

  await page.keyboard.type('4821');
  await expect(page.getByTestId('confirm-action')).toHaveText('Clock out now');
  await page.getByTestId('confirm-action').click();

  await expect(page.getByTestId('summary-screen')).toBeVisible();
  await expect(page.getByTestId('worked-today-plate')).toBeVisible();
  await expect(page.getByTestId('summary-notice')).toHaveText(
    '1 active task was stopped',
  );
  await expect(page.getByTestId('insight-row')).toHaveCount(1);
  await expect(page.getByTestId('items-completed')).toHaveCount(0);
  await expect(page.getByTestId('week-bar-chart')).toHaveCount(0);
  await expect(page.getByTestId('rate-tile')).toHaveCount(0);
  expect(backend.clockOutRequests).toBe(1);
});

test('clock-kiosk: wrong code uses the generic local error and clears', async ({
  page,
}) => {
  const backend = await mockAuthenticatedKiosk(page);

  for (const digit of ['9', '9', '9', '9']) {
    await pressControl(page, `keypad-key-${digit}`);
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

  await pressControl(page, 'clock-with-email');
  await page.getByTestId('email-input').fill('  MARCO@SHOP.COM  ');
  await pressControl(page, 'email-submit');
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
