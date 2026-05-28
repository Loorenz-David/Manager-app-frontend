import { expect, test } from "@playwright/test";

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? "";
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";

test.skip(
  !EMAIL || !PASSWORD,
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

test.describe("Home - Working Sections", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByTestId("auth-email-input").fill(EMAIL);
    await page.getByTestId("auth-password-input").fill(PASSWORD);
    await page.getByTestId("auth-sign-in-button").click();
    await expect(page).toHaveURL("/");
  });

  test("renders working sections list on home tab", async ({ page }) => {
    await expect(page.getByTestId("working-sections-home-view")).toBeVisible();
    await expect(page.getByTestId("working-sections-list")).toBeVisible();
  });

  test("navigates to steps panel on section tap", async ({ page }) => {
    await page
      .getByTestId(/^working-section-card-/)
      .first()
      .click();
    await expect(page.getByTestId("working-section-steps-view")).toBeVisible();
    await expect(page.getByTestId("working-section-steps-title")).toBeVisible();
  });

  test("back button returns to sections list", async ({ page }) => {
    await page
      .getByTestId(/^working-section-card-/)
      .first()
      .click();
    await expect(page.getByTestId("working-section-steps-view")).toBeVisible();
    await page.getByTestId("working-section-steps-back").click();
    await expect(page.getByTestId("working-sections-home-view")).toBeVisible();
  });

  test("search filters step list", async ({ page }) => {
    await page
      .getByTestId(/^working-section-card-/)
      .first()
      .click();
    const search = page.getByTestId("working-section-steps-search-input");
    await search.fill("NOMATCH_XYZ_999");
    await expect(page.getByTestId("working-section-steps-empty")).toBeVisible({
      timeout: 3000,
    });
  });

  test("task actions sheet opens on three-dot tap", async ({ page }) => {
    const sections = page.getByTestId(/^working-section-card-/);
    const sectionCount = await sections.count();
    let foundSectionWithActions = false;

    for (let i = 0; i < sectionCount; i += 1) {
      await sections.nth(i).click();
      await expect(
        page.getByTestId("working-section-steps-view"),
      ).toBeVisible();

      const actionsButton = page
        .getByTestId(/^task-step-card-actions-/)
        .first();

      try {
        await actionsButton.waitFor({ state: "visible", timeout: 4000 });
        foundSectionWithActions = true;
        break;
      } catch {
        await page.getByTestId("working-section-steps-back").click();
        await expect(
          page.getByTestId("working-sections-home-view"),
        ).toBeVisible();
      }
    }

    test.skip(
      !foundSectionWithActions,
      "No section with visible task step actions for this test user",
    );

    await page
      .getByTestId(/^task-step-card-actions-/)
      .first()
      .click();
    await expect(page.getByTestId("task-step-actions-sheet")).toBeVisible();
    await expect(
      page.getByTestId("task-step-create-case-button"),
    ).toBeVisible();
  });

  test("quick action transition updates same card action label", async ({
    page,
  }) => {
    const sections = page.getByTestId(/^working-section-card-/);
    const sectionCount = await sections.count();
    let foundSectionWithQuickAction = false;

    for (let i = 0; i < sectionCount; i += 1) {
      await sections.nth(i).click();
      await expect(
        page.getByTestId("working-section-steps-view"),
      ).toBeVisible();

      const actionButton = page
        .getByTestId(/^task-step-action-button-/)
        .first();

      try {
        await actionButton.waitFor({ state: "visible", timeout: 4000 });
        foundSectionWithQuickAction = true;
        break;
      } catch {
        await page.getByTestId("working-section-steps-back").click();
        await expect(
          page.getByTestId("working-sections-home-view"),
        ).toBeVisible();
      }
    }

    test.skip(
      !foundSectionWithQuickAction,
      "No section with quick-action task step for this test user",
    );

    const actionButton = page.getByTestId(/^task-step-action-button-/).first();
    const actionButtonTestId = await actionButton.getAttribute("data-testid");
    test.skip(!actionButtonTestId, "Could not resolve action button test id");

    const originalText = (await actionButton.textContent())?.trim() ?? "";

    const transitionResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/transition") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );

    await actionButton.click();
    await transitionResponse;

    const sameButton = page.getByTestId(actionButtonTestId!);
    await expect(sameButton).not.toHaveText(originalText, { timeout: 4000 });
  });
});
