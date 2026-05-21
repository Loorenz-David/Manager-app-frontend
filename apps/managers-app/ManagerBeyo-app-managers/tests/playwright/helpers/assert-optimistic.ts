import type { Page } from '@playwright/test';

export async function withDelayedRoute(
  page: Page,
  pattern: string,
  method: string,
  callback: () => Promise<void>,
): Promise<{ resolve: () => void }> {
  let resolveDelay!: () => void;

  await page.route(pattern, async (route) => {
    if (route.request().method() === method) {
      await new Promise<void>((resolve) => {
        resolveDelay = resolve;
      });
    }
    await route.continue();
  });

  await callback();
  return { resolve: resolveDelay };
}
