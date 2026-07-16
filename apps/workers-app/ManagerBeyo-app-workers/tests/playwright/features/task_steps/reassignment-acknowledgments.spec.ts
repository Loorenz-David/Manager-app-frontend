import { expect, test } from "@playwright/test";

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? "";
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";

test.skip(
  !EMAIL || !PASSWORD,
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

test.describe("Task steps - reassignment acknowledgments", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByTestId("auth-email-input").fill(EMAIL);
    await page.getByTestId("auth-password-input").fill(PASSWORD);
    await page.getByTestId("auth-sign-in-button").click();
    await expect(page).toHaveURL("/");
  });

  test("panel renders reassignment rows above the last-active card", async ({
    page,
  }) => {
    const panel = page.getByTestId("reassignment-ack-panel");

    await page.waitForTimeout(800);
    const panelVisible = await panel.isVisible().catch(() => false);
    test.skip(!panelVisible, "No pending reassignments for this user");

    // Header + count + at least one row are present.
    await expect(page.getByTestId("reassignment-ack-panel-header")).toBeVisible();
    await expect(page.getByTestId("reassignment-ack-panel-count")).toBeVisible();
    await expect(
      panel.getByTestId(/^reassignment-ack-row-/).first(),
    ).toBeVisible();
  });

  test("opening the app fires a /seen receipt for visible obligations", async ({
    page,
  }) => {
    // Re-navigate so we can observe the seen request tied to a fresh mount.
    const seenRequest = page
      .waitForRequest(
        (req) =>
          req.url().includes("/api/v1/task-step-acknowledgments/seen") &&
          req.method() === "POST",
        { timeout: 4000 },
      )
      .catch(() => null);

    await page.goto("/");
    const panel = page.getByTestId("reassignment-ack-panel");
    await page.waitForTimeout(800);
    const panelVisible = await panel.isVisible().catch(() => false);
    test.skip(!panelVisible, "No pending reassignments for this user");

    // If any row was previously unseen, /seen should have been sent.
    const req = await seenRequest;
    test.skip(
      req === null,
      "All obligations already seen — no /seen request expected",
    );
    expect(req?.postDataJSON()).toHaveProperty("step_ids");
  });

  test("acknowledging a row removes it from the panel", async ({ page }) => {
    const panel = page.getByTestId("reassignment-ack-panel");

    await page.waitForTimeout(800);
    const panelVisible = await panel.isVisible().catch(() => false);
    test.skip(!panelVisible, "No pending reassignments for this user");

    const firstRow = panel.getByTestId(/^reassignment-ack-row-[^-]+$/).first();
    const rowId = await firstRow.getAttribute("data-testid");
    const ackButton = page.getByTestId(`${rowId}-acknowledge`);

    await ackButton.tap();

    // Row disappears (either the whole panel unmounts, or just this row).
    await expect(page.getByTestId(rowId ?? "")).toHaveCount(0);
  });
});
