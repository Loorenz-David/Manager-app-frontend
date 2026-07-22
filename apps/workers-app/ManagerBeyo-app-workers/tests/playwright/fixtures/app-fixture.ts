import { expect, test as base } from "@playwright/test";

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? "";
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";

type AuthFixture = {
  signIn: () => Promise<void>;
};

export const test = base.extend<{ auth: AuthFixture }>({
  auth: async ({ page }, use) => {
    await use({
      signIn: async () => {
        await page.goto("/sign-in");
        await page.getByTestId("auth-email-input").fill(EMAIL);
        await page.getByTestId("auth-password-input").fill(PASSWORD);
        await page.getByTestId("auth-sign-in-button").click();
        await expect(page).toHaveURL("/");
      },
    });
  },
});

export { expect };

export function hasPlaywrightCredentials(): boolean {
  return Boolean(EMAIL && PASSWORD);
}
