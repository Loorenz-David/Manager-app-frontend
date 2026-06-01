import { expect, test } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

test.describe('Task detail upholstery swap', () => {
  test('manager can swap the linked upholstery from task detail', async ({
    page,
    auth,
  }) => {
    test.skip(!hasCredentials, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run');

    await auth.signIn();
    await expect(page.getByTestId('app-shell')).toBeVisible();

    let currentUpholsteryId = 'upholstery_old';
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

      const taskId =
        url.match(/\/api\/v1\/tasks\/([^/?]+)/)?.[1] ?? 'task_upholstery_swap_test';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            task: {
              client_id: taskId,
              task_scalar_id: 101,
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
              article_number: 'ART-001',
              sku: 'SKU-001',
              state: 'pending',
              item_category_id: 'cat_seat_sofa',
              quantity: 1,
              designer: 'Example Designer',
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
            task_steps: [],
            task_notes: [],
            unread_message_count: 0,
          },
        }),
      });
    });

    await page.route('**/api/v1/items/item_1/upholstery', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            item_upholstery: [
              {
                client_id: 'item_upholstery_1',
                item_id: 'item_1',
                upholstery_id: currentUpholsteryId,
                name: currentUpholsteryId === 'upholstery_old' ? 'Velvet Blue' : 'Linen Sand',
                code: currentUpholsteryId === 'upholstery_old' ? 'VB-01' : 'LS-02',
                image_url: null,
                amount_meters: 2.5,
                source: 'internal',
                time_to_fix_in_seconds: null,
                active_requirement_id: 'requirement_1',
              },
            ],
            requirements: [
              {
                client_id: 'requirement_1',
                item_upholstery_id: 'item_upholstery_1',
                upholstery_inventory_id: 'inventory_1',
                amount_meters: 2.5,
                value_minor: null,
                currency: null,
                source: 'inventory',
                state: 'available',
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/v1/upholsteries**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            upholsteries: [
              {
                client_id: 'upholstery_old',
                name: 'Velvet Blue',
                code: 'VB-01',
                image_url: null,
                favorite: false,
                list_order: null,
                current_stored_amount_meters: '4.0',
                inventory_condition: 'available',
              },
              {
                client_id: 'upholstery_new',
                name: 'Linen Sand',
                code: 'LS-02',
                image_url: null,
                favorite: false,
                list_order: null,
                current_stored_amount_meters: '7.5',
                inventory_condition: 'available',
              },
            ],
            upholsteries_pagination: {
              has_more: false,
              limit: 50,
              offset: 0,
            },
          },
        }),
      });
    });

    await page.route('**/api/v1/upholsteries/*', async (route) => {
      const clientId = route.request().url().split('/').pop();
      const upholstery =
        clientId === 'upholstery_old'
          ? {
              client_id: 'upholstery_old',
              name: 'Velvet Blue',
              code: 'VB-01',
              image_url: null,
              favorite: false,
              list_order: null,
              current_stored_amount_meters: '4.0',
              inventory_condition: 'available',
            }
          : {
              client_id: 'upholstery_new',
              name: 'Linen Sand',
              code: 'LS-02',
              image_url: null,
              favorite: false,
              list_order: null,
              current_stored_amount_meters: '7.5',
              inventory_condition: 'available',
            };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: { upholstery },
        }),
      });
    });

    await page.route('**/api/v1/item-upholsteries/item_upholstery_1', async (route) => {
      patchRequestBody = route.request().postDataJSON();
      currentUpholsteryId = 'upholstery_new';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {},
        }),
      });
    });

    await page.getByTestId('tab-tasks').click();
    await expect(page).toHaveURL(/\/tasks$/);
    await page.locator('[data-testid^="tasks-card-body-"]').first().click();

    await expect(page.getByTestId('task-detail-upholstery-section')).toBeVisible();
    await expect(page.getByTestId('upholstery-field-item_upholstery_1')).toContainText(
      'Velvet Blue',
    );

    await page.getByTestId('upholstery-field-item_upholstery_1').click();
    await expect(page.getByTestId('upholstery-picker-slide-page')).toBeVisible();
    await page.getByTestId('upholstery-card-upholstery_new').click();

    await expect(page.getByTestId('upholstery-picker-slide-page')).not.toBeVisible();
    await expect(page.getByTestId('upholstery-field-item_upholstery_1')).toContainText(
      'Linen Sand',
    );
    expect(patchRequestBody).toEqual({ upholstery_id: 'upholstery_new' });
  });
});
