import type { Locator, Page, Route } from "@playwright/test";

import { expect, test } from "../../fixtures/app-fixture";

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

async function press(page: Page, locator: Locator): Promise<void> {
  if (test.info().project.use.hasTouch) await locator.tap();
  else await locator.click();
}

function envelope(data: unknown): Parameters<Route["fulfill"]>[0] {
  return {
    contentType: "application/json",
    body: JSON.stringify({ ok: true, warnings: [], data }),
  };
}

const COUNTERS = {
  items_total: 0,
  items_completed: 0,
  quantity_requested: 0,
  quantity_missing: 0,
  quantity_target: 0,
  quantity_in_queue: 0,
  quantity_in_progress: 0,
  quantity_awaiting: 0,
  quantity_resolved: 0,
  quantity_completed: 0,
};

/** §6.7 + §6.8: a version with one prioritised group, 2 of 5 units done. */
function version(clientId: string, activeAt: Date, closedAt: Date | null) {
  const group = { ...COUNTERS, items_total: 1, quantity_requested: 5, quantity_target: 5, quantity_awaiting: 2, quantity_completed: 2 };
  return {
    client_id: clientId,
    active_at: activeAt.toISOString(),
    closed_at: closedAt ? closedAt.toISOString() : null,
    snapshot_count: 2,
    filtered_snapshot_count: 1,
    created_at: activeAt.toISOString(),
    created_by_id: "usr_1",
    closed_by_id: null,
    progress: { ...group, by_priority: { high: group, medium: COUNTERS, low: COUNTERS } },
  };
}

/** §6.1 with its §6.6 snapshot. */
function row(clientId: string, priority: "high" | "medium" | "low" | null, missing: number) {
  return {
    client_id: clientId,
    item_category: { client_id: "cat_1", name: "Dining chair", major_category: "seat", image_url: null },
    properties: { wood_group: ["teak"] },
    properties_signature: "sig",
    quantity_requested: 5,
    quantity_in_queue: 1,
    quantity_in_progress: 0,
    quantity_awaiting: 2,
    created_at: "2026-09-20T09:00:00+00:00",
    updated_at: null,
    created_by_id: null,
    updated_by_id: null,
    snapshot: {
      client_id: `snap_${clientId}`,
      version_id: "srv_1",
      stock_report_item_id: clientId,
      quantity_requested: 5,
      quantity_in_queue: 1,
      quantity_in_progress: 0,
      quantity_awaiting: 2,
      quantity_missing: missing,
      quantity_resolved: 0,
      priority,
      priority_order: priority ? 1 : null,
      active_at: "2026-09-24T09:00:00+00:00",
      closed_at: null,
      created_at: "2026-09-24T09:00:00+00:00",
      updated_at: null,
      updated_by_id: null,
    },
  };
}

type Scenario = { missingTotal: number; itemsRequests: URL[]; createCalls: number };

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function mockStockReport(page: Page, missingTotal: number): Promise<Scenario> {
  const scenario: Scenario = { missingTotal, itemsRequests: [], createCalls: 0 };
  const active = version("srv_1", daysAgo(2), null);

  await page.route("**/api/v1/stock-report/items**", (route) => {
    scenario.itemsRequests.push(new URL(route.request().url()));
    return route.fulfill(envelope({
      stock_report_items: [row("sri_1", "high", scenario.missingTotal > 0 ? 2 : 0)],
      stock_report_items_pagination: { has_more: false, limit: 20, offset: 0 },
    }));
  });
  await page.route("**/api/v1/stock-report/snapshots/missing-summary", (route) =>
    route.fulfill(envelope({ quantity_missing_total: scenario.missingTotal, items_with_missing: scenario.missingTotal > 0 ? 1 : 0 })),
  );
  // Both version reads carry `?priority=high,medium,low`, so they match on the
  // pathname rather than a glob that would have to end at the query string.
  await page.route(
    (url) => url.pathname.endsWith("/api/v1/stock-report/snapshots/versions/active"),
    (route) => route.fulfill(envelope({ stock_report_snapshot_version: active })),
  );
  // `?` is a glob wildcard in Playwright, so the paginated list and the POST
  // share one predicate route and branch on the method.
  await page.route(
    (url) => url.pathname.endsWith("/api/v1/stock-report/snapshots/versions"),
    (route) => {
      if (route.request().method() === "POST") {
        scenario.createCalls += 1;
        // §5.8: the created row carries no `progress`; `undefined` is dropped
        // by JSON serialisation, so the wire body omits the key.
        const bare = { ...version("srv_2", new Date(), null), progress: undefined };
        return route.fulfill(envelope({ stock_report_snapshot_version: bare }));
      }
      return route.fulfill(
        envelope({
          stock_report_snapshot_versions: [active, version("srv_0", daysAgo(9), daysAgo(2))],
          stock_report_snapshot_versions_pagination: { has_more: false, limit: 20, offset: 0 },
        }),
      );
    },
  );
  return scenario;
}

async function openHub(page: Page): Promise<void> {
  await press(page, page.getByTestId("tab-more"));
  await press(page, page.getByTestId("more-tab-stock needs"));
  await expect(page.getByTestId("stock-report-hub")).toBeVisible();
}

test.describe("Stock report — manager hub", () => {
  test.beforeEach(async () => {
    test.skip(!hasCredentials, "Set Playwright credentials to run app coverage.");
  });

  test("shows the active version's progress by priority and hides the missing row at zero", async ({ auth, page }) => {
    await mockStockReport(page, 0);
    const activeVersionRequest = page.waitForRequest((request) =>
      new URL(request.url()).pathname.endsWith("/api/v1/stock-report/snapshots/versions/active"),
    );
    await auth.signIn();
    await openHub(page);

    // The hub's progress sums the three prioritised groups; omitted, the
    // backend would count the null-priority snapshots instead.
    expect(new URL((await activeVersionRequest).url()).searchParams.get("priority")).toBe("high,medium,low");
    await expect(page.getByTestId("stock-version-age")).toContainText("2 days running");
    await expect(page.getByTestId("stock-version-progress-high-count")).toHaveText("2/5");
    await expect(page.getByTestId("stock-report-hub-open-missing")).toHaveCount(0);

    // The card is the way into the board, which opens as a slide page whose
    // back row scrolls with it.
    await press(page, page.getByTestId("stock-report-hub-open-board"));
    await expect(page.getByTestId("stock-report-board-page")).toBeVisible();
    await expect(page.getByTestId("stock-report-board-back")).toBeVisible();
    await expect(page.getByTestId("stock-report-fab")).toBeVisible();
  });

  test("opens the missing list on All with the missing filter on the wire", async ({ auth, page }) => {
    const scenario = await mockStockReport(page, 7);
    await auth.signIn();
    await openHub(page);

    const missingRow = page.getByTestId("stock-report-hub-open-missing");
    await expect(missingRow).toContainText("7 missing");
    await press(page, missingRow);

    await expect(page.getByTestId("stock-report-missing-page")).toBeVisible();
    await expect(page.getByTestId("stock-report-bucket-all")).toBeVisible();
    await expect(page.getByTestId("stock-need-card-bar-sri_1-missing")).toHaveText("2");
    await expect
      .poll(() =>
        scenario.itemsRequests.some(
          (url) => url.searchParams.get("missing_only") === "true" && url.searchParams.get("priority") === "all",
        ),
      )
      .toBe(true);
  });

  test("creates a new version behind a tap-again confirm, then opens the board slide", async ({ auth, page }) => {
    const scenario = await mockStockReport(page, 0);
    await auth.signIn();
    await openHub(page);

    const create = page.getByTestId("stock-report-hub-create-version");
    await press(page, create);
    await expect(create).toContainText("Confirm Tap");
    await press(page, create);

    await expect(page.getByTestId("stock-report-board-page")).toBeVisible();
    await expect(page.getByTestId("stock-version-create-overlay")).toHaveCount(0);
    expect(scenario.createCalls).toBe(1);
  });

  test("lists the version history newest first", async ({ auth, page }) => {
    await mockStockReport(page, 0);
    await auth.signIn();
    await openHub(page);

    await press(page, page.getByTestId("stock-report-hub-open-history"));

    await expect(page.getByTestId("stock-report-version-history")).toBeVisible();
    const cards = page.getByTestId("stock-version-list").locator("article");
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText("Active");
    await expect(cards.last()).toContainText("Ran 7 days");
  });
});
