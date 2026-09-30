import { expect, test as base } from "@playwright/test";

import { routeSystemReady } from "./system-control";

export const test = base.extend({
  page: async ({ page }, runFixture) => {
    const errors: string[] = [];

    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !message.text().includes("Failed to load resource")
      ) {
        errors.push(`[console.error] ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      errors.push(`[pageerror] ${error.message}`);
    });

    // Every page boots through the system gate: answer its control plane
    // READY unless the test routes another state.
    await routeSystemReady(page);

    await runFixture(page);

    expect(errors, "Console errors or uncaught exceptions occurred").toEqual(
      [],
    );
  },
});

export { expect };
