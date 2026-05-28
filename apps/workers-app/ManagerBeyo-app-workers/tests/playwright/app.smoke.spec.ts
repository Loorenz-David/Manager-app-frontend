import { expect, test } from "@playwright/test";

test("worker app loads", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/ManagerBeyo|Vite|React|Worker/i);
});
