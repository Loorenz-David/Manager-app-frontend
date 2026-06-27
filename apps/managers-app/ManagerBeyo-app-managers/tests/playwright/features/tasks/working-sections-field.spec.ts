import { expect, test } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

test.describe('Task detail working sections field', () => {
  test('manager can view counts and open the working sections slide', async ({
    page,
    auth,
  }) => {
    test.skip(!hasCredentials, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run');

    await auth.signIn();
    await expect(page.getByTestId('app-shell')).toBeVisible();

    const taskId = 'task_working_sections_test';

    await page.route('**/api/v1/tasks?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            tasks_pagination: {
              items: [
                {
                  task: {
                    client_id: taskId,
                    task_scalar_id: 202,
                    task_type: 'return',
                    priority: 'normal',
                    state: 'pending',
                    title: null,
                    summary: null,
                    return_source: 'after_purchase',
                    item_location: null,
                    return_method: null,
                    fulfillment_method: 'delivery',
                    additional_details: null,
                    ready_by_at: '2026-05-30',
                    scheduled_start_at: null,
                    scheduled_end_at: null,
                    customer_id: null,
                    primary_phone_number: null,
                    secondary_phone_number: null,
                    primary_email: null,
                    secondary_email: null,
                    address: null,
                    created_at: '2026-05-24T00:00:00.000Z',
                    updated_at: null,
                    closed_at: null,
                    is_deleted: false,
                    deleted_at: null,
                  },
                  primary_item: {
                    client_id: 'item_1',
                    article_number: 'ART-WS-001',
                    sku: 'SKU-WS-001',
                    state: 'pending',
                    item_category_id: 'cat_seat_sofa',
                    quantity: 1,
                    designer: null,
                    height_in_cm: null,
                    width_in_cm: null,
                    depth_in_cm: null,
                    item_value_minor: null,
                    item_cost_minor: null,
                    item_currency: null,
                    item_position: null,
                    external_id: null,
                    external_url: null,
                    external_source: null,
                    external_order_id: null,
                    item_category_snapshot: 'Sofa',
                    item_major_category_snapshot: 'Seat',
                  },
                  item_images: [],
                },
              ],
              limit: 20,
              offset: 0,
              has_more: false,
            },
          },
        }),
      });
    });

    await page.route('**/api/v1/tasks/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/flow-records')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            warnings: [],
            data: {
              flow_records: [],
              flow_records_pagination: {
                has_more: false,
                limit: 50,
                offset: 0,
              },
            },
          }),
        });
        return;
      }

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
                working: 0,
                paused: 0,
                ended_shift: 0,
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
          body: JSON.stringify({
            ok: true,
            warnings: [],
            data: {
              steps_pagination: {
                items: [
                  {
                    client_id: 'step_1',
                    task_id: taskId,
                    state: 'pending',
                    readiness_status: 'ready',
                    sequence_order: 1,
                    working_section_id: 'ws_upholstery',
                    assigned_worker_id: 'usr_1',
                    total_dependencies: 0,
                    completed_dependencies: 0,
                    working_section_name_snapshot: 'Upholstery',
                    assigned_worker_display_name_snapshot: 'Alice Martin',
                    created_at: '2026-05-24T00:00:00.000Z',
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
                    latest_state_records: null,
                  },
                  {
                    client_id: 'step_2',
                    task_id: taskId,
                    state: 'completed',
                    readiness_status: 'ready',
                    sequence_order: 2,
                    working_section_id: 'ws_finishing',
                    assigned_worker_id: 'usr_2',
                    total_dependencies: 1,
                    completed_dependencies: 1,
                    working_section_name_snapshot: 'Finishing',
                    assigned_worker_display_name_snapshot: 'Bob Chen',
                    created_at: '2026-05-24T00:00:00.000Z',
                    closed_at: '2026-05-24T12:00:00.000Z',
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
                    latest_state_records: null,
                  },
                ],
                limit: 50,
                offset: 0,
                has_more: false,
              },
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            task: {
              client_id: taskId,
              task_scalar_id: 202,
              task_type: 'return',
              priority: 'normal',
              state: 'pending',
              title: null,
              summary: null,
              return_source: 'after_purchase',
              item_location: null,
              return_method: null,
              fulfillment_method: 'delivery',
              additional_details: null,
              ready_by_at: '2026-05-30',
              scheduled_start_at: null,
              scheduled_end_at: null,
              customer_id: null,
              primary_phone_number: null,
              secondary_phone_number: null,
              primary_email: null,
              secondary_email: null,
              address: {},
              created_at: '2026-05-24T00:00:00.000Z',
              updated_at: null,
              closed_at: null,
              is_deleted: false,
              deleted_at: null,
            },
            item: {
              client_id: 'item_1',
              article_number: 'ART-WS-001',
              sku: 'SKU-WS-001',
              state: 'pending',
              item_category_id: 'cat_seat_sofa',
              quantity: 1,
              designer: null,
              height_in_cm: null,
              width_in_cm: null,
              depth_in_cm: null,
              item_value_minor: null,
              item_cost_minor: null,
              item_currency: null,
              item_position: null,
              external_id: null,
              external_url: null,
              external_source: null,
              external_order_id: null,
              item_category_snapshot: 'Sofa',
              item_major_category_snapshot: 'Seat',
            },
            item_images: [],
            item_issues: [],
            item_upholstery: [],
            requirements: [],
            task_notes: [],
            unread_message_count: 0,
          },
        }),
      });
    });

    await page.getByTestId('tab-tasks').click();
    await expect(page).toHaveURL(/\/tasks$/);
    await page.getByTestId(`tasks-card-body-${taskId}`).click();

    await expect(page.getByTestId('task-working-sections-field')).toBeVisible();
    await expect(page.getByTestId('working-sections-assigned-count')).toHaveText('2 assigned');
    await expect(page.getByTestId('working-sections-completed-count')).toHaveText('1 completed');

    await page.getByTestId('task-working-sections-field').click();
    await expect(page.getByTestId('task-working-sections-slide-page')).toBeVisible();
    await expect(page.getByTestId('task-working-sections-slide-coming-soon')).toHaveText('Coming soon');
  });
});
