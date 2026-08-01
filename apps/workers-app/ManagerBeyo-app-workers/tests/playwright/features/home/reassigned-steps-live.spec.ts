import { expect, test } from "@playwright/test";
import { press } from "../../helpers/press";
import { CARD_ROOT } from "../../helpers/selectors";

/**
 * Live-contract coverage for the two reassigned-steps endpoints (live since
 * 2026-08-01). Deliberately **unstubbed** — this is the pass that would catch a
 * real backend drift, which every route-stubbed spec is blind to by
 * construction.
 *
 * What it proves:
 *  - the live envelope and item shape satisfy `ReassignedStepItemSchema`
 *    (a Zod failure surfaces as `invalid_response` → the page's error state);
 *  - the §13 canary: `count.total` equals the fully-paged list length;
 *  - neither endpoint 4xx/5xxs on the happy path, and an empty inbox is a 200
 *    with zero rows rather than a 404 (§10).
 *
 * It is data-tolerant: a test account with an empty inbox still exercises the
 * envelope, the empty state and the canary at zero.
 */

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? "";
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";

const REASSIGNED_PATH = "/api/v1/task-step-acknowledgments/reassigned-steps";

// Bounded so a paging bug fails the test instead of hanging it.
const MAX_PAGES = 25;

test.skip(
  !EMAIL || !PASSWORD,
  "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test",
);

test.describe("Home - reassigned steps (live endpoints)", () => {
  test("live payload parses, pages to exhaustion and matches the badge count", async ({
    page,
  }) => {
    const failures: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes(REASSIGNED_PATH) && response.status() >= 400) {
        failures.push(`${response.status()} ${response.url()}`);
      }
    });

    // Take the expected total from the count *response* rather than the badge.
    // Reading the DOM races the query: before it resolves the badge is absent,
    // which is indistinguishable from a genuine zero.
    const countResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`${REASSIGNED_PATH}/count`) &&
        response.status() === 200,
      { timeout: 30_000 },
    );

    await page.goto("/sign-in");
    await page.getByTestId("auth-email-input").fill(EMAIL);
    await page.getByTestId("auth-password-input").fill(PASSWORD);
    await page.getByTestId("auth-sign-in-button").click();
    await expect(page).toHaveURL("/");

    await expect(page.getByTestId("reassigned-card")).toBeVisible({
      timeout: 20_000,
    });

    const countBody = (await (await countResponse).json()) as {
      data: { reassigned_steps_count: { total: number; unacknowledged: number } };
    };
    const expectedTotal = countBody.data.reassigned_steps_count.total;
    expect(Number.isInteger(expectedTotal)).toBe(true);

    // The badge renders that same total, and is hidden at zero.
    const badge = page.getByTestId("reassigned-card-badge");
    if (expectedTotal > 0) {
      await expect(badge).toHaveText(String(expectedTotal));
    } else {
      await expect(badge).toHaveCount(0);
    }

    await press(page, page.getByTestId("reassigned-card"));
    await expect(page.getByTestId("reassigned-steps-slide-page")).toBeVisible();

    // A Zod mismatch against the live shape becomes an `invalid_response`
    // ApiRequestError, which renders here. Its absence is the schema-parity
    // assertion (handoff §11).
    await expect(page.getByTestId("reassigned-steps-error")).toHaveCount(0);

    if (expectedTotal === 0) {
      // Empty is a 200 with no rows, never a 404 (§10).
      await expect(page.getByTestId("reassigned-steps-empty")).toBeVisible();
      await expect(page.getByTestId(CARD_ROOT)).toHaveCount(0);
      expect(failures, "no 4xx/5xx from the reassigned endpoints").toEqual([]);
      return;
    }

    await expect(page.getByTestId("reassigned-steps-list")).toBeVisible();

    // Page to exhaustion — "Show more" disappears once has_more is false.
    const showMore = page.getByTestId("reassigned-steps-show-more");
    for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex += 1) {
      if (!(await showMore.isVisible().catch(() => false))) {
        break;
      }

      const before = await page.getByTestId(CARD_ROOT).count();
      await press(page, showMore);
      // Wait for the next page to land rather than for a fixed delay.
      await expect
        .poll(() => page.getByTestId(CARD_ROOT).count(), { timeout: 15_000 })
        .toBeGreaterThan(before);
    }

    await expect(showMore).toHaveCount(0);

    // §13 canary: the badge and the fully-paged list share one backend filter
    // definition, so they can never legitimately disagree.
    await expect(page.getByTestId(CARD_ROOT)).toHaveCount(expectedTotal);

    // Every row must sit inside a section container — `working_sections` is
    // guaranteed populated for every item on every page (§7).
    const groupCount = await page
      .getByTestId(/^reassigned-steps-group-wsec_/)
      .count();
    expect(groupCount).toBeGreaterThan(0);

    expect(failures, "no 4xx/5xx from the reassigned endpoints").toEqual([]);
  });

  test("count endpoint is never called with a search parameter", async ({
    page,
  }) => {
    const countUrls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes(`${REASSIGNED_PATH}/count`)) {
        countUrls.push(request.url());
      }
    });

    await page.goto("/sign-in");
    await page.getByTestId("auth-email-input").fill(EMAIL);
    await page.getByTestId("auth-password-input").fill(PASSWORD);
    await page.getByTestId("auth-sign-in-button").click();
    await expect(page).toHaveURL("/");

    await expect(page.getByTestId("reassigned-card")).toBeVisible({
      timeout: 20_000,
    });

    await press(page, page.getByTestId("reassigned-card"));
    await expect(page.getByTestId("reassigned-steps-slide-page")).toBeVisible();

    // Type a search and wait for the *list* to actually re-query with it, so
    // the assertion below is made after the search round-trip, not before it.
    const searchedList = page.waitForRequest(
      (request) =>
        request.url().includes(REASSIGNED_PATH) &&
        !request.url().includes("/count") &&
        request.url().includes("q="),
      { timeout: 15_000 },
    );
    await page.getByTestId("reassigned-steps-search-input").fill("sofa");
    await searchedList;

    expect(countUrls.length).toBeGreaterThan(0);
    for (const url of countUrls) {
      // `q` is deliberately absent from the count endpoint (§4) — a badge that
      // shrank with the search box would be wrong.
      expect(url).not.toContain("q=");
    }
  });
});
