import type { Locator } from '@playwright/test';

import { expect, test } from '../../fixtures/app-fixture';

// Elements inside a PullToRefresh container are guarded by use-gesture's
// `filterTaps`, which misclassifies Playwright's synthetic MOUSE click as a
// drag under mobile emulation and stops the click. Tap on touch projects,
// click elsewhere.
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

const READY_RECENT_ID = 'task_ready_recent';
const READY_BACKFILLED_ID = 'task_ready_backfilled';
const RESOLVED_ID = 'task_resolved';
const WORKING_ID = 'task_working';

type TaskRowOverrides = {
  client_id: string;
  task_scalar_id: number;
  state: string;
  ready_by_at?: string | null;
  closed_at?: string | null;
  completed_at?: string | null;
};

function taskRow(overrides: TaskRowOverrides) {
  const {
    client_id: clientId,
    task_scalar_id: scalarId,
    state,
    ready_by_at: readyByAt = '2026-05-30',
    closed_at: closedAt = null,
    completed_at: completedAt = null,
  } = overrides;

  return {
    task: {
      client_id: clientId,
      task_scalar_id: scalarId,
      task_type: 'return',
      priority: 'normal',
      state,
      title: null,
      summary: null,
      return_source: 'after_purchase',
      item_location: null,
      return_method: null,
      fulfillment_method: null,
      additional_details: null,
      ready_by_at: readyByAt,
      scheduled_start_at: null,
      scheduled_end_at: null,
      customer_id: null,
      primary_phone_number: null,
      secondary_phone_number: null,
      primary_email: null,
      secondary_email: null,
      assortment: null,
      address: null,
      created_at: '2026-05-24T00:00:00.000Z',
      updated_at: null,
      closed_at: closedAt,
      completed_at: completedAt,
      is_deleted: false,
      deleted_at: null,
      post_handling: null,
    },
    primary_item: null,
    item_images: [],
    last_interacted_at: null,
    upholstery_group_key: null,
    upholstery_group_image_url: null,
    upholstery_group_upholstery_id: null,
    upholstery_group_inventory: null,
  };
}

const READY_RECENT = taskRow({
  client_id: READY_RECENT_ID,
  task_scalar_id: 901,
  state: 'ready',
  completed_at: '2026-08-15T10:00:00.000Z',
});

// Pre-migration tail: no completion was ever recorded, so it sorts last and
// falls back to showing its ready-by date.
const READY_BACKFILLED = taskRow({
  client_id: READY_BACKFILLED_ID,
  task_scalar_id: 902,
  state: 'ready',
  completed_at: null,
});

const RESOLVED = taskRow({
  client_id: RESOLVED_ID,
  task_scalar_id: 903,
  state: 'resolved',
  closed_at: '2026-08-14T09:00:00.000Z',
  completed_at: '2026-08-14T09:00:00.000Z',
});

const WORKING = taskRow({
  client_id: WORKING_ID,
  task_scalar_id: 904,
  state: 'working',
});

/**
 * Serves the list, and records every request URL so the spec can assert on the
 * params the frontend actually sent. Which rows come back is decided by the
 * `task_states` in the request, so the fixture answers the same question the
 * backend would.
 */
async function mockTaskList(
  page: import('@playwright/test').Page,
  requestUrls: string[],
  options: { empty?: boolean } = {},
) {
  await page.route(/\/api\/v1\/tasks(?:\?.*)?$/, async (route) => {
    const url = route.request().url();
    requestUrls.push(url);

    const states = new URL(url).searchParams.get('task_states') ?? '';
    const items = options.empty
      ? []
      : states.includes('ready') || states.includes('resolved')
        ? [
            ...(states.includes('ready') ? [READY_RECENT] : []),
            ...(states.includes('resolved') ? [RESOLVED] : []),
            ...(states.includes('ready') ? [READY_BACKFILLED] : []),
          ]
        : [WORKING];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          tasks_pagination: { items, limit: 25, offset: 0, has_more: false },
        },
      }),
    });
  });
}

/** The params of the most recent list request, or an empty set if none yet. */
function lastParams(requestUrls: string[]): URLSearchParams {
  const url = requestUrls.at(-1);
  return url ? new URL(url).searchParams : new URLSearchParams();
}

function lastParam(requestUrls: string[], key: string): string | null {
  return lastParams(requestUrls).get(key);
}

function pill(
  page: import('@playwright/test').Page,
  state: string,
): Locator {
  return page.getByTestId(`task-state-option-${state}`);
}

async function openTasks(page: import('@playwright/test').Page) {
  await page.getByTestId('tab-tasks').click();
  await expect(page).toHaveURL(/\/tasks$/);
}

test.describe('tasks recently-completed sorting', () => {
  test.skip(
    !hasCredentials,
    'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run.',
  );

  test('completion pills clear the other states and switch the sort', async ({
    page,
    auth,
  }) => {
    const requestUrls: string[] = [];
    await mockTaskList(page, requestUrls);

    await auth.signIn();
    await openTasks(page);

    // An in-progress cohort leaves the backend on its default ordering.
    await press(page.getByTestId('task-state-option-working'));
    await expect
      .poll(() => lastParam(requestUrls, 'task_states'))
      .toBe('working');
    expect(lastParam(requestUrls, 'order_by')).toBeNull();

    // Selecting ready evicts working and asks for the completion ordering.
    await press(page.getByTestId('task-state-option-ready'));
    await expect
      .poll(() => lastParam(requestUrls, 'order_by'))
      .toBe('recently_completed');
    expect(lastParam(requestUrls, 'task_states')).toBe('ready');
    expect(lastParam(requestUrls, 'not_task_states')).toBeNull();
    await expect(pill(page, 'working')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByTestId(`tasks-card-${WORKING_ID}`)).toHaveCount(0);

    // ready and resolved are a pair — both stay selected.
    await press(page.getByTestId('task-state-option-resolved'));
    await expect
      .poll(() => lastParam(requestUrls, 'task_states'))
      .toBe('ready,resolved');
    expect(lastParam(requestUrls, 'order_by')).toBe('recently_completed');
    await expect(pill(page, 'ready')).toHaveAttribute('aria-pressed', 'true');
    await expect(pill(page, 'resolved')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId(`tasks-card-${RESOLVED_ID}`)).toBeVisible();

    // Going back to an in-progress state drops the whole completion cohort.
    // `stalled` rather than `working`, which is already in the query cache from
    // the first step and would correctly be served without a new request.
    await press(page.getByTestId('task-state-option-stalled'));
    await expect
      .poll(() => lastParam(requestUrls, 'task_states'))
      .toBe('stalled');
    expect(lastParam(requestUrls, 'order_by')).toBeNull();
    await expect(pill(page, 'ready')).toHaveAttribute('aria-pressed', 'false');
    await expect(pill(page, 'resolved')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByTestId(`tasks-card-${WORKING_ID}`)).toBeVisible();
  });

  test('each card shows the date that matches its state', async ({
    page,
    auth,
  }) => {
    const requestUrls: string[] = [];
    await mockTaskList(page, requestUrls);

    await auth.signIn();
    await openTasks(page);

    await press(page.getByTestId('task-state-option-working'));
    await expect(
      page.getByTestId(`tasks-card-date-${WORKING_ID}`),
    ).toHaveAttribute('data-date-kind', 'ready_by');

    await press(page.getByTestId('task-state-option-ready'));
    await press(page.getByTestId('task-state-option-resolved'));

    await expect(
      page.getByTestId(`tasks-card-date-${READY_RECENT_ID}`),
    ).toHaveAttribute('data-date-kind', 'completed');
    await expect(
      page.getByTestId(`tasks-card-date-${RESOLVED_ID}`),
    ).toHaveAttribute('data-date-kind', 'closed');
    // No completion was ever recorded, so it falls back to its ready-by date.
    await expect(
      page.getByTestId(`tasks-card-date-${READY_BACKFILLED_ID}`),
    ).toHaveAttribute('data-date-kind', 'ready_by');
  });

  test('an empty completion cohort renders the end of the list', async ({
    page,
    auth,
  }) => {
    const requestUrls: string[] = [];
    await mockTaskList(page, requestUrls, { empty: true });

    await auth.signIn();
    await openTasks(page);

    await press(page.getByTestId('task-state-option-ready'));
    await expect
      .poll(() => lastParam(requestUrls, 'order_by'))
      .toBe('recently_completed');

    await expect(page.getByTestId('tasks-list')).toBeVisible();
    await expect(page.locator('[data-testid^="tasks-card-"]')).toHaveCount(0);
  });
});
