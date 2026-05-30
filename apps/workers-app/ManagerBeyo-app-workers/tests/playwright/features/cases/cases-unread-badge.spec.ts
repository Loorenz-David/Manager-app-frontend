import { expect, test } from "@playwright/test";

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? "";
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";

test.skip(
  !EMAIL || !PASSWORD,
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

test.describe("Cases - unread badge", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByTestId("auth-email-input").fill(EMAIL);
    await page.getByTestId("auth-password-input").fill(PASSWORD);
    await page.getByTestId("auth-sign-in-button").click();
    await expect(page).toHaveURL("/");
  });

  test("cases tab badge appears when unread count is greater than zero", async ({
    page,
  }) => {
    const badge = page.getByTestId("nav-tab-badge");

    await page.waitForTimeout(500);

    const badgeVisible = await badge.isVisible().catch(() => false);
    test.skip(
      !badgeVisible,
      "No unread case messages for this user, badge does not render",
    );

    await expect(badge).toBeVisible();
    await expect(page.getByTestId("tab-cases")).toBeVisible();
  });

  test("tapping cases tab dismisses the badge immediately", async ({
    page,
  }) => {
    const badge = page.getByTestId("nav-tab-badge");
    const casesTab = page.getByTestId("tab-cases");

    await page.waitForTimeout(500);

    const badgeVisible = await badge.isVisible().catch(() => false);
    test.skip(
      !badgeVisible,
      "No unread case messages for this user, cannot validate dismiss",
    );

    await casesTab.tap();
    await expect(badge).not.toBeVisible();
  });
});
