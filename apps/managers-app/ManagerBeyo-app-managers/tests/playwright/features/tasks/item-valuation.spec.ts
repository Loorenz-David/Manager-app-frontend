import type { Locator, Page } from '@playwright/test';

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

/**
 * The phase-1 plan's Reference payload, which every mock in this feature is
 * seeded from (phase-2 plan Notes). Its band is 420 000…1 650 000 in 15 000
 * steps at quantity 6, so slider index k prices the item at
 * 420 000 + k × 15 000 öre, and index 53 (1 215 000) is the first step at or
 * above the 1 211 335 break-even.
 */
const REFERENCE_SCENARIO = {
  task_id: 'tsk_e2e_valuation',
  status: 'ok',
  item_binding: 'bound',
  can_commit: true,
  currency: 'swedish_krona',
  calculation_version: 2,
  config_fingerprint: 'cmv_7a1:pcbv_3f9:v1',
  item: {
    client_id: 'itm_e2e_valuation',
    article_number: '0000608',
    label: 'Dining chairs',
    quantity: 6,
  },
  saved: {
    valuation_id: 'ival_e2e',
    expected_sale_price_minor: 855000,
    purchase_cost_minor: null,
    created_at: '2026-08-14T10:24:00+00:00',
    created_by: {
      client_id: 'usr_e2e_other',
      username: 'Marta Lind',
      profile_picture: null,
    },
  },
  model: {
    cost_model_version_id: 'cmv_7a1',
    basis_version_id: 'pcbv_3f9',
    residual_percent_milli: 22000,
    constant_deduction_minor: 0,
    cost_per_worker_minute_ten_thousandths: 13000000,
    budget_cap_percent_milli: 25000,
    is_purely_proportional: true,
  },
  typical: {
    total_seconds: 12300,
    is_estimated: false,
    sections_without_sample: 0,
    sections_total: 4,
    method: 'median_completed_section_totals',
    window_days: 90,
    min_sample_size: 5,
  },
  anchors: {
    is_fundable: true,
    break_even_price_minor: 1211335,
    suggested_price_minor: 1215000,
    infeasible_at_or_below_minor: 29,
  },
  domain: {
    rule: 'break_even_band_v1',
    min_minor: 420000,
    max_minor: 1650000,
    step_minor: 15000,
  },
} as const;

/** The reference model at 1 215 000 öre — the numbers the commit must echo. */
const COMMITTED_BUDGET_MINOR = 267300;
const COMMITTED_WORKER_MINUTES = '205.62';

function envelope(data: unknown) {
  return JSON.stringify({ ok: true, warnings: [], data });
}

type ValuationMockOptions = {
  /** Start in the purchase-required state (no valuation row yet). */
  purchaseRequired?: boolean;
  /** What the article-number lookup returns, in minor units (öre). */
  lookupPurchasePriceMinor?: number | null;
};

type ValuationMocks = {
  commitBody: () => unknown;
  putBody: () => unknown;
};

async function mockValuationEndpoints(
  page: Page,
  options: ValuationMockOptions = {},
): Promise<ValuationMocks> {
  let commitBody: unknown = null;
  let putBody: unknown = null;
  let savedExpected: number | null = options.purchaseRequired ? null : 855000;
  let hasValuationRow = !options.purchaseRequired;

  await page.route(
    '**/api/v1/item-economics/tasks/*/price-scenario',
    async (route) => {
      const scenario = {
        ...REFERENCE_SCENARIO,
        currency: hasValuationRow ? 'swedish_krona' : null,
        status: hasValuationRow ? 'ok' : 'item_unvalued',
        can_commit: hasValuationRow,
        saved: hasValuationRow
          ? {
              ...REFERENCE_SCENARIO.saved,
              expected_sale_price_minor: savedExpected,
              purchase_cost_minor: 285000,
            }
          : null,
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope(scenario),
      });
    },
  );

  await page.route(
    '**/api/v1/item-economics/tasks/*/evaluations/commit',
    async (route) => {
      commitBody = route.request().postDataJSON();
      savedExpected = (commitBody as { expected_sale_price_minor: number })
        .expected_sale_price_minor;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({
          evaluation: {
            client_id: 'ice_e2e',
            production_budget_minor: COMMITTED_BUDGET_MINOR,
            allowed_worker_minutes: COMMITTED_WORKER_MINUTES,
          },
        }),
      });
    },
  );

  await page.route('**/api/v1/items/lookup**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        items: [
          {
            article_number: '0000608',
            sku: null,
            item_category_id: null,
            quantity: 6,
            external_id: 'ext_e2e',
            external_source: 'purchase_api',
            images: [],
            purchase_price_minor: options.lookupPurchasePriceMinor ?? 47499,
          },
        ],
      }),
    });
  });

  await page.route(
    '**/api/v1/item-economics/items/*/valuation',
    async (route) => {
      putBody = route.request().postDataJSON();
      // The PUT is what creates the valuation row (handoff §6.2).
      hasValuationRow = true;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({
          item_valuation: { client_id: 'ival_e2e_new' },
          preview: { status: 'item_missing_expected_price' },
        }),
      });
    },
  );

  return { commitBody: () => commitBody, putBody: () => putBody };
}

async function openValuationPage(page: Page): Promise<void> {
  await press(page.getByTestId('tab-tasks'));
  await expect(page).toHaveURL(/\/tasks$/);

  await press(page.locator('[data-testid^="tasks-card-actions-"]').first());
  await expect(
    page.getByTestId('task-actions-change-retail-price'),
  ).toBeVisible();

  await press(page.getByTestId('task-actions-change-retail-price'));
  await expect(page.getByTestId('item-valuation-page')).toBeVisible();
}

test.describe('Item valuation — expected sold price', () => {
  test.beforeEach(async ({ auth }) => {
    test.skip(
      !hasCredentials,
      'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run',
    );
    await auth.signIn();
  });

  test('a manager drags the price past break-even and saves it', async ({
    page,
  }) => {
    const mocks = await mockValuationEndpoints(page);

    await openValuationPage(page);

    // The saved price renders through the real arithmetic: 855 000 ÷ 600.
    await expect(page.getByTestId('item-valuation-per-piece')).toContainText(
      '1 425',
    );
    await expect(page.getByTestId('item-valuation-at-price')).toHaveText(
      '2h 25m',
    );
    await expect(page.getByTestId('item-valuation-typical')).toContainText(
      '3h 25m',
    );
    // Nothing to save yet — the draft is the saved price.
    await expect(page.getByTestId('item-valuation-save-button')).toBeDisabled();

    const slider = page.getByTestId('item-valuation-slider-input');

    // Index 52 → 1 200 000, one step below the 1 211 335 break-even.
    await slider.fill('52');
    await expect(page.getByTestId('item-valuation-chip')).toHaveAttribute(
      'data-tone',
      'negative',
    );

    // Index 53 → 1 215 000, the first step at or above it.
    await slider.fill('53');
    await expect(page.getByTestId('item-valuation-chip')).toHaveAttribute(
      'data-tone',
      'positive',
    );
    await expect(page.getByTestId('item-valuation-chip')).toHaveText(
      'Covers typical work',
    );

    const saveButton = page.getByTestId('item-valuation-save-button');
    await expect(saveButton).toBeEnabled();
    await expect(saveButton).toContainText('2 025');

    await press(saveButton);

    // The saved-version row is what proves the refetch landed. Owner copy
    // round (2026-08-20): the row reads "version · <relative>".
    await expect(page.getByTestId('item-valuation-provenance')).toContainText(
      'version ·',
    );
    await expect(saveButton).toBeDisabled();

    expect(mocks.commitBody()).toEqual({
      expected_sale_price_minor: 1215000,
    });
  });

  test('an unvalued item fetches its purchase price first', async ({ page }) => {
    const mocks = await mockValuationEndpoints(page, { purchaseRequired: true });

    await openValuationPage(page);

    // No number to show: the screen names what is missing instead.
    await expect(
      page.getByTestId('item-valuation-bootstrap-message'),
    ).toBeVisible();
    await expect(page.getByTestId('item-valuation-per-piece')).toHaveCount(0);

    await press(page.getByTestId('item-valuation-fetch-purchase'));

    // The valuation row now exists, so the editor takes over.
    await expect(page.getByTestId('item-valuation-per-piece')).toBeVisible();

    // 47 499 öre per piece → 474.99 kronor, rounded back before multiplying, × 6.
    expect(mocks.putBody()).toEqual({
      purchase_cost_minor: 284994,
      currency: 'swedish_krona',
    });
  });
});
