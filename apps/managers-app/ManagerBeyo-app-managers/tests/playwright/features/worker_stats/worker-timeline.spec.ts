import type { Locator, Page } from '@playwright/test';

import { test, expect } from '../../fixtures/app-fixture';

// Elements inside a PullToRefresh container are guarded by use-gesture's
// `filterTaps`, which misclassifies Playwright's synthetic MOUSE click as a
// drag under mobile emulation and stops the click (real devices and touch
// streams classify fine). Tap (real touch events) on touch projects, click
// elsewhere.
async function press(target: Locator): Promise<void> {
  if (test.info().project.use.hasTouch) {
    await target.tap();
  } else {
    await target.click();
  }
}

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

const WORKER_ID = 'usr_e2e_timeline';

const USER = {
  client_id: WORKER_ID,
  username: 'E2E Worker',
  profile_picture: null,
  last_online: null,
};

function envelope(data: unknown) {
  return JSON.stringify({ ok: true, data, warnings: [] });
}

function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Absolute ISO instant at a local wall-clock time today — matches how the
// calendar converts back to local minutes, in any host timezone.
function isoAt(hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function record(overrides: Record<string, unknown>) {
  return {
    record_id: 'ssr_1',
    step_id: 'tsp_1',
    task_id: 'tsk_1',
    working_section_id: 'wsec_1',
    working_section_name: 'Upholstery',
    item: { client_id: 'itm_1', article_number: 'ART-100', sku: 'SKU-100' },
    state: 'working',
    reason: null,
    entered_at: isoAt(7, 32),
    exited_at: isoAt(9, 15),
    is_open: false,
    ended_by: 'working',
    ...overrides,
  };
}

// Today's fixture day: started-shift marker → working (completes at 09:15) →
// manual paused (19m) → batch working with two tasks → idle (42m) →
// ended-shift marker at 13:35. Markers are zero-duration (start == end).
function timelineSegments() {
  return [
    {
      start: isoAt(7, 32),
      end: isoAt(7, 32),
      seconds: 0,
      state: 'started_shift',
      reason: null,
      is_open: false,
      manually_recorded: false,
      steps: [],
    },
    {
      start: isoAt(7, 32),
      end: isoAt(9, 15),
      seconds: 6180,
      state: 'working',
      reason: null,
      is_open: false,
      manually_recorded: false,
      steps: [record({ ended_by: 'completed', exited_at: isoAt(9, 15) })],
    },
    {
      start: isoAt(9, 15),
      end: isoAt(9, 34),
      seconds: 1140,
      state: 'paused',
      reason: 'waiting_for_upholstery',
      is_open: false,
      manually_recorded: true,
      steps: [
        record({
          record_id: 'ssr_2',
          state: 'paused',
          reason: 'waiting_for_upholstery',
          entered_at: isoAt(9, 15),
          exited_at: isoAt(9, 34),
        }),
      ],
    },
    {
      start: isoAt(9, 34),
      end: isoAt(10, 58),
      seconds: 5040,
      state: 'working',
      reason: null,
      is_open: false,
      steps: [
        record({
          record_id: 'ssr_3',
          entered_at: isoAt(9, 34),
          exited_at: isoAt(10, 58),
        }),
        record({
          record_id: 'ssr_4',
          step_id: 'tsp_2',
          task_id: 'tsk_2',
          item: { client_id: 'itm_2', article_number: 'ART-200', sku: null },
          entered_at: isoAt(9, 40),
          exited_at: isoAt(10, 58),
        }),
      ],
    },
    {
      start: isoAt(10, 58),
      end: isoAt(11, 40),
      seconds: 2520,
      state: 'idle',
      reason: null,
      is_open: false,
      steps: [],
    },
    {
      start: isoAt(13, 35),
      end: isoAt(13, 35),
      seconds: 0,
      state: 'ended_shift',
      reason: null,
      is_open: false,
      manually_recorded: false,
      steps: [],
    },
  ];
}

// Reconciles exactly with the segments above so the page's contract
// validation logs nothing.
function timelineTotals() {
  return {
    date_from: todayKey(),
    date_to: todayKey(),
    working_seconds: 11220,
    pause_seconds: 1140,
    ended_shift_seconds: 900,
    idle_seconds: 2520,
    completed_count: 1,
    pause_by_reason: { waiting_for_upholstery: 1140 },
  };
}

const EMPTY_PAGINATION = { has_more: false, limit: 50, offset: 0, total: 1 };

async function mockWorkerStats(
  page: Page,
  options: { emptySegments?: boolean } = {},
) {
  await page.route('**/api/v1/worker-stats/last-interacted-steps*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: envelope({
        workers: [{ user: USER, last_interacted_step: null, batch: null }],
        workers_pagination: EMPTY_PAGINATION,
      }),
    }),
  );
  await page.route('**/api/v1/worker-stats/insights*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: envelope({
        workers: [{ user: USER, insights: [] }],
        workers_pagination: EMPTY_PAGINATION,
      }),
    }),
  );
  // Roster totals (NOT the drill-down — that has the worker id in the path).
  await page.route('**/api/v1/worker-stats/linear-timeline*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: envelope({
        workers: [{ user: USER, timeline: timelineTotals() }],
        workers_pagination: EMPTY_PAGINATION,
      }),
    }),
  );
  // Drill-down: the drawable segments.
  await page.route(
    `**/api/v1/worker-stats/${WORKER_ID}/linear-timeline*`,
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: envelope(
          options.emptySegments
            ? {
                user: USER,
                timeline: {
                  ...timelineTotals(),
                  working_seconds: 0,
                  pause_seconds: 0,
                  ended_shift_seconds: 0,
                  idle_seconds: 0,
                  completed_count: 0,
                  pause_by_reason: {},
                },
                segments: [],
                segments_truncated: false,
              }
            : {
                user: USER,
                timeline: timelineTotals(),
                segments: timelineSegments(),
                segments_truncated: false,
              },
        ),
      }),
  );
}

async function openWorkerTimeline(page: Page) {
  await page.getByTestId('home-worker-stats-box').click();
  await expect(page.getByTestId('worker-stats-slide-page')).toBeVisible();
  await press(page.getByTestId(`worker-stats-timeline-row-${WORKER_ID}`));
  await expect(page.getByTestId('worker-timeline-slide-page')).toBeVisible();
}

test.describe('Worker timeline calendar', () => {
  test.beforeEach(async ({ auth }) => {
    test.skip(
      !hasCredentials,
      'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run',
    );
    await auth.signIn();
  });

  test('renders the timeline with state events, totals and markers', async ({
    page,
  }) => {
    await mockWorkerStats(page);
    await openWorkerTimeline(page);

    // Header identity + totals strip from the visible day's slices. (The
    // roster card beneath the slide also shows the name — scope to the page.)
    await expect(
      page.getByTestId('worker-timeline-slide-page').getByText('E2E Worker'),
    ).toBeVisible();
    const strip = page.getByTestId('timeline-totals-strip');
    await expect(strip).toContainText('3h 7m');
    await expect(strip).toContainText('19m');
    await expect(strip).toContainText('42m');

    // State events per the mockup styling contract.
    const workingBlocks = page.locator(
      '[data-testid^="timeline-event-working|"]',
    );
    await expect(workingBlocks).toHaveCount(2);
    await expect(workingBlocks.first()).toContainText('ART-100 · Upholstery');
    await expect(
      page.locator('[data-testid^="timeline-event-paused|"]'),
    ).toContainText('Paused · Waiting for upholstery');
    await expect(
      page.locator('[data-testid^="timeline-event-idle|"]'),
    ).toContainText('Idle · no activity detected');

    // Completion pill inside the first working event.
    await expect(page.getByText('ART-100 done')).toBeVisible();

    // Shift start/end render as zero-duration line markers, not blocks.
    await expect(
      page.locator('[data-testid^="timeline-shift-start-"]'),
    ).toContainText('Shift started 07:32');
    await expect(
      page.locator('[data-testid^="timeline-shift-end-"]'),
    ).toContainText('Shift ended 13:35');
    await expect(
      page.locator('[data-testid^="timeline-event-ended_shift|"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid^="timeline-event-started_shift|"]'),
    ).toHaveCount(0);
  });

  test('multi-record events open the record chooser; idle stays inert', async ({
    page,
  }) => {
    await mockWorkerStats(page);
    await openWorkerTimeline(page);

    // Idle events have no interaction target at all.
    await expect(
      page.locator('[data-testid^="timeline-event-hit-idle|"]'),
    ).toHaveCount(0);

    // The batch working block (2 tasks) opens the chooser, grouped by task.
    const hits = page.locator('[data-testid^="timeline-event-hit-working|"]');
    await expect(hits).toHaveCount(2);
    await hits.nth(1).click();

    await expect(page.getByTestId('worker-timeline-event-sheet')).toBeVisible();
    await expect(page.getByTestId('timeline-event-task-tsk_1')).toBeVisible();
    await expect(page.getByTestId('timeline-event-task-tsk_2')).toBeVisible();
    await expect(page.getByTestId('timeline-event-task-tsk_2')).toContainText(
      'ART-200',
    );
  });

  test('navigates dates and switches to three-day mode via the picker', async ({
    page,
  }) => {
    await mockWorkerStats(page);
    await openWorkerTimeline(page);

    // Navigation is the horizontal pager (drag): swipe right → previous day,
    // swipe left → back toward today (clamped). No header arrows. The pager
    // listens on pointer events, so drive it with dispatched pointer moves
    // (works identically on the touch and desktop projects).
    const pill = page.getByTestId('timeline-date-pill');
    const todayLabel = await pill.textContent();
    const pagerSwipe = (dxRatio: number) =>
      page.getByTestId('timeline-pager-viewport').evaluate((vp, ratio) => {
        const rect = vp.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const dx = rect.width * ratio;
        const opts = (x: number, buttons: number) => ({
          pointerId: 1,
          isPrimary: true,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          button: 0,
          buttons,
          bubbles: true,
          cancelable: true,
        });
        vp.dispatchEvent(new PointerEvent('pointerdown', opts(startX, 1)));
        for (let i = 1; i <= 10; i++) {
          vp.dispatchEvent(
            new PointerEvent('pointermove', opts(startX + (dx * i) / 10, 1)),
          );
        }
        vp.dispatchEvent(new PointerEvent('pointerup', opts(startX + dx, 0)));
      }, dxRatio);

    await pagerSwipe(0.5); // right → previous day
    await expect(pill).not.toHaveText(todayLabel ?? '');
    await pagerSwipe(-0.5); // left → back to today
    await expect(pill).toHaveText(todayLabel ?? '');

    // Date picker sheet: the 1-day/3-day toggle is the non-gesture mode switch.
    await pill.click();
    await expect(page.getByTestId('worker-timeline-date-sheet')).toBeVisible();
    await page.getByTestId('timeline-mode-threeDay').click();
    await expect(page.getByTestId('timeline-date-header-row')).toBeVisible();
    await expect(
      page.locator('[data-testid^="timeline-date-header-2"]'),
    ).toHaveCount(3);
  });

  test('renders a deliberate empty state when no activity was recorded', async ({
    page,
  }) => {
    await mockWorkerStats(page, { emptySegments: true });
    await openWorkerTimeline(page);

    // The empty card lives inside the current page (so it slides with the
    // pager) — neighbor pages render their own off-screen copies, so scope to
    // the visible (current = today) page.
    await expect(
      page
        .getByTestId(`timeline-page-${todayKey()}`)
        .getByTestId('timeline-empty-state'),
    ).toBeVisible();
    // The grid stays visible for time-of-day context.
    await expect(page.getByTestId('timeline-grid')).toBeVisible();
  });

  test('zoom controls scale the time axis (desktop) and hide on touch', async ({
    page,
  }) => {
    await mockWorkerStats(page);
    await openWorkerTimeline(page);

    // On touch devices the +/- control is hidden — pinch is the zoom there.
    if (test.info().project.use.hasTouch) {
      await expect(page.getByTestId('timeline-zoom-control')).toHaveCount(0);
      return;
    }

    const dayHeight = () =>
      page
        .locator('[data-testid^="timeline-day-"]')
        .first()
        .evaluate((el) => Math.round(el.getBoundingClientRect().height));

    await expect(page.getByTestId('timeline-zoom-control')).toBeVisible();
    const before = await dayHeight();
    await page.getByTestId('timeline-zoom-in').click();
    await expect.poll(dayHeight).toBeGreaterThan(before);

    // Zooming out returns below the starting scale (and clamps at the minimum).
    await page.getByTestId('timeline-zoom-out').click();
    await page.getByTestId('timeline-zoom-out').click();
    await expect.poll(dayHeight).toBeLessThan(before);
  });
});
