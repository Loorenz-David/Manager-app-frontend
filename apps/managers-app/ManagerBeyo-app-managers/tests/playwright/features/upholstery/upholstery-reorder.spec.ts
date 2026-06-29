import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

const taskId = 'task_upholstery_reorder_test';

type MockUpholstery = {
  client_id: string;
  name: string;
  code: string | null;
  image_url: string | null;
  favorite: boolean;
  list_order: number | null;
  current_stored_amount_meters: string | null;
  inventory_condition: 'available' | 'low_stock' | 'out_of_stock' | null;
};

function createMockUpholsteries(): MockUpholstery[] {
  return [
    {
      client_id: 'uph_a',
      name: 'Alpha',
      code: 'A',
      image_url: null,
      favorite: false,
      list_order: 1,
      current_stored_amount_meters: '5.000',
      inventory_condition: 'available',
    },
    {
      client_id: 'uph_b',
      name: 'Beta',
      code: 'B',
      image_url: null,
      favorite: false,
      list_order: 2,
      current_stored_amount_meters: '3.000',
      inventory_condition: 'available',
    },
  ];
}

function sortByListOrder(records: MockUpholstery[]): MockUpholstery[] {
  return [...records].sort((left, right) => {
    if (left.list_order === null && right.list_order === null) {
      return 0;
    }
    if (left.list_order === null) {
      return 1;
    }
    if (right.list_order === null) {
      return -1;
    }
    return left.list_order - right.list_order;
  });
}

async function routeReorderFixtures(page: Page) {
  let upholsteries = createMockUpholsteries();
  let patchRequestBody: unknown = null;

  await page.route(/\/api\/v1\/tasks(?:\?.*)?$/, async (route) => {
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
                  address: null,
                  created_at: '2026-05-24T00:00:00.000Z',
                  updated_at: null,
                  closed_at: null,
                  is_deleted: false,
                  deleted_at: null,
                },
                primary_item: {
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
              },
            ],
            limit: 50,
            offset: 0,
            has_more: false,
          },
        },
      }),
    });
  });

  await page.route(/\/api\/v1\/tasks\/[^/?]+\/flow-records(?:\?.*)?$/, async (route) => {
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
  });

  await page.route(/\/api\/v1\/tasks\/[^/?]+(?:\?.*)?$/, async (route) => {
    const detailTaskId =
      route.request().url().match(/\/api\/v1\/tasks\/([^/?]+)/)?.[1] ?? taskId;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          task: {
            client_id: detailTaskId,
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
          item_issues: [],
          item_upholstery: [
            {
              client_id: 'item_upholstery_1',
              item_id: 'item_1',
              upholstery_id: 'uph_a',
              name: 'Alpha',
              code: 'A',
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
          task_steps: [],
          task_notes: [],
          unread_message_count: 0,
        },
      }),
    });
  });

  await page.route(/\/api\/v1\/upholsteries\/[^/?]+\/list-order(?:\?.*)?$/, async (route) => {
    const clientId = route.request().url().match(/\/api\/v1\/upholsteries\/([^/?]+)\//)?.[1];
    const body = route.request().postDataJSON() as { list_order: number | null };
    patchRequestBody = body;

    if (clientId && body.list_order !== null) {
      const currentIndex = upholsteries.findIndex((item) => item.client_id === clientId);

      if (currentIndex !== -1) {
        const reordered = sortByListOrder(upholsteries);
        const sourceIndex = reordered.findIndex((item) => item.client_id === clientId);

        if (sourceIndex !== -1) {
          const [movedItem] = reordered.splice(sourceIndex, 1);
          reordered.splice(body.list_order - 1, 0, movedItem);
          upholsteries = reordered.map((item, index) => ({
            ...item,
            list_order: index + 1,
          }));
        }
      }
    }

    const responseRecord =
      upholsteries.find((item) => item.client_id === clientId) ?? upholsteries[0];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          upholstery: responseRecord,
        },
      }),
    });
  });

  await page.route(/\/api\/v1\/upholsteries\/[^/?]+(?:\?.*)?$/, async (route) => {
    const clientId = route.request().url().split('/').pop()?.split('?')[0] ?? '';
    const upholstery =
      upholsteries.find((item) => item.client_id === clientId) ?? upholsteries[0];

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

  await page.route(/\/api\/v1\/upholsteries(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const favorite = url.searchParams.get('favorite');
    const inStock = url.searchParams.get('in_stock');
    let records = sortByListOrder(upholsteries);

    if (favorite === 'true') {
      records = records.filter((item) => item.favorite);
    } else if (inStock === 'true') {
      records = records.filter((item) => item.inventory_condition !== 'out_of_stock');
    } else if (inStock === 'false') {
      records = records.filter((item) => item.inventory_condition === 'out_of_stock');
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          upholsteries: records,
          upholsteries_pagination: {
            has_more: false,
            limit: 50,
            offset: 0,
          },
        },
      }),
    });
  });

  return {
    getPatchRequestBody: () => patchRequestBody,
  };
}

async function openUpholsteryPicker(page: Page) {
  await page.getByTestId('tab-tasks').click();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.getByTestId(`tasks-card-body-${taskId}`).click();

  await expect(page.getByTestId('task-detail-upholstery-section')).toBeVisible();
  await page.getByTestId('upholstery-field-item_upholstery_1').click();
  await expect(page.getByTestId('upholstery-picker-body-in_stock')).toBeVisible();
}

test.describe('Upholstery picker reorder affordance', () => {
  test('does not expose reorder controls from picker cards', async ({
    page,
    auth,
  }) => {
    test.skip(!hasCredentials, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run');

    await routeReorderFixtures(page);

    await auth.signIn();
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await openUpholsteryPicker(page);

    await expect(page.getByTestId('upholstery-card-uph_a')).toBeVisible();
    await expect(page.getByTestId('upholstery-card-reorder-button')).toHaveCount(0);
    await expect(page.getByTestId('upholstery-reorder-sheet')).toHaveCount(0);
  });
});
