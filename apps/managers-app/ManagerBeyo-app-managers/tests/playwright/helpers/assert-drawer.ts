import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function assertDrawerOpen(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).toBeVisible();
}

export async function assertDrawerDismissedByGesture(page: Page, testId: string) {
  const drawer = page.getByTestId(testId);
  const box = await drawer.boundingBox();

  if (!box) throw new Error(`Drawer "${testId}" not found or not visible`);

  await page.mouse.move(box.x + box.width / 2, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 400, { steps: 20 });
  await page.mouse.up();

  await expect(drawer).not.toBeVisible({ timeout: 1000 });
}
