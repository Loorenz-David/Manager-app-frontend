import type { Locator, Page } from "@playwright/test";
import { hasPlaywrightCredentials, expect, test } from "../../fixtures/app-fixture";
import { press } from "../../helpers/press";

test.skip(
  !hasPlaywrightCredentials(),
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

/**
 * The step detail must react to its own Start/Pause button whichever way it
 * was opened. It used to read the step out of one cached section-list page
 * and fall back to a frozen snapshot when the step was not in that page — so
 * a detail opened from the last-active card, or from page 2 of a section,
 * tapped through to the server but never changed on screen until reopened.
 *
 * Both specs below assert the button label flips *without leaving the page*.
 */

const DETAIL = "task-detail-slide-page";
const ACTION = /^task-step-circular-action-/;

async function pauseThroughSheet(page: Page): Promise<void> {
  await expect(page.getByTestId("pause-reason-sheet")).toBeVisible();
  await expect(page.getByTestId("pause-reason-loading")).toHaveCount(0);
  await page.getByTestId("pause-reason-option-pause_lunch_break").click();
  await expect(page.getByTestId("pause-reason-sheet")).toHaveCount(0);
}

/**
 * A pending step's Start runs the pre-start guards before any transition:
 * a dependency warning (confirmable), or an issue / upholstery sheet that
 * needs real input. The first is walked through; the others end the spec as
 * skipped, since they are a property of the seeded data, not of the detail.
 */
async function waitForWorking(page: Page, action: Locator): Promise<void> {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if ((await action.getAttribute("aria-label")) === "Tap to pause") {
      return;
    }

    const startAnyway = page.getByTestId("step-dependency-warning-start-anyway");
    if (await startAnyway.isVisible()) {
      await startAnyway.click();
      await expect(page.getByTestId("step-dependency-warning-sheet")).toHaveCount(0);
      continue;
    }

    for (const blocking of [
      "item-issue-selection-sheet",
      "upholstery-selection-missing-sheet",
      "upholstery-warning-sheet",
    ]) {
      test.skip(
        await page.getByTestId(blocking).isVisible(),
        `Starting this step needs input in "${blocking}" — not a detail-page property`,
      );
    }

    await page.waitForTimeout(200);
  }

  await expect(action).toHaveAttribute("aria-label", "Tap to pause");
}

/**
 * Tap the detail's circular button once and assert the label flips in place,
 * then tap once more to leave the step resting (paused, or working again).
 */
async function toggleAndRestore(page: Page, action: Locator): Promise<void> {
  const before = await action.getAttribute("aria-label");
  const wasWorking = before === "Tap to pause";

  await press(page, action);
  if (wasWorking) {
    await pauseThroughSheet(page);
    await expect(action).toHaveAttribute("aria-label", "Tap to resume", {
      timeout: 5_000,
    });
  } else {
    await waitForWorking(page, action);
  }
  // The whole point: the page was never left.
  await expect(page.getByTestId(DETAIL)).toBeVisible();

  // Restore.
  await press(page, action);
  if (wasWorking) {
    await expect(action).toHaveAttribute("aria-label", "Tap to pause", {
      timeout: 5_000,
    });
  } else {
    await pauseThroughSheet(page);
    await expect(action).toHaveAttribute("aria-label", "Tap to resume", {
      timeout: 5_000,
    });
  }
}

test.describe("Step detail entry points", () => {
  test("reacts to Start/Pause when opened from the last-active card", async ({
    page,
    auth,
  }) => {
    await auth.signIn();
    await expect(page.getByTestId("app-shell")).toBeVisible();

    const card = page.getByTestId("last-active-step-card");
    const hasCard = await card
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasCard, "No single last-active step card for this worker");

    await press(page, card);
    await expect(page.getByTestId(DETAIL)).toBeVisible();

    const action = page.getByTestId(ACTION).first();
    const hasAction = await action
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasAction, "The last-active step is terminal — nothing to toggle");

    await toggleAndRestore(page, action);
  });

  test("reacts to Start/Pause when opened from page 2 of a section list", async ({
    page,
    auth,
  }) => {
    await auth.signIn();
    await expect(page.getByTestId("working-sections-list")).toBeVisible();

    const sections = page.getByTestId(
      /^working-section-card-(?!active-count-|done-count-)/,
    );
    const sectionCount = Math.min(await sections.count(), 6);
    const cards = page.getByTestId(/^task-step-card-body-/);
    let secondPageCard: Locator | null = null;

    // Walk the sections until one has a page 2 with a step that is already
    // paused or working — its tap is a plain transition. A pending step's
    // Start first runs the pre-start guards, which depend on the seeded data.
    for (let s = 0; s < sectionCount && !secondPageCard; s += 1) {
      await press(page, sections.nth(s));
      await expect(page.getByTestId("working-section-steps-view")).toBeVisible();

      const showMore = page.getByTestId("working-section-steps-show-more");
      const hasMore = await showMore
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);

      if (hasMore) {
        const firstPageCount = await cards.count();
        await press(page, showMore);
        await expect
          .poll(async () => await cards.count(), { timeout: 15_000 })
          .toBeGreaterThan(firstPageCount);

        const total = await cards.count();
        for (let index = firstPageCount; index < total; index += 1) {
          const card = page
            .getByTestId(/^task-step-card-(?!body-|image-|actions-|reassigned-)/)
            .nth(index);
          // Card labels: "Start Task" (pending), "Pause Task", "Switch to Start".
          const label =
            (await card
              .getByTestId(/^task-step-action-button-/)
              .getAttribute("aria-label")
              .catch(() => null)) ?? "";
          if (label && label !== "Start Task") {
            secondPageCard = cards.nth(index);
            break;
          }
        }
      }

      if (!secondPageCard) {
        await press(page, page.getByTestId("working-section-steps-back"));
        await expect(page.getByTestId("working-sections-list")).toBeVisible();
      }
    }

    test.skip(
      !secondPageCard,
      "No section has a paused or working step beyond its first page",
    );

    await secondPageCard!.scrollIntoViewIfNeeded();
    await press(page, secondPageCard!);
    await expect(page.getByTestId(DETAIL)).toBeVisible();

    const action = page.getByTestId(ACTION).first();
    await expect(action).toBeVisible();

    await toggleAndRestore(page, action);
  });
});
