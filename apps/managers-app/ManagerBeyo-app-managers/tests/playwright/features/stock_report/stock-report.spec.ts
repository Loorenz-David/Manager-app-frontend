import type { Locator, Page } from "@playwright/test";

import { expect, test } from "../../fixtures/app-fixture";

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

async function press(page: Page, locator: Locator): Promise<void> {
  if (test.info().project.use.hasTouch) await locator.tap();
  else await locator.click();
}

async function mockBoard(page: Page): Promise<void> {
  await page.route("**/api/v1/stock-report/items**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: { stock_report_items: [] },
      }),
    }),
  );
}

test.describe("Stock needs — manager", () => {
  test.beforeEach(async ({ auth, page }) => {
    test.skip(
      !hasCredentials,
      "Set Playwright credentials to run app coverage.",
    );
    await mockBoard(page);
    await auth.signIn();
  });

  test("opens from More with the manager buckets and reorganise control", async ({
    page,
  }) => {
    await press(page, page.getByTestId("tab-more"));
    await press(page, page.getByTestId("more-tab-stock needs"));

    await expect(page.getByTestId("stock-report-board")).toBeVisible();
    await expect(page.getByText("Unset", { exact: true })).toBeVisible();
    await expect(page.getByTestId("stock-report-fab")).toBeVisible();
  });
});
