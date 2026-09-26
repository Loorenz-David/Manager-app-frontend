import type { Page } from "@playwright/test";

import {
  expect,
  hasPlaywrightCredentials,
  test,
} from "../../fixtures/app-fixture";
import { press } from "../../helpers/press";

async function mockBoard(page: Page): Promise<void> {
  await page.route("**/api/v1/stock-report/items**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          stock_report_items: [],
          stock_report_items_pagination: { has_more: false, limit: 20, offset: 0 },
        },
      }),
    }),
  );
}

test.describe("Stock needs — worker", () => {
  test.beforeEach(async ({ auth, page }) => {
    test.skip(
      !hasPlaywrightCredentials(),
      "Set Playwright credentials to run app coverage.",
    );
    await mockBoard(page);
    await auth.signIn();
  });

  test("opens from More with High first and no reorganise FAB", async ({
    page,
  }) => {
    await press(page, page.getByTestId("tab-more"));
    await press(page, page.getByTestId("more-tab-stock needs"));

    await expect(page.getByTestId("stock-report-board")).toBeVisible();
    await expect(page.getByText("High", { exact: true })).toBeVisible();
    await expect(page.getByText("Unset", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("stock-report-fab")).toHaveCount(0);
  });
});
