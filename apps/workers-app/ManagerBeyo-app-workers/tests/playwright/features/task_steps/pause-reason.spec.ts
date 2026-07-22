import { hasPlaywrightCredentials, expect, test } from "../../fixtures/app-fixture";

test.skip(
  !hasPlaywrightCredentials(),
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

test.describe("Pause reason flow", () => {
  test("prefetches the catalog and handles plain, gated, and ended-shift reasons", async ({
    page,
    auth,
  }) => {
    const pauseReasonRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/pause-reasons")) {
        pauseReasonRequests.push(request.url());
      }
    });

    await auth.signIn();
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect.poll(() => pauseReasonRequests.length).toBeGreaterThan(0);

    const activeAction = page.getByTestId(/^last-active-card-action-/);
    test.skip(
      (await activeAction.count()) === 0,
      "No active worker step is available for pause-flow validation",
    );

    await activeAction.click();
    await expect(page.getByTestId("pause-reason-sheet")).toBeVisible();
    await expect(page.getByTestId("pause-reason-loading")).toHaveCount(0);

    const plainTransition = page.waitForRequest(
      (request) =>
        request.url().includes("/transition") &&
        request.method() === "POST",
    );
    await page.getByTestId("pause-reason-option-pause_lunch_break").click();
    expect((await plainTransition).postDataJSON()).toMatchObject({
      new_state: "paused",
      pause_reason_id: expect.any(String),
    });

    await expect(page.getByTestId("pause-reason-sheet")).toHaveCount(0);

    const resumeTransition = page.waitForRequest(
      (request) =>
        request.url().includes("/transition") &&
        request.method() === "POST",
    );
    await page.getByTestId(/^last-active-card-action-/).click();
    await resumeTransition;

    await page.getByTestId(/^last-active-card-action-/).click();
    await page.getByTestId("pause-reason-option-pause_other_task_priority").click();
    const descriptionInput = page.getByTestId("pause-reason-description-input");
    await expect(descriptionInput).toBeVisible();
    await expect(page.getByTestId("pause-reason-submit-button")).toBeDisabled();
    await descriptionInput.fill("Waiting for another task");

    const describedTransition = page.waitForRequest(
      (request) =>
        request.url().includes("/transition") &&
        request.method() === "POST",
    );
    await page.getByTestId("pause-reason-submit-button").click();
    expect((await describedTransition).postDataJSON()).toMatchObject({
      new_state: "paused",
      pause_reason_id: expect.any(String),
      description: "Waiting for another task",
    });

    await expect(page.getByTestId("pause-reason-sheet")).toHaveCount(0);

    const resumeAgain = page.waitForRequest(
      (request) =>
        request.url().includes("/transition") &&
        request.method() === "POST",
    );
    await page.getByTestId(/^last-active-card-action-/).click();
    await resumeAgain;

    await page.getByTestId(/^last-active-card-action-/).click();
    const endedTransition = page.waitForRequest(
      (request) =>
        request.url().includes("/transition") &&
        request.method() === "POST",
    );
    await page.getByTestId("pause-reason-option-pause_ended_shift").click();
    expect((await endedTransition).postDataJSON()).toMatchObject({
      new_state: "ended_shift",
      pause_reason_id: expect.any(String),
    });
  });
});
