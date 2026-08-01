import { expect, test, type Page } from "@playwright/test";
import { press } from "../../helpers/press";
import {
  STUB_TOTAL,
  stubCurrentShiftInPause,
  stubReassignedStepsEndpoints,
} from "../../helpers/reassigned-steps-stubs";

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? "";
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";

test.skip(
  !EMAIL || !PASSWORD,
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

/**
 * Sign-in is a per-test step rather than a `beforeEach` so each test can install
 * its own routes *before* the app boots.
 *
 * `page.reload()` is deliberately never used here: the refresh cookie does not
 * survive a reload in this environment (cross-origin, plain http), so a reload
 * drops the session and lands back on /sign-in. Installing stubs up front makes
 * the reload unnecessary anyway — the assertions all concern the first render.
 */
async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByTestId("auth-email-input").fill(EMAIL);
  await page.getByTestId("auth-password-input").fill(PASSWORD);
  await page.getByTestId("auth-sign-in-button").click();
  await expect(page).toHaveURL("/");
}

test.describe("Home - top cards", () => {
  test.beforeEach(async ({ page }) => {
    // Stub before sign-in so the count request fired on the first home render
    // is already intercepted.
    await stubReassignedStepsEndpoints(page);
  });

  test("renders the cards above the My Sections list", async ({ page }) => {
    await signIn(page);

    const cards = page.getByTestId("home-top-cards");
    await expect(cards).toBeVisible();
    await expect(cards.getByText("My Sections")).toBeVisible();
    await expect(page.getByTestId("reassigned-card")).toBeVisible();
  });

  test("shows the reassigned badge with the count endpoint's total", async ({
    page,
  }) => {
    await signIn(page);

    const badge = page.getByTestId("reassigned-card-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(String(STUB_TOTAL));
  });

  test("never sends q to the count endpoint", async ({ page }) => {
    const countRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/reassigned-steps/count")) {
        countRequests.push(request.url());
      }
    });

    // The listener is attached before boot, so the first render's count request
    // is captured without needing to reload.
    await signIn(page);
    await expect(page.getByTestId("reassigned-card")).toBeVisible();
    await expect
      .poll(() => countRequests.length, { timeout: 15_000 })
      .toBeGreaterThan(0);

    for (const url of countRequests) {
      expect(url).not.toContain("q=");
    }
  });

  test("state card shows the pause reason name and a running timer", async ({
    page,
  }) => {
    await stubCurrentShiftInPause(page);
    await signIn(page);
    await expect(page.getByTestId("home-top-cards")).toBeVisible();

    const card = page.getByTestId("worker-state-card");
    // Manager-role tokens get no self shift state at all (handoff §12.1).
    const visible = await card.isVisible().catch(() => false);
    test.skip(!visible, "Signed-in account is not worker-role");

    await expect(page.getByTestId("worker-state-card-label")).toHaveText(
      "Lunch break",
    );
    const timer = page.getByTestId("worker-state-card-timer");
    await expect(timer).toBeVisible();

    // The timer is anchored to state_entered_at, so it advances on its own.
    const first = await timer.textContent();
    await expect(timer).not.toHaveText(first ?? "", { timeout: 4000 });
  });

  test("tapping the state card opens the worker-state sheet", async ({
    page,
  }) => {
    await stubCurrentShiftInPause(page);
    await signIn(page);
    await expect(page.getByTestId("home-top-cards")).toBeVisible();

    const card = page.getByTestId("worker-state-card");
    const visible = await card.isVisible().catch(() => false);
    test.skip(!visible, "Signed-in account is not worker-role");

    await press(page, card);
    await expect(page.getByTestId("worker-state-sheet")).toBeVisible();
    await expect(page.getByTestId("worker-state-reason-picker")).toBeVisible();
  });
});
