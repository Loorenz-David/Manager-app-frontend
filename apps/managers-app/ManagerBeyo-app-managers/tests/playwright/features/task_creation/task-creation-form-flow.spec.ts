import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

type SkuPreviewMockOptions = {
  status?: 200 | 404;
  sku?: string;
};

type SkuPreviewMockState = {
  requestBody: string | null;
  requestCount: number;
  requestMethod: string | null;
  shopifyLookup: ShopifyCustomerLookupMockState;
};

type ShopifyCustomerLookupMockState = {
  requestCount: number;
  shouldReturnMatch: boolean;
};

test.describe('Task creation staged forms', () => {
  test.beforeEach(async ({ page, auth }) => {
    test.skip(!hasCredentials, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run');

    await auth.signIn();
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await page.getByTestId('tab-tasks').click();
    await expect(page).toHaveURL(/\/tasks$/);
  });

  async function openTaskCreationForm(
    page: Page,
    formType: 'internal' | 'pre_order' | 'return',
    skuPreviewOptions?: SkuPreviewMockOptions,
  ): Promise<SkuPreviewMockState | null> {
    const skuPreviewMock =
      formType === 'pre_order'
        ? await mockPreOrderSkuPreview(page, skuPreviewOptions)
        : null;

    await page.getByTestId('task-creation-fab').last().click();
    await page
      .getByTestId(`task-creation-fab-action-${formType}`)
      .last()
      .click();

    return skuPreviewMock;
  }

  const PLAYWRIGHT_SHOP_INTEGRATION_ID = 'shpint_playwright';
  const PLAYWRIGHT_LOCATION_GID = 'gid://shopify/Location/99221471562';

  async function mockShopifyPreOrderCatalog(page: Page): Promise<void> {
    await page.route('**/api/v1/integrations/shopify/shops*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            shops: [
              {
                client_id: PLAYWRIGHT_SHOP_INTEGRATION_ID,
                workspace_id: 'ws_playwright',
                shop_domain: 'playwright.myshopify.com',
                shop_name: 'Playwright Shop',
                provider: 'shopify',
                status: 'active',
                access_token_expires_at: null,
                granted_scopes: [],
                requested_scopes: [],
                api_version: '2025-07',
                installed_at: null,
                uninstalled_at: null,
                last_connected_at: null,
                last_health_check_at: null,
                last_health_check_status: null,
                last_error_code: null,
                last_error_message: null,
                scopes_status: 'up_to_date',
                webhooks_status: 'synced',
                created_by: null,
                updated_by: null,
                created_at: '2026-07-27T00:00:00Z',
                updated_at: '2026-07-27T00:00:00Z',
                is_deleted: false,
              },
            ],
            shops_pagination: { limit: 50, offset: 0, has_more: false },
          },
          warnings: [],
        }),
      });
    });

    await page.route(
      '**/api/v1/integrations/shopify/locations*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              shops: [
                {
                  shop_integration_id: PLAYWRIGHT_SHOP_INTEGRATION_ID,
                  shop_domain: 'playwright.myshopify.com',
                  status: 'ok',
                  locations: [
                    {
                      location_id: PLAYWRIGHT_LOCATION_GID,
                      name: 'Playwright Warehouse',
                      is_active: true,
                    },
                  ],
                },
              ],
            },
            warnings: [],
          }),
        });
      },
    );
  }

  async function mockPreOrderSkuPreview(
    page: Page,
    options: SkuPreviewMockOptions = {},
  ): Promise<SkuPreviewMockState> {
    await mockShopifyPreOrderCatalog(page);
    const shopifyLookup = await mockShopifyCustomerLookup(page);
    const state: SkuPreviewMockState = {
      requestBody: null,
      requestCount: 0,
      requestMethod: null,
      shopifyLookup,
    };

    await page.route(
      '**/api/v1/sku-templates/by-task-type/pre_order',
      async (route) => {
        const request = route.request();
        state.requestCount += 1;
        state.requestMethod = request.method();
        state.requestBody = request.postData();

        if (options.status === 404) {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'SKU template not found.',
              ok: false,
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              client_id: 'skt_playwright_pre_order',
              task_type: 'pre_order',
              prefix: 'PRE_ORDER',
              separator: '-',
              pad_width: 4,
              last_scalar: 41,
              next_scalar: 42,
              next_sku_preview: options.sku ?? 'PRE_ORDER-0042',
            },
            warnings: [],
          }),
        });
      },
    );

    return state;
  }

  async function mockShopifyCustomerLookup(
    page: Page,
  ): Promise<ShopifyCustomerLookupMockState> {
    const state: ShopifyCustomerLookupMockState = {
      requestCount: 0,
      shouldReturnMatch: false,
    };

    await page.route(
      '**/api/v1/integrations/shopify/customers/by-product-identity',
      async (route) => {
        state.requestCount += 1;
        const requestBody = route.request().postDataJSON() as {
          article_number?: string;
          sku?: string;
        };
        const matchedValue =
          requestBody.sku ?? requestBody.article_number ?? null;

        if (state.shouldReturnMatch) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              customer_matches:
                state.shouldReturnMatch && matchedValue
                  ? [
                      {
                        shop_integration_id: 'shopify_playwright',
                        shop_domain: 'playwright.myshopify.com',
                        match_type: requestBody.sku ? 'sku' : 'barcode',
                        matched_value: matchedValue,
                        customer_id: 'customer_playwright',
                        display_name: 'Shopify Retry Customer',
                        primary_email: 'retry@example.com',
                        primary_phone_number: '+46701234567',
                        address: null,
                      },
                    ]
                  : [],
              failed_shops: [],
            },
            warnings: [],
          }),
        });
      },
    );

    return state;
  }

  async function completeItemStep(page: Page) {
    await expect(page.getByTestId('staged-form-advance-button')).toBeVisible();
    await page.getByTestId('item-article-number-input').fill('ABC-123');
    await page.getByTestId('staged-form-advance-button').click();
    await expect(page.getByTestId('staged-form-step-customer')).toBeVisible();
  }

  async function completeItemStepWithIssue(page: Page) {
    await expect(page.getByTestId('staged-form-advance-button')).toBeVisible();
    await page.getByTestId('item-article-number-input').fill('ABC-123');
    await page.getByTestId('item-major-category-wood-option').click();
    await expect(page.getByTestId('item-category-picker-sheet')).toBeVisible();
    await page.getByTestId('item-category-cat_wood_table-option').click();
    await expect(page.getByTestId('item-category-picker-sheet')).not.toBeVisible();
    await page.getByTestId('item-issue-issue_scratches-option').click();
    await page.getByTestId('staged-form-advance-button').click();
    await expect(page.getByTestId('staged-form-step-customer')).toBeVisible();
  }

  async function completeCustomerStep(page: Page) {
    await page.getByTestId('customer-display-name-input').fill('Jane Example');
    await page.getByTestId('customer-type-input').selectOption('person');
    await page.getByTestId('staged-form-advance-button').click();
  }

  /**
   * Fills the pre-order Shopify section on the Task step: product price plus
   * the (auto-selected single) shop and one inventory location.
   */
  async function fillPreOrderShopifySection(page: Page) {
    await page.getByTestId('pre-order-product-price-input').fill('5200');
    await expect(
      page.getByTestId('shopify-product-sync-shop-field-trigger'),
    ).toContainText('1 shop selected');
    await page
      .getByTestId(
        `shopify-inventory-location-${PLAYWRIGHT_SHOP_INTEGRATION_ID}-${PLAYWRIGHT_LOCATION_GID}`,
      )
      .click();
  }

  async function completePreOrderTaskStep(page: Page) {
    await expect(page.getByTestId('staged-form-advance-button')).toBeVisible();
    await page.getByTestId('item-article-number-input').fill('ABC-123');
    await fillPreOrderShopifySection(page);
    await page.getByTestId('staged-form-advance-button').click();
    await expect(page.getByTestId('staged-form-step-assignment')).toBeVisible();
  }

  async function completePreOrderTaskStepWithIssue(page: Page) {
    await expect(page.getByTestId('staged-form-advance-button')).toBeVisible();
    await page.getByTestId('item-article-number-input').fill('ABC-123');
    await page.getByTestId('item-major-category-wood-option').click();
    await expect(page.getByTestId('item-category-picker-sheet')).toBeVisible();
    await page.getByTestId('item-category-cat_wood_table-option').click();
    await expect(page.getByTestId('item-category-picker-sheet')).not.toBeVisible();
    await page.getByTestId('item-issue-issue_scratches-option').click();
    await fillPreOrderShopifySection(page);
    await page.getByTestId('staged-form-advance-button').click();
    await expect(page.getByTestId('staged-form-step-assignment')).toBeVisible();
  }

  /** Advances Assignment → Details → Customer (the last pre-order step). */
  async function advanceToPreOrderCustomerStep(page: Page) {
    await page.getByTestId('staged-form-advance-button').click();
    await expect(page.getByTestId('staged-form-step-details')).toBeVisible();
    await page.getByTestId('staged-form-advance-button').click();
    await expect(page.getByTestId('staged-form-step-customer')).toBeVisible();
  }

  async function scrollToBottomWithoutReversing(page: Page) {
    const scrollContainer = page.getByTestId('staged-form-scroll-container');
    const metrics = await scrollContainer.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    if (metrics.scrollHeight <= metrics.clientHeight) {
      test.skip(true, 'Current step is not scrollable in this fixture');
      return;
    }

    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(250);
  }

  test('pre-order form reaches the customer step last with the shopify section filled', async ({
    page,
  }) => {
    await openTaskCreationForm(page, 'pre_order');
    await expect(page.getByTestId('pre-order-form')).toBeVisible();

    await completePreOrderTaskStep(page);
    await advanceToPreOrderCustomerStep(page);

    await expect(page.getByTestId('customer-display-name-input')).toBeVisible();
  });

  test('pre-order form previews the next SKU as ghost text without claiming it', async ({
    page,
  }) => {
    const preview = await openTaskCreationForm(page, 'pre_order', {
      sku: 'PRE_ORDER-0042',
    });
    if (!preview) {
      throw new Error('Expected the pre-order SKU preview mock.');
    }

    await expect(page.getByTestId('pre-order-form')).toBeVisible();
    await expect.poll(() => preview.requestCount).toBe(1);
    // A read, not a reservation: nothing is consumed by opening the form.
    expect(preview.requestMethod).toBe('GET');
    expect(preview.requestBody).toBeNull();

    await page.getByTestId('item-identity-sku-tab').click();
    const skuInput = page.getByTestId('item-sku-input');
    // Empty on purpose — a value here is an override, and blank is what makes
    // the backend assign the real number during creation.
    await expect(skuInput).toHaveValue('');
    await expect(skuInput).toHaveAttribute('placeholder', 'PRE_ORDER-0042');
    await expect(
      page.getByTestId('pre-order-form-sku-preview-hint'),
    ).toContainText('PRE_ORDER-0042');

    await skuInput.fill('MANUAL-SKU-9000');
    await expect(skuInput).toHaveValue('MANUAL-SKU-9000');
  });

  test('pre-order form remains usable when no SKU template is configured', async ({
    page,
  }) => {
    const preview = await openTaskCreationForm(page, 'pre_order', {
      status: 404,
    });
    if (!preview) {
      throw new Error('Expected the pre-order SKU preview mock.');
    }

    await expect(page.getByTestId('pre-order-form')).toBeVisible();
    await expect.poll(() => preview.requestCount).toBe(1);

    await page.getByTestId('item-identity-sku-tab').click();
    const skuInput = page.getByTestId('item-sku-input');
    await expect(skuInput).toHaveValue('');
    await expect(
      page.getByTestId('pre-order-form-sku-preview-hint'),
    ).toHaveCount(0);
    await skuInput.fill('MANUAL-SKU-404');
    await expect(skuInput).toHaveValue('MANUAL-SKU-404');
  });

  test('pre-order submit sends no SKU and shows the one the backend assigned', async ({
    page,
  }) => {
    const preview = await openTaskCreationForm(page, 'pre_order');
    if (!preview) {
      throw new Error('Expected the pre-order SKU preview mock.');
    }

    let createTaskBody: {
      client_id?: string;
      item?: { sku?: string };
      shopify_preorder?: { product?: Record<string, unknown> };
    } | null = null;

    await page.route('**/api/v1/tasks', async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.fallback();
        return;
      }

      createTaskBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            client_id: createTaskBody?.client_id ?? 'tsk_playwright',
            task_scalar_id: 1,
            item_id: 'itm_playwright',
            item_sku: 'PRE_ORDER-0043',
          },
          warnings: [],
        }),
      });
    });

    await expect(page.getByTestId('pre-order-form')).toBeVisible();
    await completePreOrderTaskStep(page);
    await advanceToPreOrderCustomerStep(page);

    // Pre-orders also require a reachable customer before they submit.
    await page.getByTestId('customer-display-name-input').fill('Jane Example');
    await page.getByTestId('customer-type-input').selectOption('person');
    await page.getByTestId('customer-email-input').fill('jane@example.com');
    await page.getByTestId('customer-phone-input').fill('+46701234567');
    await page.getByTestId('staged-form-advance-button').click();

    await expect
      .poll(() => createTaskBody)
      .not.toBeNull();
    expect(createTaskBody?.item?.sku ?? '').toBe('');
    expect(createTaskBody?.shopify_preorder?.product).not.toHaveProperty('sku');
    expect(createTaskBody?.shopify_preorder?.product).not.toHaveProperty(
      'title',
    );

    // The preview was 0042; the real allocation came back as 0043, and that is
    // what the seller must be left looking at.
    await expect(
      page.getByTestId('task-creation-submit-overlay-sku-value'),
    ).toHaveText('PRE_ORDER-0043');
  });

  test('pre-order customer lookup can be retried from the not-found pill', async ({
    page,
  }) => {
    const reservation = await openTaskCreationForm(page, 'pre_order');
    if (!reservation) {
      throw new Error('Expected the pre-order SKU reservation mock.');
    }

    await expect(page.getByTestId('pre-order-form')).toBeVisible();
    await completePreOrderTaskStep(page);
    await advanceToPreOrderCustomerStep(page);

    const retryButton = page.getByTestId('shopify-customer-retry-button');
    await expect(retryButton).toBeVisible();
    const requestCountBeforeRetry = reservation.shopifyLookup.requestCount;
    reservation.shopifyLookup.shouldReturnMatch = true;

    await retryButton.click();

    await expect(page.getByTestId('shopify-customer-status-pill')).toContainText(
      'Looking up Shopify customer',
    );
    await expect
      .poll(() => reservation.shopifyLookup.requestCount)
      .toBeGreaterThan(requestCountBeforeRetry);
    await expect(page.getByTestId('shopify-customer-status-pill')).toContainText(
      'Shopify customer',
    );
    await expect(page.getByTestId('customer-display-name-input')).toHaveValue(
      'Shopify Retry Customer',
    );
    await expect(page.getByTestId('customer-email-input')).toHaveValue(
      'retry@example.com',
    );
  });

  test('return form advances past customer step when all visible required fields are filled', async ({
    page,
  }) => {
    await openTaskCreationForm(page, 'return');
    await expect(page.getByTestId('return-form')).toBeVisible();

    await completeItemStep(page);
    await completeCustomerStep(page);

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
  });

  test('return customer lookup can be retried from the not-found pill', async ({
    page,
  }) => {
    const shopifyLookup = await mockShopifyCustomerLookup(page);
    await openTaskCreationForm(page, 'return');
    await expect(page.getByTestId('return-form')).toBeVisible();
    await completeItemStep(page);

    const retryButton = page.getByTestId('shopify-customer-retry-button');
    await expect(retryButton).toBeVisible();
    const requestCountBeforeRetry = shopifyLookup.requestCount;
    shopifyLookup.shouldReturnMatch = true;

    await retryButton.click();

    await expect(page.getByTestId('shopify-customer-status-pill')).toContainText(
      'Looking up Shopify customer',
    );
    await expect
      .poll(() => shopifyLookup.requestCount)
      .toBeGreaterThan(requestCountBeforeRetry);
    await expect(page.getByTestId('shopify-customer-status-pill')).toContainText(
      'Shopify customer',
    );
    await expect(page.getByTestId('customer-display-name-input')).toHaveValue(
      'Shopify Retry Customer',
    );
    await expect(page.getByTestId('customer-email-input')).toHaveValue(
      'retry@example.com',
    );
  });

  test('pre-order form still advances after selecting an item issue', async ({ page }) => {
    await openTaskCreationForm(page, 'pre_order');
    await expect(page.getByTestId('pre-order-form')).toBeVisible();

    await completePreOrderTaskStepWithIssue(page);
    await advanceToPreOrderCustomerStep(page);

    await expect(page.getByTestId('staged-form-step-customer')).toBeVisible();
  });

  test('return form still advances after selecting an item issue', async ({ page }) => {
    await openTaskCreationForm(page, 'return');
    await expect(page.getByTestId('return-form')).toBeVisible();

    await completeItemStepWithIssue(page);
    await completeCustomerStep(page);

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
  });

  test('internal task footer sits at the end of the form and scrolls into view', async ({
    page,
  }) => {
    await openTaskCreationForm(page, 'internal');
    await expect(page.getByTestId('internal-form')).toBeVisible();

    // Static footer: the last element of the step content, reached by
    // scrolling like anything else.
    const footer = page.getByTestId('staged-form-footer');

    await scrollToBottomWithoutReversing(page);
    await expect(footer).toBeInViewport();
    await expect(page.getByTestId('staged-form-advance-button')).toBeVisible();
  });
});
