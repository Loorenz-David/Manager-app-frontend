import { expect, test } from "@playwright/test";
import { press } from "../../helpers/press";
import { stubReassignedStepsEndpoints } from "../../helpers/reassigned-steps-stubs";
import { CARD_ROOT } from "../../helpers/selectors";

// Route-stubbed on purpose. The endpoints are live, but these cases assert our
// own grouping, page-merge and search wiring, which need a fixture with a known
// section spread and a forced page boundary. Live-contract coverage — including
// the §13 count/list canary — lives in `reassigned-steps-live.spec.ts`.

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? "";
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";

test.skip(
  !EMAIL || !PASSWORD,
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

test.describe("Home - reassigned steps page", () => {
  test.beforeEach(async ({ page }) => {
    // Page size 2 over 3 items, so "Show more" is always reachable.
    await stubReassignedStepsEndpoints(page, { pageSize: 2 });

    await page.goto("/sign-in");
    await page.getByTestId("auth-email-input").fill(EMAIL);
    await page.getByTestId("auth-password-input").fill(PASSWORD);
    await page.getByTestId("auth-sign-in-button").click();
    await expect(page).toHaveURL("/");

    await press(page, page.getByTestId("reassigned-card"));
    await expect(page.getByTestId("reassigned-steps-slide-page")).toBeVisible();
  });

  test("groups steps into per-section containers ordered by order_list", async ({
    page,
  }) => {
    await expect(page.getByTestId("reassigned-steps-list")).toBeVisible();

    const groupNames = page.getByTestId(/^reassigned-steps-group-name-/);
    // Carpentry has order_list 1, Upholstery 2.
    await expect(groupNames.first()).toHaveText("Carpentry");
    await expect(
      page.getByTestId("reassigned-steps-group-name-wsec_upholstery"),
    ).toHaveText("Upholstery");
  });

  test("Show more merges the next page into the existing container", async ({
    page,
  }) => {
    const upholsteryGroup = page.getByTestId(
      "reassigned-steps-group-wsec_upholstery",
    );
    await expect(upholsteryGroup).toBeVisible();
    // Page 1 (limit 2) is [upholstery, carpentry] — one Upholstery row.
    await expect(upholsteryGroup.getByTestId(CARD_ROOT)).toHaveCount(1);

    await press(page, page.getByTestId("reassigned-steps-show-more"));

    // The third step is a second Upholstery row — it must land in the same
    // container, not create a duplicate one (handoff §7).
    await expect(upholsteryGroup.getByTestId(CARD_ROOT)).toHaveCount(2);
    await expect(
      page.getByTestId("reassigned-steps-group-wsec_upholstery"),
    ).toHaveCount(1);
    // And the merge is deduped by client_id — no row appears twice.
    await expect(page.getByTestId(CARD_ROOT)).toHaveCount(3);
  });

  test("search narrows the list and clearing it restores every step", async ({
    page,
  }) => {
    const input = page.getByTestId("reassigned-steps-search-input");

    await input.fill("table-oak");
    await expect(
      page.getByTestId("reassigned-steps-group-name-wsec_carpentry"),
    ).toBeVisible({ timeout: 4000 });
    await expect(
      page.getByTestId("reassigned-steps-group-wsec_upholstery"),
    ).toHaveCount(0);

    await input.fill("");
    await expect(
      page.getByTestId("reassigned-steps-group-wsec_upholstery"),
    ).toBeVisible({ timeout: 4000 });
  });

  test("a query that matches nothing shows the empty state, not an error", async ({
    page,
  }) => {
    await page
      .getByTestId("reassigned-steps-search-input")
      .fill("NOMATCH_XYZ_999");

    await expect(page.getByTestId("reassigned-steps-empty")).toBeVisible({
      timeout: 4000,
    });
    await expect(page.getByTestId("reassigned-steps-error")).toHaveCount(0);
  });

  test("tapping a step card opens the task step detail slide", async ({
    page,
  }) => {
    const card = page.getByTestId(/^task-step-card-body-/).first();
    await expect(card).toBeVisible();
    await press(page, card);

    await expect(page.getByTestId("task-detail-slide-page")).toBeVisible({
      timeout: 6000,
    });
  });

  test("tapping the three-dot control opens the task actions sheet", async ({
    page,
  }) => {
    const actions = page.getByTestId(/^task-step-card-actions-/).first();
    await expect(actions).toBeVisible();
    await press(page, actions);

    await expect(page.getByTestId("task-step-actions-sheet")).toBeVisible({
      timeout: 6000,
    });
  });

  test("the quick action starts the step via a transition request", async ({
    page,
  }) => {
    const actionButton = page.getByTestId(/^task-step-action-button-/).first();
    await expect(actionButton).toBeVisible();

    const transition = page.waitForRequest(
      (request) =>
        request.url().includes("/transition") && request.method() === "POST",
      { timeout: 6000 },
    );

    await press(page, actionButton);

    expect((await transition).postDataJSON()).toMatchObject({
      new_state: "working",
    });
  });
});
