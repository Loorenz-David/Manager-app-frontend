import type { Locator, Page, Route } from "@playwright/test";

import { expect, test } from "../../fixtures/app-fixture";

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

/** `PullToRefresh` swallows synthetic clicks on touch projects, so taps there are real taps. */
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

/** v11 Part A: the backend's own 404 for an absent version id. */
function versionNotFound(): Parameters<Route["fulfill"]>[0] {
  return {
    status: 404,
    contentType: "application/json",
    body: JSON.stringify({ ok: false, error: "Stock report snapshot version not found." }),
  };
}

/** v11 §6: every ISO string is echoed in UTC with an explicit `+00:00`, never `Z`. */
function utc(value: Date | string): string {
  return new Date(value).toISOString().replace("Z", "+00:00");
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

type VersionState = "draft" | "active" | "closed";

type MockVersion = {
  client_id: string;
  state: VersionState;
  title: string | null;
  active_at: string | null;
  closed_at: string | null;
  scheduled_activation_at: string | null;
  scheduled_activation_keeps_active_missing: boolean;
  snapshot_count: number;
  filtered_snapshot_count: number;
  created_at: string;
  created_by_id: string | null;
  closed_by_id: string | null;
  progress: typeof COUNTERS & { by_priority: Record<"high" | "medium" | "low" | "unset", typeof COUNTERS> };
};

/** v11 §6.7 + §6.8: a version with one prioritised group, 2 of 5 units done. */
function version(clientId: string, fields: Partial<MockVersion> & { createdAt: Date }): MockVersion {
  const group = { ...COUNTERS, items_total: 1, quantity_requested: 5, quantity_target: 5, quantity_awaiting: 2, quantity_completed: 2 };
  const { createdAt, ...rest } = fields;
  return {
    client_id: clientId,
    state: "active",
    title: null,
    active_at: utc(createdAt),
    closed_at: null,
    scheduled_activation_at: null,
    scheduled_activation_keeps_active_missing: false,
    snapshot_count: 2,
    filtered_snapshot_count: 1,
    created_at: utc(createdAt),
    created_by_id: "usr_1",
    closed_by_id: null,
    // v11 §6.8 also sends the null-priority group; the client reads only the three.
    progress: { ...group, by_priority: { high: group, medium: COUNTERS, low: COUNTERS, unset: COUNTERS } },
    ...rest,
  };
}

/** v10 §6.1 with its §6.6 snapshot, in one version. */
function row(clientId: string, versionId: string, snapshot: Record<string, unknown> = {}) {
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
      client_id: `snap_${versionId}_${clientId}`,
      version_id: versionId,
      stock_report_item_id: clientId,
      quantity_requested: 5,
      quantity_requested_scanner: 5,
      quantity_requested_source: "scanner",
      quantity_in_queue: 1,
      quantity_in_progress: 0,
      quantity_awaiting: 2,
      quantity_missing: 0,
      quantity_missing_source: "own",
      active_quantity_missing: 0,
      quantity_resolved: 0,
      priority: "high",
      priority_order: 1,
      active_at: "2026-09-24T09:00:00+00:00",
      closed_at: null,
      created_at: "2026-09-24T09:00:00+00:00",
      updated_at: null,
      updated_by_id: null,
      ...snapshot,
    },
  };
}

type Call = { method: string; path: string; search: URLSearchParams; body: unknown; rawBody: string | null };

type Scenario = {
  missingTotal: number;
  versions: MockVersion[];
  calls: Call[];
  /** The last call whose method and path match, or `undefined`. */
  last: (method: string, path: string) => Call | undefined;
};

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

const API = "/api/v1/stock-report";

/** v11 §6.7: command responses carry the version without its read-only `progress` and `filtered_snapshot_count`. */
function commandRow(target: MockVersion) {
  const row: Partial<MockVersion> = { ...target };
  delete row.progress;
  delete row.filtered_snapshot_count;
  return row;
}

/**
 * One stateful stand-in for the stock-report API: versions are created,
 * edited, activated and deleted in `scenario.versions`, and every request is
 * recorded in `scenario.calls` so a flow can assert the body it sent. Only the
 * pathname is matched — `?` is a glob wildcard in Playwright, and the reads
 * carry query strings.
 */
async function mockStockReport(page: Page, { missingTotal = 0 }: { missingTotal?: number } = {}): Promise<Scenario> {
  const scenario: Scenario = {
    missingTotal,
    versions: [
      version("srv_1", { createdAt: daysAgo(2), title: "Spring board" }),
      version("srv_0", { createdAt: daysAgo(9), state: "closed", closed_at: utc(daysAgo(2)) }),
      // The stored keep choice is "keep", so a manual "Start at 0" is visibly a choice.
      version("srv_draft", {
        createdAt: daysAgo(1),
        state: "draft",
        title: "Autumn restock",
        active_at: null,
        scheduled_activation_keeps_active_missing: true,
      }),
    ],
    calls: [],
    last: (method, path) => [...scenario.calls].reverse().find((call) => call.method === method && call.path === path),
  };
  const find = (id: string) => scenario.versions.find((candidate) => candidate.client_id === id);
  const rowsOf = (versionId: string) =>
    versionId === "srv_1"
      ? [row("sri_1", "srv_1", { quantity_missing: scenario.missingTotal > 0 ? 2 : 0, active_quantity_missing: scenario.missingTotal > 0 ? 2 : 0 })]
      : // A draft row with its own typed missing count (v9 §6.6), so it can follow the live version again.
        [row("sri_1", versionId, { active_at: null, quantity_missing: 1, quantity_missing_source: "own", active_quantity_missing: 0 })];

  await page.route(
    (url) => url.pathname.startsWith(`${API}/`),
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.slice(API.length);
      const method = request.method();
      const rawBody = request.postData();
      const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : null;
      scenario.calls.push({ method, path, search: url.searchParams, body, rawBody });

      const active = scenario.versions.find((candidate) => candidate.state === "active") ?? null;
      let match: RegExpMatchArray | null;

      if (method === "GET" && path === "/items") {
        const versionId = url.searchParams.get("version_id") ?? active?.client_id ?? "";
        return route.fulfill(envelope({
          stock_report_items: rowsOf(versionId),
          stock_report_items_pagination: { has_more: false, limit: 20, offset: 0 },
        }));
      }
      if (method === "GET" && /^\/items\/[^/]+\/assignments$/.test(path)) {
        return route.fulfill(envelope({ stock_task_assignments: [] }));
      }
      if (method === "PATCH" && (match = path.match(/^(?:\/snapshots\/versions\/([^/]+))?\/items\/([^/]+)\/(missing-quantity|requested-quantity)$/))) {
        const [, versionId = active?.client_id ?? "", itemId, action] = match;
        const base = rowsOf(versionId).find((candidate) => candidate.client_id === itemId)!;
        const snapshot =
          action === "requested-quantity"
            ? body?.quantity_requested === null
              ? { quantity_requested_source: "scanner" }
              : { quantity_requested: body?.quantity_requested, quantity_requested_source: "manual" }
            : body?.quantity_missing === null
              ? { quantity_missing: base.snapshot.active_quantity_missing ?? 0, quantity_missing_source: "active" }
              : { quantity_missing: body?.quantity_missing, quantity_missing_source: "own" };
        return route.fulfill(envelope({ stock_report_item: { ...base, snapshot: { ...base.snapshot, ...snapshot } } }));
      }
      if (method === "GET" && path === "/snapshots/missing-summary") {
        return route.fulfill(envelope({
          quantity_missing_total: scenario.missingTotal,
          items_with_missing: scenario.missingTotal > 0 ? 1 : 0,
        }));
      }
      if (method === "GET" && path === "/snapshots/versions/active") {
        return route.fulfill(envelope({ stock_report_snapshot_version: active }));
      }
      if (method === "GET" && path === "/snapshots/versions/draft-count") {
        return route.fulfill(envelope({ draft_count: scenario.versions.filter((candidate) => candidate.state === "draft").length }));
      }
      if (path === "/snapshots/versions") {
        if (method === "POST") {
          // v9 §5.8: the created row; command responses carry no `progress`,
          // and the client's row schema strips what it does not read.
          const created = version("srv_new", {
            createdAt: new Date(),
            state: body?.draft ? "draft" : "active",
            title: (body?.title as string | null) ?? null,
            active_at: body?.draft ? null : utc(new Date()),
            scheduled_activation_at: body?.scheduled_activation_at ? utc(body.scheduled_activation_at as string) : null,
          });
          scenario.versions.push(created);
          return route.fulfill(envelope({ stock_report_snapshot_version: commandRow(created) }));
        }
        // v10 §5.9: a comma list of states; drafts first, then newest first.
        const states = url.searchParams.get("state")?.split(",") ?? [];
        const listed = scenario.versions
          .filter((candidate) => states.length === 0 || states.includes(candidate.state))
          .sort((a, b) => Number(b.state === "draft") - Number(a.state === "draft") || b.created_at.localeCompare(a.created_at));
        return route.fulfill(envelope({
          stock_report_snapshot_versions: listed,
          stock_report_snapshot_versions_pagination: { has_more: false, limit: 20, offset: 0 },
        }));
      }
      if ((match = path.match(/^\/snapshots\/versions\/([^/]+)(?:\/(activate|refresh-requested))?$/))) {
        const [, versionId, command] = match;
        const target = find(versionId);
        if (!target) return route.fulfill(versionNotFound());
        if (method === "GET" && !command) return route.fulfill(envelope({ stock_report_snapshot_version: target }));
        if (method === "PATCH" && !command) {
          if (body && "title" in body) target.title = body.title as string | null;
          // Stored and echoed in UTC whatever offset was sent — the form must still see "unchanged" (R1).
          if (body && "scheduled_activation_at" in body) {
            target.scheduled_activation_at = body.scheduled_activation_at ? utc(body.scheduled_activation_at as string) : null;
          }
          if (body && "scheduled_activation_keeps_active_missing" in body) {
            target.scheduled_activation_keeps_active_missing = body.scheduled_activation_keeps_active_missing as boolean;
          }
          return route.fulfill(envelope({ stock_report_snapshot_version: commandRow(target) }));
        }
        if (method === "DELETE" && !command) {
          scenario.versions = scenario.versions.filter((candidate) => candidate !== target);
          return route.fulfill(envelope({ client_id: versionId }));
        }
        if (method === "POST" && command === "activate") {
          if (active) Object.assign(active, { state: "closed", closed_at: utc(new Date()) });
          Object.assign(target, { state: "active", active_at: utc(new Date()), scheduled_activation_at: null });
          return route.fulfill(envelope({ stock_report_snapshot_version: commandRow(target) }));
        }
        if (method === "POST" && command === "refresh-requested") {
          return route.fulfill(envelope({ stock_report_snapshot_version: commandRow(target), changed: 1, added: 0 }));
        }
      }
      return route.fallback();
    },
  );
  return scenario;
}

async function openHub(page: Page): Promise<void> {
  await press(page, page.getByTestId("tab-more"));
  await press(page, page.getByTestId("more-tab-stock needs"));
  await expect(page.getByTestId("stock-report-hub")).toBeVisible();
}

async function openDraftBoard(page: Page): Promise<void> {
  await openHub(page);
  await press(page, page.getByTestId("stock-report-hub-open-drafts"));
  await expect(page.getByTestId("stock-report-drafts")).toBeVisible();
  await press(page, page.getByTestId("stock-draft-card-srv_draft"));
  await expect(page.getByTestId("stock-report-draft-board-page")).toBeVisible();
}

async function openDraftActions(page: Page): Promise<void> {
  await openDraftBoard(page);
  await press(page, page.getByTestId("stock-report-draft-board-menu"));
  await expect(page.getByTestId("stock-report-version-actions")).toBeVisible();
}

async function openActiveBoard(page: Page): Promise<void> {
  await openHub(page);
  await press(page, page.getByTestId("stock-report-hub-open-board"));
  await expect(page.getByTestId("stock-report-board-page")).toBeVisible();
}

test.describe("Stock report — manager hub", () => {
  test.beforeEach(async () => {
    test.skip(!hasCredentials, "Set Playwright credentials to run app coverage.");
  });

  test("shows the active version under its title, the drafts count, and hides the missing row at zero", async ({ auth, page }) => {
    await mockStockReport(page);
    const activeVersionRequest = page.waitForRequest((request) =>
      new URL(request.url()).pathname.endsWith(`${API}/snapshots/versions/active`),
    );
    await auth.signIn();
    await openHub(page);

    // The hub's progress sums the three prioritised groups; omitted, the
    // backend would count the null-priority snapshots instead.
    expect(new URL((await activeVersionRequest).url()).searchParams.get("priority")).toBe("high,medium,low");
    // OC-18: the title heads the card in place of "Current version".
    await expect(page.getByTestId("stock-version-title")).toHaveText("Spring board");
    await expect(page.getByTestId("stock-version-age")).toContainText("2 days running");
    await expect(page.getByTestId("stock-version-progress-high-count")).toHaveText("2/5");
    await expect(page.getByTestId("stock-report-hub-open-missing")).toHaveCount(0);
    await expect(page.getByTestId("stock-report-hub-open-drafts")).toHaveText("Drafts (1)");
    await expect(page.getByTestId("stock-report-hub-open-history")).toBeVisible();
    await expect(page.getByTestId("stock-report-hub-create-version")).toHaveText("New Draft");

    // The card is the way into the board, which opens as a slide page whose
    // back row scrolls with it.
    await press(page, page.getByTestId("stock-report-hub-open-board"));
    await expect(page.getByTestId("stock-report-board-page")).toBeVisible();
    await expect(page.getByTestId("stock-report-board-back")).toBeVisible();
    await expect(page.getByTestId("stock-report-fab")).toBeVisible();
  });

  test("opens the missing list on All with the missing filter on the wire", async ({ auth, page }) => {
    const scenario = await mockStockReport(page, { missingTotal: 7 });
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
        scenario.calls.some(
          (call) => call.path === "/items" && call.search.get("missing_only") === "true" && call.search.get("priority") === "all",
        ),
      )
      .toBe(true);
  });

  test("creates a draft in one tap under today's placeholder title, and opens its board", async ({ auth, page }) => {
    const scenario = await mockStockReport(page);
    await auth.signIn();
    await openHub(page);

    // Owner, 2026-09-28: no form, no confirmation — the tap sends the create.
    await press(page, page.getByTestId("stock-report-hub-create-version"));
    await expect.poll(() => scenario.last("POST", "/snapshots/versions")?.body).toBeTruthy();
    const body = scenario.last("POST", "/snapshots/versions")!.body as Record<string, unknown>;
    // A draft, no schedule keys, titled with the day ("Mon, 28th September").
    expect(Object.keys(body).sort()).toEqual(["draft", "title"]);
    expect(body.draft).toBe(true);
    expect(body.title).toMatch(/^[A-Z][a-z]{2}, \d{1,2}(st|nd|rd|th) [A-Z][a-z]+( \d{4})?$/);

    // The new draft's own board opens, reading its rows by version id.
    await expect(page.getByTestId("stock-report-draft-board-page")).toBeVisible();
    await expect(page.getByTestId("stock-report-draft-board-back")).toContainText(body.title as string);
    await expect
      .poll(() => scenario.calls.some((call) => call.path === "/items" && call.search.get("version_id") === "srv_new"))
      .toBe(true);
    await expect(page.getByTestId("stock-report-version-form-page")).toHaveCount(0);
  });

  test("lists the version history newest first, live and closed only, each under its title", async ({ auth, page }) => {
    const scenario = await mockStockReport(page);
    await auth.signIn();
    await openHub(page);

    await press(page, page.getByTestId("stock-report-hub-open-history"));

    await expect(page.getByTestId("stock-report-version-history")).toBeVisible();
    const cards = page.getByTestId("stock-version-list").locator("article");
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText("Spring board");
    await expect(cards.first()).toContainText("Active");
    await expect(cards.last()).toContainText("Ran 7 days");
    const listCall = scenario.calls.find((call) => call.method === "GET" && call.path === "/snapshots/versions");
    expect(listCall?.search.get("state")).toBe("active,closed");
  });
});

test.describe("Stock report — draft versions", () => {
  test.beforeEach(async () => {
    test.skip(!hasCredentials, "Set Playwright credentials to run app coverage.");
  });

  test("opens a draft's own board: its rows by version id, and its ⋮", async ({ auth, page }) => {
    const scenario = await mockStockReport(page);
    await auth.signIn();
    await openDraftBoard(page);

    await expect
      .poll(() => scenario.calls.some((call) => call.path === "/items" && call.search.get("version_id") === "srv_draft"))
      .toBe(true);
    await expect(page.getByTestId("stock-report-draft-board-menu")).toBeVisible();
    await expect(page.getByTestId("stock-need-card-sri_1")).toBeVisible();
  });

  test("schedules a draft from Edit, and stores the keep choice made on the activation sheet", async ({ auth, page }) => {
    const scenario = await mockStockReport(page);
    await auth.signIn();
    await openDraftActions(page);

    await press(page, page.getByTestId("stock-report-version-edit"));
    await expect(page.getByTestId("stock-report-version-form-page")).toBeVisible();
    await expect(page.getByTestId("stock-version-form-title")).toHaveValue("Autumn restock");

    // Next month's 15th is always in the future and always one page away.
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    const isoDay = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-15`;
    await press(page, page.getByTestId("stock-version-form-schedule"));
    await expect(page.getByTestId("stock-report-schedule-sheet")).toBeVisible();
    await press(page, page.getByRole("button", { name: "Go to the Next Month" }));
    await press(page, page.locator(`[data-day="${isoDay}"] button`));
    // A tap only picks; Confirm applies it and closes the sheet.
    await expect(page.getByTestId("stock-report-schedule-sheet")).toBeVisible();
    await press(page, page.getByTestId("stock-report-schedule-confirm"));
    await expect(page.getByTestId("stock-report-schedule-sheet")).toHaveCount(0);

    await press(page, page.getByTestId("stock-version-form-submit"));
    // OC-16: a scheduled draft asks what its activation does with missing counts.
    await expect(page.getByTestId("stock-report-activate-note")).toContainText("when it activates");
    await press(page, page.getByTestId("stock-keep-missing-reset"));
    await press(page, page.getByTestId("stock-keep-missing-keep"));
    await expect(page.getByTestId("stock-report-activate-confirm")).toHaveText("Schedule activation");
    await press(page, page.getByTestId("stock-report-activate-confirm"));

    await expect.poll(() => scenario.last("PATCH", "/snapshots/versions/srv_draft")?.body).toBeTruthy();
    const body = scenario.last("PATCH", "/snapshots/versions/srv_draft")!.body as Record<string, unknown>;
    // The §5.19 diff: the untouched title is not sent.
    expect(Object.keys(body).sort()).toEqual(["scheduled_activation_at", "scheduled_activation_keeps_active_missing"]);
    expect(body.scheduled_activation_keeps_active_missing).toBe(true);
    // The tapped day at 06:00 where the user stands (OC-1) — read back in the browser's own zone.
    const local = await page.evaluate((iso) => {
      const date = new Date(iso);
      return [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()];
    }, body.scheduled_activation_at as string);
    expect(local).toEqual([target.getFullYear(), target.getMonth(), 15, 6, 0]);
    await expect(page.getByTestId("stock-report-version-form-page")).toHaveCount(0);
  });

  test("activates a draft now with Start at 0 on one tap, and closes its board", async ({ auth, page }) => {
    const scenario = await mockStockReport(page);
    await auth.signIn();
    await openDraftActions(page);

    await press(page, page.getByTestId("stock-report-version-activate"));
    await expect(page.getByTestId("stock-report-activate-title")).toContainText("Activate Autumn restock");
    // v9 §5.17: pre-filled from the draft's stored choice.
    await expect(page.getByTestId("stock-keep-missing-keep")).toHaveAttribute("aria-pressed", "true");
    await press(page, page.getByTestId("stock-keep-missing-reset"));

    const confirm = page.getByTestId("stock-report-activate-confirm");
    await expect(confirm).toHaveText("Activate now");
    await press(page, confirm);

    await expect.poll(() => scenario.last("POST", "/snapshots/versions/srv_draft/activate")?.body).toEqual({ keep_active_missing: false });
    // Manual activation never writes the stored flag.
    expect(scenario.last("PATCH", "/snapshots/versions/srv_draft")).toBeUndefined();
    // §C.4: the draft is live, so its draft board closes itself.
    await expect(page.getByTestId("stock-report-draft-board-page")).toHaveCount(0);
  });

  test("deletes a draft behind a second tap, and closes its board", async ({ auth, page }) => {
    const scenario = await mockStockReport(page);
    await auth.signIn();
    await openDraftActions(page);

    const remove = page.getByTestId("stock-report-version-delete");
    await press(page, remove);
    await expect(remove).toContainText("Tap again to delete");
    expect(scenario.last("DELETE", "/snapshots/versions/srv_draft")).toBeUndefined();
    await press(page, remove);

    await expect.poll(() => scenario.last("DELETE", "/snapshots/versions/srv_draft")).toBeTruthy();
    await expect(page.getByTestId("stock-report-draft-board-page")).toHaveCount(0);
  });

  test("lets a draft row follow the live version's missing count again", async ({ auth, page }) => {
    const scenario = await mockStockReport(page);
    await auth.signIn();
    await openDraftBoard(page);

    await press(page, page.getByTestId("stock-need-card-body-sri_1"));
    await expect(page.getByTestId("stock-report-detail")).toBeVisible();
    await press(page, page.getByTestId("stock-report-detail-menu-button"));
    await press(page, page.getByTestId("stock-report-follow-live"));

    // v9 §5.16: `null` on the versioned route drops the draft's own number.
    await expect
      .poll(() => scenario.last("PATCH", "/snapshots/versions/srv_draft/items/sri_1/missing-quantity")?.body)
      .toEqual({ quantity_missing: null });
  });
});

test.describe("Stock report — live version", () => {
  test.beforeEach(async () => {
    test.skip(!hasCredentials, "Set Playwright credentials to run app coverage.");
  });

  test("types a requested quantity on the live board through the version's route", async ({ auth, page }) => {
    const scenario = await mockStockReport(page);
    await auth.signIn();
    await openActiveBoard(page);

    await press(page, page.getByTestId("stock-need-card-body-sri_1"));
    await expect(page.getByTestId("stock-report-detail")).toBeVisible();
    await press(page, page.getByTestId("stock-report-detail-menu-button"));
    await press(page, page.getByTestId("stock-report-set-requested"));

    await expect(page.getByTestId("stock-report-requested-source")).toHaveText("from Scanner: 5");
    await page.getByTestId("stock-report-requested-input").fill("7");
    await press(page, page.getByTestId("stock-report-requested-save"));

    // v8 §5.22: no active shortcut — the board names its version by the row's snapshot.
    await expect
      .poll(() => scenario.last("PATCH", "/snapshots/versions/srv_1/items/sri_1/requested-quantity")?.body)
      .toEqual({ quantity_requested: 7 });
  });

  test("refreshes the live version from Scanner keeping typed values, with no body", async ({ auth, page }) => {
    const scenario = await mockStockReport(page);
    await auth.signIn();
    await openActiveBoard(page);

    await press(page, page.getByTestId("stock-report-board-menu"));
    await expect(page.getByTestId("stock-report-version-actions")).toBeVisible();
    // A live version offers no Activate or Delete.
    await expect(page.getByTestId("stock-report-version-activate")).toHaveCount(0);
    await expect(page.getByTestId("stock-report-version-delete")).toHaveCount(0);
    await press(page, page.getByTestId("stock-report-version-refresh"));
    await expect(page.getByTestId("stock-report-refresh-note")).toBeVisible();
    await press(page, page.getByTestId("stock-report-refresh-keep"));

    await expect.poll(() => scenario.last("POST", "/snapshots/versions/srv_1/refresh-requested")).toBeTruthy();
    // v8 §5.18: keeping typed values is the backend default, sent as no body at all.
    expect(scenario.last("POST", "/snapshots/versions/srv_1/refresh-requested")?.rawBody ?? null).toBeNull();
    await expect(page.getByTestId("stock-report-refresh-sheet")).toHaveCount(0);
  });
});
