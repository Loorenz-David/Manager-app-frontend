import { expect, test } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

function makeTaskDetailResponse(itemPosition: string | null) {
  return {
    ok: true,
    warnings: [],
    data: {
      task: {
        client_id: 'task_position_test',
        task_scalar_id: 201,
        task_type: 'internal',
        priority: 'normal',
        state: 'pending',
        title: null,
        summary: null,
        return_source: null,
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
        address: {},
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: null,
        closed_at: null,
        is_deleted: false,
        deleted_at: null,
      },
      item: {
        client_id: 'item_position_1',
        article_number: 'ART-POS-001',
        sku: null,
        state: 'pending',
        item_category_id: 'cat_other',
        quantity: 1,
        designer: null,
        height_in_cm: null,
        width_in_cm: null,
        depth_in_cm: null,
        item_value_minor: null,
        item_cost_minor: null,
        item_currency: null,
        item_position: itemPosition,
        external_id: null,
        external_url: null,
        external_source: null,
        external_order_id: null,
        item_category_snapshot: 'Other',
        item_major_category_snapshot: 'Other',
        created_at: '2026-06-01T00:00:00.000Z',
        created_by_id: null,
        updated_at: null,
        updated_by_id: null,
      },
      item_images: [],
      item_issues: [],
      item_upholstery: [],
      requirements: [],
      task_steps: [],
      task_notes: [],
      unread_message_count: 0,
    },
  };
}

test.describe('Item position sheet', () => {
  test('manager can edit item position from task detail', async ({
    page,
    auth,
  }) => {
    test.skip(!hasCredentials, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run');

    await auth.signIn();
    await expect(page.getByTestId('app-shell')).toBeVisible();

    let currentPosition: string | null = '5';
    let patchRequestBody: unknown = null;

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
              flow_records_pagination: { has_more: false, limit: 50, offset: 0 },
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeTaskDetailResponse(currentPosition)),
      });
    });

    await page.route('**/api/v1/items/item_position_1', async (route) => {
      patchRequestBody = route.request().postDataJSON();
      currentPosition = (patchRequestBody as { item_position?: string })
        .item_position ?? null;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, warnings: [], data: {} }),
      });
    });

    await page.getByTestId('tab-tasks').click();
    await expect(page).toHaveURL(/\/tasks$/);
    await page.locator('[data-testid^="tasks-card-body-"]').first().click();

    await expect(page.getByTestId('task-body-position-button')).toBeVisible();
    await expect(page.getByTestId('task-body-position-button')).toContainText('#5');

    await page.getByTestId('task-body-position-button').click();

    await expect(page.getByTestId('item-position-input')).toBeVisible();
    await expect(page.getByTestId('item-position-input')).toHaveValue('5');

    await page.getByTestId('item-position-input').fill('7');
    await page.getByTestId('item-position-save-button').click();

    await expect(page.getByTestId('item-position-input')).not.toBeVisible();
    expect(patchRequestBody).toEqual(
      expect.objectContaining({ item_position: '7' }),
    );
  });
});
