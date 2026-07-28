import type { Locator, Page } from "@playwright/test";

import { expect, test } from "../../fixtures/app-fixture";

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL &&
    process.env.PLAYWRIGHT_TEST_PASSWORD,
);

const TASK_ID = "task_quick_preorder";
const ITEM_ID = "item_quick_preorder";
const WORKING_SECTION_ID = "ws_quick_preorder";
const ITEM_IMAGE_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23d1d5db'/%3E%3C/svg%3E";

function buildTaskListItem() {
  return {
    task: {
      client_id: TASK_ID,
      task_scalar_id: 701,
      task_type: "pre_order",
      priority: "normal",
      state: "pending",
      title: null,
      summary: null,
      return_source: null,
      item_location: null,
      return_method: null,
      fulfillment_method: "delivery",
      additional_details: null,
      ready_by_at: "2026-08-15",
      scheduled_start_at: null,
      scheduled_end_at: null,
      customer_id: null,
      primary_phone_number: null,
      secondary_phone_number: null,
      primary_email: null,
      secondary_email: null,
      assortment: null,
      address: null,
      created_at: "2026-07-28T08:00:00.000Z",
      updated_at: null,
      closed_at: null,
      is_deleted: false,
      deleted_at: null,
      post_handling: null,
    },
    primary_item: {
      client_id: ITEM_ID,
      article_number: null,
      sku: "PRE-ORDER-0701",
      state: "pending",
      item_category_id: "cat_quick_preorder",
      quantity: 1,
      designer: null,
      height_in_cm: null,
      width_in_cm: null,
      depth_in_cm: null,
      item_value_minor: null,
      item_cost_minor: null,
      item_currency: null,
      item_position: null,
      item_zone: null,
      external_id: null,
      external_url: null,
      external_source: null,
      external_order_id: null,
      item_category_snapshot: "Chair",
      item_major_category_snapshot: "Seat",
    },
    item_images: [
      {
        client_id: "image_quick_preorder",
        image_url: ITEM_IMAGE_URL,
      },
    ],
  };
}

function buildTaskDetail() {
  const listItem = buildTaskListItem();

  return {
    task: {
      ...listItem.task,
      post_handling: [],
    },
    item: listItem.primary_item,
    item_images: listItem.item_images,
    task_notes: [],
    unread_message_count: 0,
  };
}

async function activate(
  locator: Locator,
  isMobile: boolean,
): Promise<void> {
  if (isMobile) {
    await locator.tap();
    return;
  }

  await locator.click();
}

async function mockQuickPreOrderApis(page: Page): Promise<{
  itemPatchBodies: Array<Record<string, unknown>>;
  requestOrder: string[];
  stepRequestBodies: unknown[];
}> {
  const itemPatchBodies: Array<Record<string, unknown>> = [];
  const requestOrder: string[] = [];
  const stepRequestBodies: unknown[] = [];

  await page.route("**/api/v1/tasks**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/v1/tasks/counts") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { total: 1, granularity: {} },
          warnings: [],
        }),
      });
      return;
    }

    if (
      url.pathname === "/api/v1/tasks" &&
      request.method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            tasks_pagination: {
              items: [buildTaskListItem()],
              limit: 50,
              offset: 0,
              has_more: false,
            },
          },
          warnings: [],
        }),
      });
      return;
    }

    if (url.pathname === `/api/v1/tasks/${TASK_ID}/steps`) {
      if (request.method() === "POST") {
        requestOrder.push("steps");
        stepRequestBodies.push(request.postDataJSON());
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { step_ids: ["step_quick_preorder"] },
            warnings: [],
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            steps_pagination: {
              items: [],
              has_more: false,
              limit: 50,
              offset: 0,
            },
          },
          warnings: [],
        }),
      });
      return;
    }

    if (url.pathname === `/api/v1/tasks/${TASK_ID}`) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: buildTaskDetail(),
          warnings: [],
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.route("**/api/v1/working-sections**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          working_sections: [
            {
              client_id: WORKING_SECTION_ID,
              name: "Quick pre-order section",
              image: null,
              dependencies: [],
              item_categories: [
                {
                  client_id: "cat_quick_preorder",
                  name: "Chair",
                  major_category: "Seat",
                },
              ],
              supported_issue_types: [],
              members: [],
            },
          ],
          working_sections_pagination: {
            has_more: false,
            limit: 200,
            offset: 0,
          },
        },
        warnings: [],
      }),
    });
  });

  await page.route("**/api/v1/items/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/v1/items/lookup") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            items: [
              {
                article_number: "0000123",
                sku: "SKU-LOOKUP",
                item_category_id: "cat_quick_preorder",
                quantity: 4,
                external_id: "purchase_quick_preorder",
                external_source: "purchase_api",
                images: [],
              },
            ],
          },
          warnings: [],
        }),
      });
      return;
    }

    if (
      url.pathname === `/api/v1/items/${ITEM_ID}` &&
      request.method() === "PATCH"
    ) {
      requestOrder.push("patch");
      itemPatchBodies.push(
        request.postDataJSON() as Record<string, unknown>,
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { client_id: ITEM_ID },
          warnings: [],
        }),
      });
      return;
    }

    await route.continue();
  });

  return { itemPatchBodies, requestOrder, stepRequestBodies };
}

test("quick-preorder-assign validates, patches the item, then creates the task step", async ({
  page,
  auth,
}, testInfo) => {
  test.skip(
    !hasCredentials,
    "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run",
  );

  const apiState = await mockQuickPreOrderApis(page);
  const isMobile = testInfo.project.name === "mobile";

  await auth.signIn();
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await activate(page.getByTestId("home-quick-preorders-box"), isMobile);

  await expect(page.getByTestId("quick-task-assign-slide-page")).toBeVisible();
  await activate(
    page.getByTestId(`tasks-card-select-${TASK_ID}`),
    isMobile,
  );

  await expect(page.getByTestId("quick-preorder-item-step")).toBeVisible();
  await expect(page.getByTestId("quick-preorder-item-preview")).toBeVisible();
  await expect(page.getByTestId("quick-preorder-item-preview-sku")).toHaveText(
    "PRE-ORDER-0701",
  );
  await expect(
    page.getByTestId("quick-preorder-item-preview-article-number"),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("quick-preorder-item-preview-image").locator("img"),
  ).toHaveAttribute("src", ITEM_IMAGE_URL);
  await expect(page.getByTestId("staged-form-step-list-label")).toHaveText(
    "Pre-orders",
  );
  await expect(page.getByTestId("staged-form-step-item-label")).toHaveText(
    "Item",
  );
  await expect(page.getByTestId("staged-form-step-assign-label")).toHaveText(
    "Assign",
  );
  await expect(page.getByTestId("item-identity-tab-picker")).toHaveCount(0);
  await expect(page.getByTestId("item-sku-input")).toHaveCount(0);

  await activate(
    page.getByTestId("quick-task-item-continue-button"),
    isMobile,
  );
  await expect(page.getByTestId("item-article-number-error")).toHaveText(
    "Enter the article number.",
  );
  await expect(page.getByTestId("task-working-sections-step-list")).toHaveCount(
    0,
  );

  await page.getByTestId("item-article-number-input").fill("123");
  await expect(page.getByTestId("item-article-number-success-button")).toBeVisible();
  await expect(page.getByTestId("item-article-number-input")).toHaveValue(
    "0000123",
  );
  await expect(page.getByTestId("item-quantity-input")).toHaveValue("4");

  await activate(
    page.getByTestId("quick-task-item-continue-button"),
    isMobile,
  );
  await expect(page.getByTestId("task-working-sections-step-list")).toBeVisible();
  await activate(
    page.getByTestId(`task-working-section-entry-${WORKING_SECTION_ID}`),
    isMobile,
  );

  await expect(page.getByTestId("quick-task-assign-save-button")).toBeEnabled();
  await activate(
    page.getByTestId("quick-task-assign-save-button"),
    isMobile,
  );

  await expect
    .poll(() => apiState.itemPatchBodies.length)
    .toBe(1);
  await expect
    .poll(() => apiState.stepRequestBodies.length)
    .toBe(1);

  expect(apiState.itemPatchBodies[0]).toEqual({
    article_number: "0000123",
    quantity: 4,
  });
  expect(apiState.itemPatchBodies[0]).not.toHaveProperty("sku");
  expect(apiState.stepRequestBodies[0]).toEqual([
    { working_section_id: WORKING_SECTION_ID },
  ]);
  expect(apiState.requestOrder).toEqual(["patch", "steps"]);

  await expect(page.getByTestId("quick-task-assign-slide-page")).toHaveCount(0);
});
