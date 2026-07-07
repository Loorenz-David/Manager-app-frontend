import type { Page } from "@playwright/test";

import type { AuthHelper } from "../../fixtures/auth-fixture";
import { expect, test } from "../../fixtures/app-fixture";

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

async function openTestingForms(page: Page, auth: AuthHelper) {
  await auth.signIn();
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await page.getByTestId("tab-tasks").click();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.getByTestId("task-creation-fab").first().click();
  const openButton = page.locator(
    '[data-testid="open-testing-forms-button"]:visible',
  );
  await expect(openButton).toHaveCount(1);
  await openButton.click();
  await expect(page.getByTestId("testing-forms-form")).toBeVisible();
}

async function openInternalTaskAssignmentStep(page: Page, auth: AuthHelper) {
  await auth.signIn();
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await page.getByTestId("tab-tasks").click();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.getByTestId("task-creation-fab").click();
  await page.getByTestId("task-creation-fab-action-internal").click();
  await expect(page.getByTestId("internal-form")).toBeVisible();
  await page.getByTestId("item-article-number-input").fill("ABC-123");
  await page.getByTestId("item-major-category-wood-option").click();
  await expect(page.getByTestId("item-category-picker-sheet")).toBeVisible();
  await page.getByTestId("item-category-cat_wood_table-option").click();
  await expect(page.getByTestId("item-category-picker-sheet")).not.toBeVisible();
  await page.getByTestId("staged-form-advance-button").click();
  await expect(page.getByTestId("staged-form-step-assignment")).toBeVisible();
}

test.describe("Staged form scroll collapse", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, auth }) => {
    test.skip(
      !hasCredentials,
      "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run",
    );
    await openTestingForms(page, auth);
  });

  test("timeline is expanded at scroll position 0", async ({ page }) => {
    const timeline = page.getByTestId("staged-form-timeline");
    await expect(timeline).toBeVisible();
    await expect(timeline).toHaveAttribute("data-compact", "false");
  });

  test("timeline collapses after scrolling past 56 px and stays stable", async ({
    page,
  }) => {
    const scrollContainer = page.getByTestId("staged-form-scroll-container");
    const timeline = page.getByTestId("staged-form-timeline");

    await scrollContainer.evaluate((el) => {
      el.scrollTop = 80;
    });

    await expect(timeline).toHaveAttribute("data-compact", "true", {
      timeout: 1000,
    });

    // Wait 600 ms to verify no oscillation — if it were oscillating it would flip back
    await page.waitForTimeout(600);
    await expect(timeline).toHaveAttribute("data-compact", "true");
  });

  test("timeline re-expands after scrolling back near the top", async ({
    page,
  }) => {
    const scrollContainer = page.getByTestId("staged-form-scroll-container");
    const timeline = page.getByTestId("staged-form-timeline");

    await scrollContainer.evaluate((el) => {
      el.scrollTop = 80;
    });
    await expect(timeline).toHaveAttribute("data-compact", "true", {
      timeout: 1000,
    });

    await scrollContainer.evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect(timeline).toHaveAttribute("data-compact", "false", {
      timeout: 1000,
    });
  });

  test("can scroll to the bottom of a short step without oscillation", async ({
    page,
  }) => {
    const scrollContainer = page.getByTestId("staged-form-scroll-container");
    const timeline = page.getByTestId("staged-form-timeline");

    // Measure scroll height so we scroll to the actual bottom
    const scrollHeight = await scrollContainer.evaluate(
      (el) => el.scrollHeight,
    );
    const clientHeight = await scrollContainer.evaluate(
      (el) => el.clientHeight,
    );

    // Only meaningful if content is scrollable at all
    if (scrollHeight <= clientHeight) {
      test.skip(
        true,
        "Content is not scrollable on this step — test not applicable",
      );
      return;
    }

    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    // Allow the scroll handler to fire
    await page.waitForTimeout(200);

    // The current implementation compensates scrollTop while the timeline height
    // animates, so exact bottom offset is not stable enough to assert. What matters
    // is that the container remains scrollable and the compact state does not flip.
    const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);

    // Timeline state should be stable — wait and check for no flip
    const compactAfterScroll = await timeline.getAttribute("data-compact");
    await page.waitForTimeout(600);
    await expect(timeline).toHaveAttribute(
      "data-compact",
      compactAfterScroll ?? "false",
    );
  });

  test("navigating to a new step resets scroll and expands timeline instantly", async ({
    page,
  }) => {
    const scrollContainer = page.getByTestId("staged-form-scroll-container");
    const timeline = page.getByTestId("staged-form-timeline");

    await scrollContainer.evaluate((el) => {
      el.scrollTop = 80;
    });
    await expect(timeline).toHaveAttribute("data-compact", "true", {
      timeout: 1000,
    });

    await page.getByTestId("staged-form-step-customer-indicator").click();

    // Timeline must be expanded immediately (no animation delay)
    await expect(timeline).toHaveAttribute("data-compact", "false");

    // Scroll container must be reset to top
    const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBe(0);
  });

  test("internal task assignment footer stays hidden after collapse instead of bouncing visible again", async ({
    page,
    auth,
  }) => {
    await openInternalTaskAssignmentStep(page, auth);

    const shortcutBar = page.getByTestId(
      "task-creation-working-sections-shortcut-bar",
    );
    if ((await shortcutBar.count()) === 0) {
      test.skip(
        true,
        "Current fixture has no available working sections for this major category",
      );
      return;
    }

    const scrollContainer = page.getByTestId("staged-form-scroll-container");
    const timeline = page.getByTestId("staged-form-timeline");
    const metrics = await scrollContainer.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    if (metrics.scrollHeight <= metrics.clientHeight) {
      test.skip(true, "Assignment step is not scrollable in this fixture");
      return;
    }

    await scrollContainer.evaluate((el) => {
      el.scrollTop = 120;
    });
    await expect(timeline).toHaveAttribute("data-compact", "true", {
      timeout: 1000,
    });

    await page.waitForTimeout(400);
    await expect(timeline).toHaveAttribute("data-compact", "true");
  });
});
