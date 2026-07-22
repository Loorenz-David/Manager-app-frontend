import type { Page, Route } from "@playwright/test";

import { expect, test } from "../../fixtures/app-fixture";

type PresentationType = "modal" | "full_screen" | "slide_page";
type MockPresentation = ReturnType<typeof presentation>;

function createAccessToken(): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    user_id: "usr_worker_presentations",
    username: "Worker",
    workspace_id: "ws_presentations",
    workspace_name: "Presentation Workspace",
    workspace_role_id: "wrole_worker_presentations",
    role_name: "worker",
    workspace_role_name: "worker",
    workspace_specialization: null,
    app_scope: "worker",
    time_zone: "Europe/Stockholm",
    backend_permissions: [],
    ui: {
      apps: ["worker"],
      pages: ["cases", "tasks", "home", "stats", "settings"],
      buttons: [],
      actions: [],
      query_filters: [],
    },
    jti: "jti_worker_presentations",
    exp: 4_102_444_800,
  })}.signature`;
}

function presentation(
  suffix: string,
  presentationType: PresentationType,
  isDismissible: boolean,
  action: { label: string; route: string } | null = null,
) {
  return {
    client_id: `aup_worker_${suffix}`,
    logical_client_id: `aup_worker_${suffix}`,
    version: 1,
    title: `Worker ${suffix}`,
    summary: null,
    presentation_type: presentationType,
    category: "announcement",
    is_dismissible: isDismissible,
    display_priority: 100,
    published_at: "2026-07-22T20:00:00Z",
    starts_at: null,
    expires_at: null,
    slides: [
      {
        client_id: `aups_worker_${suffix}`,
        sequence_order: 1,
        title: `Worker ${suffix}`,
        description: null,
        layout_type: "freeform",
        playback_mode: "manual",
        duration_ms: null,
        composition_schema_version: 1,
        media: [],
        action,
        elements: [],
      },
    ],
    view_state: { status: "unseen", last_slide_index: 0 },
  } as const;
}

async function installMockAuth(page: Page): Promise<void> {
  const accessToken = createAccessToken();
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, warnings: [], data: {} }),
    }),
  );
  await page.route("**/api/v1/auth/refresh**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: { access_token: accessToken },
      }),
    }),
  );
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          user: {
            client_id: "usr_worker_presentations",
            email: "worker-presentations@example.com",
            username: "Worker",
          },
        },
      }),
    }),
  );
}

async function fulfillJson(route: Route, data: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

test("presentation-player defers off-home and completes the worker flow", async ({
  page,
}) => {
  const queue: MockPresentation[] = [
    presentation("modal", "modal", true),
    presentation("full_screen", "full_screen", false),
    presentation("slide_page", "slide_page", true, {
      label: "Open settings",
      route: "/settings",
    }),
  ];
  const terminalActions: Array<{ id: string; action: string }> = [];
  let queueIndex = 0;
  let activeRequestCount = 0;

  await installMockAuth(page);
  await page.route("**/api/v1/app-update-presentations/active?*", async (route) => {
    expect(new URL(route.request().url()).searchParams.get("app_key")).toBe(
      "worker",
    );
    activeRequestCount += 1;
    await fulfillJson(route, {
      ok: true,
      warnings: [],
      data: { presentation: queue[queueIndex] ?? null },
    });
  });
  await page.route(
    "**/api/v1/app-update-presentations/*/view-state",
    async (route) => {
      const body = route.request().postDataJSON() as {
        action: string;
        last_slide_index?: number;
      };
      const id = route.request().url().split("/").at(-2) ?? "";
      if (body.action === "dismissed" || body.action === "completed") {
        terminalActions.push({ id, action: body.action });
        queueIndex += 1;
      }
      await fulfillJson(route, {
        ok: true,
        warnings: [],
        data: {
          view_state: {
            status: body.action,
            last_slide_index: body.last_slide_index ?? 0,
          },
        },
      });
    },
  );

  await page.goto("/tasks");
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect.poll(() => activeRequestCount).toBeGreaterThan(0);
  await expect(page.getByTestId("presentation-player-viewport")).toHaveCount(0);

  await page.getByTestId("tab-home").click();
  await expect(page.getByTestId("presentation-player-modal-frame")).toBeVisible();
  await expect(page.getByTestId("presentation-player-dismiss-button")).toBeVisible();
  await page.getByTestId("presentation-player-dismiss-button").click();

  await expect(page.getByTestId("presentation-player-full-screen-frame")).toBeVisible();
  await expect(page.getByTestId("presentation-player-dismiss-button")).toHaveCount(0);
  await page.getByTestId("presentation-player-acknowledge-button").click();

  await expect(page.getByTestId("presentation-player-cta-button")).toHaveText(
    "Open settings",
  );
  await page.getByTestId("presentation-player-cta-button").click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByTestId("presentation-player-tap-next").click();
  await expect(page.getByTestId("presentation-player-viewport")).toHaveCount(0);
  expect(terminalActions).toEqual([
    { id: "aup_worker_modal", action: "dismissed" },
    { id: "aup_worker_full_screen", action: "completed" },
    { id: "aup_worker_slide_page", action: "completed" },
  ]);

  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => activeRequestCount).toBeGreaterThan(3);
  await expect(page.getByTestId("presentation-player-viewport")).toHaveCount(0);

  await page.getByTestId("tab-home").click();
  queue.push(presentation("foreground_home", "modal", false));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("presentation-player-acknowledge-button")).toBeVisible();
  await page.getByTestId("presentation-player-acknowledge-button").click();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("presentation-player-viewport")).toHaveCount(0);
});
