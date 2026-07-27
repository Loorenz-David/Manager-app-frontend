import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

type SkuReservationMockOptions = {
  status?: 200 | 404;
  sku?: string;
};

type SkuReservationMockState = {
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
    skuReservationOptions?: SkuReservationMockOptions,
  ): Promise<SkuReservationMockState | null> {
    const skuReservationMock =
      formType === 'pre_order'
        ? await mockPreOrderSkuReservation(page, skuReservationOptions)
        : null;

    await page.getByTestId('task-creation-fab').last().click();
    await page
      .getByTestId(`task-creation-fab-action-${formType}`)
      .last()
      .click();

    return skuReservationMock;
  }

  async function mockPreOrderSkuReservation(
    page: Page,
    options: SkuReservationMockOptions = {},
  ): Promise<SkuReservationMockState> {
    const shopifyLookup = await mockShopifyCustomerLookup(page);
    const state: SkuReservationMockState = {
      requestBody: null,
      requestCount: 0,
      requestMethod: null,
      shopifyLookup,
    };

    await page.route(
      '**/api/v1/sku-templates/by-task-type/pre_order/reserve',
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
              reserved_scalar: 42,
              sku: options.sku ?? 'PRE_ORDER-0042',
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

  test('pre-order form advances past customer step when all visible required fields are filled', async ({
    page,
  }) => {
    await openTaskCreationForm(page, 'pre_order');
    await expect(page.getByTestId('pre-order-form')).toBeVisible();

    await completeItemStep(page);
    await completeCustomerStep(page);

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
  });

  test('pre-order form reserves one server-formatted editable SKU on open', async ({
    page,
  }) => {
    const reservation = await openTaskCreationForm(page, 'pre_order', {
      sku: 'PRE_ORDER-0042',
    });
    if (!reservation) {
      throw new Error('Expected the pre-order SKU reservation mock.');
    }

    await expect(page.getByTestId('pre-order-form')).toBeVisible();
    await expect.poll(() => reservation.requestCount).toBe(1);
    expect(reservation.requestMethod).toBe('POST');
    expect(reservation.requestBody).toBeNull();

    await page.getByTestId('item-identity-sku-tab').click();
    const skuInput = page.getByTestId('item-sku-input');
    await expect(skuInput).toHaveValue('PRE_ORDER-0042');

    await skuInput.fill('MANUAL-SKU-9000');
    await expect(skuInput).toHaveValue('MANUAL-SKU-9000');
    expect(reservation.requestCount).toBe(1);
  });

  test('pre-order form remains usable when no SKU template is configured', async ({
    page,
  }) => {
    const reservation = await openTaskCreationForm(page, 'pre_order', {
      status: 404,
    });
    if (!reservation) {
      throw new Error('Expected the pre-order SKU reservation mock.');
    }

    await expect(page.getByTestId('pre-order-form')).toBeVisible();
    await expect.poll(() => reservation.requestCount).toBe(1);

    await page.getByTestId('item-identity-sku-tab').click();
    const skuInput = page.getByTestId('item-sku-input');
    await expect(skuInput).toHaveValue('');
    await skuInput.fill('MANUAL-SKU-404');
    await expect(skuInput).toHaveValue('MANUAL-SKU-404');
  });

  test('pre-order customer lookup can be retried from the not-found pill', async ({
    page,
  }) => {
    const reservation = await openTaskCreationForm(page, 'pre_order');
    if (!reservation) {
      throw new Error('Expected the pre-order SKU reservation mock.');
    }

    await expect(page.getByTestId('pre-order-form')).toBeVisible();
    await completeItemStep(page);

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

    await completeItemStepWithIssue(page);
    await completeCustomerStep(page);

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
  });

  test('return form still advances after selecting an item issue', async ({ page }) => {
    await openTaskCreationForm(page, 'return');
    await expect(page.getByTestId('return-form')).toBeVisible();

    await completeItemStepWithIssue(page);
    await completeCustomerStep(page);

    await expect(page.getByTestId('staged-form-step-task')).toBeVisible();
  });

  test('internal task footer reveals at the bottom edge and hides again after scrolling back up', async ({
    page,
  }) => {
    await openTaskCreationForm(page, 'internal');
    await expect(page.getByTestId('internal-form')).toBeVisible();

    const timeline = page.getByTestId('staged-form-timeline');
    const scrollContainer = page.getByTestId('staged-form-scroll-container');
    const footer = page.getByTestId('staged-form-footer');

    await expect(timeline).toHaveAttribute('data-compact', 'false');
    await expect(footer).toHaveClass(/pointer-events-none/);

    await scrollToBottomWithoutReversing(page);
    await expect(timeline).toHaveAttribute('data-compact', 'false');
    await expect(footer).not.toHaveClass(/pointer-events-none/);

    await scrollContainer.evaluate((el) => {
      el.scrollTop = Math.max(0, el.scrollTop - 80);
    });
    await page.waitForTimeout(250);

    await expect(timeline).toHaveAttribute('data-compact', 'false');
    await expect(footer).toHaveClass(/pointer-events-none/);
  });
});
