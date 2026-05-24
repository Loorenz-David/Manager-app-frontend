import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

async function openTestingForms(page: Page) {
  await page.getByTestId('tab-tasks').click();
  await expect(page).toHaveURL(/\/tasks$/);
  const openButton = page.locator('[data-testid="open-testing-forms-button"]:visible');
  await expect(openButton).toHaveCount(1);
  await openButton.click();
  await expect(page.getByTestId('testing-forms-form')).toBeVisible();
}

/**
 * Installs a MutationObserver on document.body before a surface is opened.
 * Returns a function that disconnects the observer and reports whether a
 * surface skeleton was ever added to the DOM.
 */
async function installSkeletonDetector(page: Page) {
  await page.evaluate(() => {
    (window as Window & { __skeletonDetected?: boolean; __skeletonObserver?: MutationObserver })
      .__skeletonDetected = false;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            if (
              node.getAttribute('data-testid') === 'surface-skeleton' ||
              node.querySelector('[data-testid="surface-skeleton"]')
            ) {
              (window as Window & { __skeletonDetected?: boolean }).__skeletonDetected = true;
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    (window as Window & { __skeletonObserver?: MutationObserver }).__skeletonObserver = observer;
  });

  return async function checkAndDisconnect(): Promise<boolean> {
    return page.evaluate(() => {
      const w = window as Window & {
        __skeletonDetected?: boolean;
        __skeletonObserver?: MutationObserver;
      };
      w.__skeletonObserver?.disconnect();
      return w.__skeletonDetected ?? false;
    });
  };
}

test.describe('Surface preload — no skeleton on open', () => {
  test.beforeEach(async ({ auth }) => {
    test.skip(
      !hasCredentials,
      'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run',
    );
    await auth.signIn();
  });

  test('calendar-single-picker opens without skeleton after preload', async ({ page }) => {
    // Listen for the Vite dev-server response for CalendarSinglePickerPage BEFORE
    // the form mounts. TestingFormsContent calls usePreloadSurface at the container
    // level, so the import fires as soon as the form is rendered.
    const calendarChunkLoaded = page.waitForResponse(
      (resp) =>
        resp.url().includes('CalendarSinglePickerPage') && resp.status() === 200,
      { timeout: 15_000 },
    );

    await openTestingForms(page);

    // Wait until the preload import has fully resolved.
    await calendarChunkLoaded;

    // Navigate to the task step (where the date field lives).
    await page.getByTestId('staged-form-step-task-indicator').click({ force: true });
    await expect(page.getByTestId('task-ready-by-date-field')).toBeVisible();

    // Arm the skeleton detector before triggering the surface open.
    const checkSkeleton = await installSkeletonDetector(page);

    await page.getByTestId('task-ready-by-date-input').click();
    await expect(page.getByTestId('calendar-single-picker-page')).toBeVisible();

    const skeletonDetected = await checkSkeleton();
    expect(skeletonDetected, 'Surface skeleton must not appear when surface is preloaded').toBe(
      false,
    );
  });

  test('calendar-range-picker opens without skeleton after preload', async ({ page }) => {
    const calendarChunkLoaded = page.waitForResponse(
      (resp) =>
        resp.url().includes('CalendarRangePickerPage') && resp.status() === 200,
      { timeout: 15_000 },
    );

    await openTestingForms(page);
    await calendarChunkLoaded;

    await page.getByTestId('staged-form-step-task-indicator').click({ force: true });
    await expect(page.getByTestId('task-delivery-date-field')).toBeVisible();

    const checkSkeleton = await installSkeletonDetector(page);

    await page.getByTestId('task-delivery-date-input').click();
    await expect(page.getByTestId('calendar-range-picker-page')).toBeVisible();

    const skeletonDetected = await checkSkeleton();
    expect(skeletonDetected, 'Surface skeleton must not appear when surface is preloaded').toBe(
      false,
    );
  });
});
