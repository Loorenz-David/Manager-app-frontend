import { expect, test } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

const TASK_ID = 'task_force_ready_test';

function makeTaskDetailResponse(state: string) {
  return {
    ok: true,
    warnings: [],
    data: {
      task: {
        client_id: TASK_ID,
        task_scalar_id: 909,
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
        ready_by_at: null,
        scheduled_start_at: null,
        scheduled_end_at: null,
        customer_id: null,
        primary_phone_number: null,
        secondary_phone_number: null,
        primary_email: null,
        secondary_email: null,
        assortment: null,
        address: {},
        created_at: '2026-08-01T00:00:00.000Z',
        updated_at: null,
        closed_at: null,
        is_deleted: false,
        deleted_at: null,
        post_handling: [],
      },
      item: null,
      item_images: [],
      task_notes: [],
      unread_message_count: 0,
    },
  };
}

function makeStep(clientId: string, state: string, sequenceOrder: number) {
  return {
    client_id: clientId,
    task_id: TASK_ID,
    state,
    readiness_status: 'ready',
    sequence_order: sequenceOrder,
    working_section_id: `ws_${sequenceOrder}`,
    assigned_worker_id: null,
    total_dependencies: 0,
    completed_dependencies: 0,
    working_section_name_snapshot: `Section ${sequenceOrder}`,
    assigned_worker_display_name_snapshot: null,
    created_at: '2026-08-01T00:00:00.000Z',
    closed_at: null,
    ready_by_at: null,
    total_working_seconds: 0,
    total_pause_seconds: 0,
    total_ended_shift_seconds: 0,
    total_working_count: 0,
    total_pause_count: 0,
    total_ended_shift_count: 0,
    total_issues_count: 0,
    total_issues_resolved_count: 0,
    total_cost_minor: null,
    recorded_time_marked_wrong: false,
    latest_state_records: null,
  };
}

const STEPS_RESPONSE = {
  ok: true,
  warnings: [],
  data: {
    steps_pagination: {
      items: [
        makeStep('tsp_open_1', 'working', 1),
        makeStep('tsp_open_2', 'pending', 2),
        // Already terminal — the backend leaves it alone, so it must not be listed.
        makeStep('tsp_done', 'completed', 3),
      ],
      has_more: false,
      limit: 50,
      offset: 0,
    },
  },
};

test.describe('Force task ready', () => {
  test('manager forces a task ready with a reason from the task actions menu', async ({
    page,
    auth,
  }) => {
    test.skip(
      !hasCredentials,
      'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run',
    );

    await auth.signIn();
    await expect(page.getByTestId('app-shell')).toBeVisible();

    let taskState = 'working';
    let forceRequestBody: unknown = null;

    await page.route(`**/api/v1/tasks/${TASK_ID}/force-ready`, async (route) => {
      forceRequestBody = route.request().postDataJSON();
      taskState = 'ready';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            client_id: TASK_ID,
            state: 'ready',
            skipped_step_ids: ['tsp_open_1', 'tsp_open_2'],
          },
        }),
      });
    });

    await page.route('**/api/v1/tasks/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/steps/counts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            warnings: [],
            data: {
              counts_by_state: {
                pending: 1,
                working: 1,
                paused: 0,
                blocked: 0,
                completed: 1,
                skipped: 0,
                failed: 0,
                cancelled: 0,
              },
            },
          }),
        });
        return;
      }

      if (url.includes('/steps')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(STEPS_RESPONSE),
        });
        return;
      }

      if (url.includes('/flow-records')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            warnings: [],
            data: {
              flow_records: [],
              flow_records_pagination: { has_more: false, limit: 50, offset: 0 },
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeTaskDetailResponse(taskState)),
      });
    });

    await page.getByTestId('tab-tasks').click();
    await expect(page).toHaveURL(/\/tasks$/);

    await page.locator('[data-testid^="tasks-card-actions-"]').first().click();
    await expect(page.getByTestId('task-actions-force-ready')).toBeVisible();

    await page.getByTestId('task-actions-force-ready').click();
    await expect(page.getByTestId('force-task-ready-slide')).toBeVisible();

    // Only the two open steps are listed as impacted.
    await expect(
      page.getByTestId('force-task-ready-step-box-tsp_open_1'),
    ).toBeVisible();
    await expect(
      page.getByTestId('force-task-ready-step-box-tsp_open_2'),
    ).toBeVisible();
    await expect(
      page.getByTestId('force-task-ready-step-box-tsp_done'),
    ).toHaveCount(0);

    // Reason is mandatory — the confirm stays disabled until one is typed.
    await expect(
      page.getByTestId('force-task-ready-confirm-button'),
    ).toBeDisabled();

    await page
      .getByTestId('force-task-ready-reason-input')
      .fill('Customer withdrew the return; item already back on the floor.');

    const confirmButton = page.getByTestId('force-task-ready-confirm-button');
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    await expect(page.getByTestId('force-task-ready-slide')).toHaveCount(0);

    expect(forceRequestBody).toEqual({
      reason: 'Customer withdrew the return; item already back on the floor.',
      mark_inaccurate: true,
    });
  });

  test('a 409 keeps the page open and shows the server message', async ({
    page,
    auth,
  }) => {
    test.skip(
      !hasCredentials,
      'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run',
    );

    await auth.signIn();
    await expect(page.getByTestId('app-shell')).toBeVisible();

    await page.route(`**/api/v1/tasks/${TASK_ID}/force-ready`, (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: 'Task is already in a terminal state.',
        }),
      }),
    );

    await page.route('**/api/v1/tasks/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/steps') && !url.includes('/steps/counts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(STEPS_RESPONSE),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeTaskDetailResponse('working')),
      });
    });

    await page.getByTestId('tab-tasks').click();
    await page.locator('[data-testid^="tasks-card-actions-"]').first().click();
    await page.getByTestId('task-actions-force-ready').click();

    await page
      .getByTestId('force-task-ready-reason-input')
      .fill('Handled off-system.');

    const confirmButton = page.getByTestId('force-task-ready-confirm-button');
    await confirmButton.click();

    await expect(page.getByTestId('force-task-ready-error')).toHaveText(
      'Task is already in a terminal state.',
    );
    await expect(page.getByTestId('force-task-ready-slide')).toBeVisible();
    await expect(
      page.getByTestId('force-task-ready-reason-input'),
    ).toHaveValue('Handled off-system.');
  });
});
