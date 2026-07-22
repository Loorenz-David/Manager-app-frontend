import { expect, test as base } from "@playwright/test";

import { AuthHelper } from "./auth-fixture";

type AppFixtures = {
  auth: AuthHelper;
};

export const test = base.extend<AppFixtures>({
  page: async ({ page }, use) => {
    const errors: string[] = [];

    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const known = ["[HMR] Cannot apply update", "Failed to load resource"];
      if (!known.some((entry) => message.text().includes(entry))) {
        errors.push(`[console.error] ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      errors.push(`[pageerror] ${error.message}`);
    });

    await use(page);
    expect(errors, "Console errors or uncaught exceptions occurred").toEqual([]);
  },
  auth: async ({ page }, use) => {
    await use(new AuthHelper(page));
  },
});

export { expect };
