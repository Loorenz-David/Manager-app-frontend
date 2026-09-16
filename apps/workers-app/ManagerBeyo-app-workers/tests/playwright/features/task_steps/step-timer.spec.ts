import type { Locator, Page } from "@playwright/test";
import { hasPlaywrightCredentials, expect, test } from "../../fixtures/app-fixture";
import { press } from "../../helpers/press";

test.skip(
  !hasPlaywrightCredentials(),
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

/**
 * The worked total must never go backwards when a step is paused.
 *
 * Three separate defects produced that same symptom, and none of them were
 * reachable from Vitest — each needed a real payload arriving at a real moment:
 *
 *  1. the client counted from when the last payload arrived rather than from
 *     when the run began;
 *  2. the detail surface held a budget snapshot frozen at open time;
 *  3. the server briefly served a total that omitted the run it had just closed.
 *
 * The assertion below is deliberately blunt — the number may not drop — because
 * that is the one property all three violated, and it stays true whatever the
 * cause of the next one.
 */

const TIMER = "last-active-card-timer";
const CARD_ACTION = /^last-active-card-action-/;

/** "01:23:45" → 5025. Returns null for the "—" placeholder. */
function parseHHMMSS(value: string | null): number | null {
  const match = value?.trim().match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function readTimer(page: Page): Promise<number | null> {
  return parseHHMMSS(await page.getByTestId(TIMER).textContent());
}

/**
 * Leaves the card's step `working`, whichever state it started in.
 *
 * The card's action has no state in its test id, so the state is inferred from
 * what the press does: on a working step it opens the pause-reason sheet, on a
 * paused one it resumes directly.
 */
async function ensureWorking(page: Page, action: Locator): Promise<void> {
  await press(page, action);

  const sheet = page.getByTestId("pause-reason-sheet");
  const wasWorking = await sheet
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!wasWorking) {
    // The press resumed it; wait for the transition to land before reading.
    await expect(sheet).toHaveCount(0);
    return;
  }

  await pauseThroughSheet(page);
  await press(page, action);
  await expect(sheet).toHaveCount(0);
}

async function pauseThroughSheet(page: Page): Promise<void> {
  await expect(page.getByTestId("pause-reason-sheet")).toBeVisible();
  await expect(page.getByTestId("pause-reason-loading")).toHaveCount(0);
  await page.getByTestId("pause-reason-option-pause_lunch_break").click();
  await expect(page.getByTestId("pause-reason-sheet")).toHaveCount(0);
}

test.describe("Step timer", () => {
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("never reports less worked time after a pause than before it", async ({
    page,
    auth,
  }) => {
    await auth.signIn();
    await expect(page.getByTestId("app-shell")).toBeVisible();

    const action = page.getByTestId(CARD_ACTION).first();
    const hasActiveStep = await action
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasActiveStep, "No active worker step available for the timer flow");

    await ensureWorking(page, action);

    const started = await readTimer(page);
    test.skip(
      started === null,
      "The active step reports no worked time yet — nothing to compare against",
    );

    // The clock ticks once a second; three seconds is enough to prove it runs
    // without making the spec slow.
    await expect
      .poll(async () => await readTimer(page), { timeout: 10_000 })
      .toBeGreaterThan(started as number);

    const beforePause = (await readTimer(page)) as number;

    await press(page, action);
    await pauseThroughSheet(page);

    // The window that mattered: the optimistic freeze, the transition response,
    // and every refetch it triggers all land inside this span. Any of them
    // lowering the number is the regression.
    const floor = beforePause;
    const deadline = Date.now() + 10_000;
    let lowest = Number.POSITIVE_INFINITY;

    while (Date.now() < deadline) {
      const current = await readTimer(page);
      if (current !== null) {
        lowest = Math.min(lowest, current);
        expect(
          current,
          `the paused total fell to ${current}s, below the ${floor}s shown while working`,
        ).toBeGreaterThanOrEqual(floor);
      }
      await page.waitForTimeout(250);
    }

    expect(lowest).toBeGreaterThanOrEqual(floor);

    // A paused step holds its position: it must not keep accruing. The small
    // allowance covers the settled total landing a second or two above the last
    // value rendered while the step was still running.
    const settled = (await readTimer(page)) as number;
    expect(settled).toBeLessThanOrEqual(floor + 5);
  });
});
