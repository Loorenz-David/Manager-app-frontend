import type { Locator, Page } from "@playwright/test";

/**
 * Activate an element that lives inside a `PullToRefresh`.
 *
 * On the mobile project the gesture layer runs `@use-gesture` with `filterTaps`,
 * which discards the synthetic mouse events Playwright's `click()` dispatches —
 * the tap never reaches the handler and the test times out. `tap()` produces
 * real touch events and works. Desktop has no touch support, so `tap()` throws
 * there and `click()` is correct.
 *
 * Use this for anything rendered inside a PullToRefresh scroll container.
 * Elements outside one (surface headers, sheet buttons) can use `click()`.
 */
export async function press(page: Page, locator: Locator): Promise<void> {
  const hasTouch = await page.evaluate(() => "ontouchstart" in window);

  if (hasTouch) {
    await locator.tap();
    return;
  }

  await locator.click();
}
