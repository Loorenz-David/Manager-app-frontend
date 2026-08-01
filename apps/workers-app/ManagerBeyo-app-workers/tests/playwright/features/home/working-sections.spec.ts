import { expect, test } from "@playwright/test";
import { press } from "../../helpers/press";

// `working-section-card-<id>` is also the prefix of the two count badges
// inside each card, so the bare prefix matches three nodes per section and
// `nth(i)` can land on a badge. Select card roots only.
const SECTION_CARD_ROOT =
  /^working-section-card-(?!active-count-|done-count-)/;

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
    await press(page, page.getByTestId(SECTION_CARD_ROOT).first());
    await expect(page.getByTestId("working-section-steps-view")).toBeVisible();
    await expect(page.getByTestId("working-section-steps-title")).toBeVisible();
  });

  test("back button returns to sections list", async ({ page }) => {
    await press(page, page.getByTestId(SECTION_CARD_ROOT).first());
    await expect(page.getByTestId("working-section-steps-view")).toBeVisible();
    await press(page, page.getByTestId("working-section-steps-back"));
    await expect(page.getByTestId("working-sections-home-view")).toBeVisible();
  });

  test("search filters step list", async ({ page }) => {
    await press(page, page.getByTestId(SECTION_CARD_ROOT).first());
    const search = page.getByTestId("working-section-steps-search-input");
    await search.fill("NOMATCH_XYZ_999");
    await expect(page.getByTestId("working-section-steps-empty")).toBeVisible({
      timeout: 3000,
    });
  });

  test("task actions sheet opens on three-dot tap", async ({ page }) => {
    const sections = page.getByTestId(SECTION_CARD_ROOT);
    const sectionCount = await sections.count();
    let foundSectionWithActions = false;

    for (let i = 0; i < sectionCount; i += 1) {
      await press(page, sections.nth(i));
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
        await press(page, page.getByTestId("working-section-steps-back"));
        await expect(
          page.getByTestId("working-sections-home-view"),
        ).toBeVisible();
      }
    }

    test.skip(
      !foundSectionWithActions,
      "No section with visible task step actions for this test user",
    );

    await press(page, page.getByTestId(/^task-step-card-actions-/).first());
    await expect(page.getByTestId("task-step-actions-sheet")).toBeVisible();
    await expect(
      page.getByTestId("task-step-create-case-button"),
    ).toBeVisible();
  });

  test("quick action transition updates same card action label", async ({
    page,
  }) => {
    const sections = page.getByTestId(SECTION_CARD_ROOT);
    const sectionCount = await sections.count();
    let foundSectionWithQuickAction = false;

    for (let i = 0; i < sectionCount; i += 1) {
      await press(page, sections.nth(i));
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
        await press(page, page.getByTestId("working-section-steps-back"));
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

    await press(page, actionButton);
    await transitionResponse;

    const sameButton = page.getByTestId(actionButtonTestId!);
    await expect(sameButton).not.toHaveText(originalText, { timeout: 4000 });
  });
});
