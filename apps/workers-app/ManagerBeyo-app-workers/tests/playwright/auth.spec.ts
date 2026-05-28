import { test, expect } from "@playwright/test";

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? "";
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";

test.skip(
  !EMAIL || !PASSWORD,
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test to run auth tests",
);

test.describe("Authentication", () => {
  test("unauthenticated visit to / redirects to /sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-in page renders title and form", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Worker Beyo")).toBeVisible();
    await expect(page.getByTestId("auth-email-input")).toBeVisible();
    await expect(page.getByTestId("auth-password-input")).toBeVisible();
    await expect(page.getByTestId("auth-sign-in-button")).toBeVisible();
  });

  test("valid credentials sign in and land on home with tab bar", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    await page.getByTestId("auth-email-input").fill(EMAIL);
    await page.getByTestId("auth-password-input").fill(PASSWORD);
    await page.getByTestId("auth-sign-in-button").click();

    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByTestId("bottom-tab-bar")).toBeVisible();
  });

  test("bottom tab bar shows all five tabs after login", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByTestId("auth-email-input").fill(EMAIL);
    await page.getByTestId("auth-password-input").fill(PASSWORD);
    await page.getByTestId("auth-sign-in-button").click();
    await expect(page).toHaveURL("/");

    const nav = page.getByTestId("bottom-tab-bar");
    await expect(nav.getByTestId("tab-home")).toBeVisible();
    await expect(nav.getByTestId("tab-tasks")).toBeVisible();
    await expect(nav.getByTestId("tab-cases")).toBeVisible();
    await expect(nav.getByTestId("tab-stats")).toBeVisible();
    await expect(nav.getByTestId("tab-settings")).toBeVisible();
  });

  test("home tab is marked active after login", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByTestId("auth-email-input").fill(EMAIL);
    await page.getByTestId("auth-password-input").fill(PASSWORD);
    await page.getByTestId("auth-sign-in-button").click();
    await expect(page).toHaveURL("/");

    await expect(page.getByTestId("tab-home")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("invalid credentials show error message", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByTestId("auth-email-input").fill("wrong@example.com");
    await page.getByTestId("auth-password-input").fill("wrongpassword");
    await page.getByTestId("auth-sign-in-button").click();

    await expect(page.getByTestId("auth-error-root")).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
