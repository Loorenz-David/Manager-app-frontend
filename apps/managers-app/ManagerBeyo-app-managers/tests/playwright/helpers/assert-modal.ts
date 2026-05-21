import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function assertModalOpen(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).toBeVisible();
}

export async function assertModalClosedByBackdrop(page: Page, testId: string) {
  await page.mouse.click(10, 10);
  await expect(page.getByTestId(testId)).not.toBeVisible({ timeout: 1000 });
}

export async function assertModalClosedByEscape(page: Page, testId: string) {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId(testId)).not.toBeVisible({ timeout: 1000 });
}
