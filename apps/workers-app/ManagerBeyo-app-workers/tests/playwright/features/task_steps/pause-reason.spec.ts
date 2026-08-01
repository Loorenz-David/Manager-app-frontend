import { hasPlaywrightCredentials, expect, test } from "../../fixtures/app-fixture";
import {
  GATED_REASON_TESTID,
  stubGatedPauseReason,
} from "../../helpers/gated-pause-reason";
import { press } from "../../helpers/press";

test.skip(
  !hasPlaywrightCredentials(),
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

test.describe("Pause reason flow", () => {
  // The catalog route can still be in flight when the page closes, which
  // surfaces as a route-callback error rather than a test failure.
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

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

    // The catalog has no `requires_description` reason any more, so the gated
    // two-screen flow below would be unreachable. This flips that flag on one
    // real reason; the id stays genuine, so the pause request it produces is
    // accepted by the backend like any other.
    await stubGatedPauseReason(page);

    await auth.signIn();
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect.poll(() => pauseReasonRequests.length).toBeGreaterThan(0);

    // `count()` does not wait, so checking it immediately after sign-in skipped
    // on a slow last-active query rather than on a genuine absence of work.
    const activeAction = page.getByTestId(/^last-active-card-action-/);
    const hasActiveStep = await activeAction
      .first()
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(
      !hasActiveStep,
      "No active worker step is available for pause-flow validation",
    );

    await press(page, activeAction);
    // KNOWN FLAKE (mobile project only, ~2 runs in 3, always here): the tap
    // lands on a card showing "Pause" — so the step really is `working` — but
    // the sheet never opens. Passes reliably in isolation and on desktop, so it
    // depends on state left by earlier specs in the run. Ruled out: parallelism
    // (still fails at `workers: 1`), synthetic-click swallowing (fails with
    // both `click()` and `tap()`), a slow lazy chunk (a 20s timeout did not
    // help), and an overlay intercepting the tap (no dialog or presentation
    // viewport in the failure DOM). Not investigated further — pre-existing and
    // outside the scope of the plans that touched this file.
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
    await press(page, page.getByTestId(/^last-active-card-action-/));
    await resumeTransition;

    await press(page, page.getByTestId(/^last-active-card-action-/));
    await page.getByTestId(GATED_REASON_TESTID).click();
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
    await press(page, page.getByTestId(/^last-active-card-action-/));
    await resumeAgain;

    await press(page, page.getByTestId(/^last-active-card-action-/));
    const endedTransition = page.waitForRequest(
      (request) =>
        request.url().includes("/transition") &&
        request.method() === "POST",
    );
    await page.getByTestId("pause-reason-option-pause_ended_shift").click();
    // The ended-shift *state* is gone from everything we send: the reason now
    // travels on the state record instead (handoff §6.1).
    expect((await endedTransition).postDataJSON()).toMatchObject({
      new_state: "paused",
      pause_reason_id: expect.any(String),
    });
  });
});
