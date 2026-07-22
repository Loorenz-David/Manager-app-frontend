import { expect, test, type Page, type Route } from "@playwright/test";

const ids = {
  user: "usr_01J00000000000000000000000",
  workspace: "wsp_01J00000000000000000000000",
  workspaceRole: "wrl_01J00000000000000000000000",
};

type ListItem = {
  client_id: string;
  logical_client_id: string;
  version: number;
  workspace_id: string;
  title: string;
  summary: string | null;
  status: "draft" | "published" | "archived";
  presentation_type: "slide_page";
  category: "improvement";
  audience_mode: "all_matching";
  display_priority: number;
  is_dismissible: boolean;
  starts_at: string | null;
  expires_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  created_by_id: string;
  updated_at: string | null;
  slide_count: number;
  media_kinds: ("image" | "video")[];
  cover_url: string | null;
};

const baseItem: ListItem = {
  client_id: "aup_base",
  logical_client_id: "aup_base",
  version: 1,
  workspace_id: ids.workspace,
  title: "Base announcement",
  summary: null,
  status: "draft",
  presentation_type: "slide_page",
  category: "improvement",
  audience_mode: "all_matching",
  display_priority: 100,
  is_dismissible: true,
  starts_at: null,
  expires_at: null,
  published_at: null,
  archived_at: null,
  created_at: "2026-07-20T10:00:00+00:00",
  created_by_id: ids.user,
  updated_at: "2026-07-21T18:00:00+00:00",
  slide_count: 1,
  media_kinds: [],
  cover_url: null,
};

const items: ListItem[] = [
  {
    ...baseItem,
    client_id: "aup_product_v1",
    logical_client_id: "aup_product",
    title: "Old product update",
    status: "published",
    published_at: "2026-07-19T10:00:00+00:00",
  },
  {
    ...baseItem,
    client_id: "aup_product_v2",
    logical_client_id: "aup_product",
    version: 2,
    title: "Q3 Product Update",
    status: "published",
    published_at: "2026-07-21T18:00:00+00:00",
    slide_count: 3,
    media_kinds: ["image", "video"],
  },
  {
    ...baseItem,
    client_id: "aup_summer",
    logical_client_id: "aup_summer",
    title: "Summer office hours",
    status: "draft",
    slide_count: 2,
    media_kinds: ["image"],
  },
  {
    ...baseItem,
    client_id: "aup_security",
    logical_client_id: "aup_security",
    title: "New security policy",
    status: "published",
    starts_at: "2099-07-25T08:00:00+00:00",
    published_at: "2026-07-22T10:00:00+00:00",
    slide_count: 3,
    media_kinds: ["image", "video"],
  },
  {
    ...baseItem,
    client_id: "aup_archived",
    logical_client_id: "aup_archived",
    title: "Old workflow reminder",
    status: "archived",
    archived_at: "2026-07-02T10:00:00+00:00",
    slide_count: 2,
  },
];

function encodeBase64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createAccessToken(): string {
  const now = Math.floor(Date.now() / 1_000);
  const payload = {
    sub: ids.user,
    user_id: ids.user,
    email: "manager@example.com",
    username: "Marta Karlsson",
    workspace_id: ids.workspace,
    role_name: "manager",
    workspace_role_id: ids.workspaceRole,
    workspace_role_name: "manager",
    app_scope: "manager",
    time_zone: "Europe/Stockholm",
    backend_permissions: [],
    ui: { apps: ["manager"], pages: [], buttons: [], actions: [], query_filters: [] },
    jti: "jti-dashboard-manager",
    iat: now,
    exp: now + 3_600,
  };
  return `${encodeBase64Url({ alg: "none", typ: "JWT" })}.${encodeBase64Url(payload)}.`;
}

async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installApi(page: Page): Promise<void> {
  let signedIn = false;

  await page.route("**/api/v1/auth/refresh**", async (route) => {
    if (!signedIn) {
      await json(route, 401, { detail: "No active session." });
      return;
    }
    await json(route, 200, {
      ok: true,
      data: { access_token: createAccessToken() },
      warnings: [],
    });
  });

  await page.route("**/api/v1/auth/sign-in", async (route) => {
    expect((route.request().postDataJSON() as { app_scope?: string }).app_scope).toBe("manager");
    signedIn = true;
    await json(route, 200, {
      ok: true,
      data: {
        access_token: createAccessToken(),
        user: {
          client_id: ids.user,
          user_id: ids.user,
          email: "manager@example.com",
          username: "Marta Karlsson",
          role: "manager",
          role_name: "manager",
          backend_permissions: [],
          ui: { apps: ["manager"], pages: [], buttons: [], actions: [], query_filters: [] },
        },
        workspace_id: ids.workspace,
      },
      warnings: [],
    });
  });

  await page.route("**/api/v1/users/me", async (route) => {
    await json(route, 200, {
      ok: true,
      data: {
        user: {
          client_id: ids.user,
          email: "manager@example.com",
          username: "Marta Karlsson",
        },
      },
      warnings: [],
    });
  });

  await page.route("**/api/v1/app-update-presentations**", async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      expect(request.postDataJSON()).toEqual({ title: "Untitled announcement" });
      await json(route, 200, {
        ok: true,
        data: {
          presentation: {
            ...baseItem,
            client_id: "aup_created",
            logical_client_id: "aup_created",
            title: "Untitled announcement",
            slide_count: undefined,
            media_kinds: undefined,
            cover_url: undefined,
            slides: [],
            audience: {
              audience_mode: "all_matching",
              app_keys: [],
              role_keys: [],
              workspace_ids: [],
              user_ids: [],
            },
          },
        },
        warnings: [],
      });
      return;
    }

    const url = new URL(request.url());
    expect(url.searchParams.get("limit")).toBe("200");
    const status = url.searchParams.get("status");
    const query = url.searchParams.get("q")?.toLowerCase() ?? "";
    const filtered = items.filter(
      (item) =>
        (status === null || item.status === status) &&
        (query === "" || item.title.toLowerCase().includes(query)),
    );
    await json(route, 200, {
      ok: true,
      data: {
        app_update_presentations_pagination: {
          items: filtered,
          has_more: false,
          limit: 200,
          offset: 0,
        },
      },
      warnings: [],
    });
  });
}

test("presentation-dashboard supports grouping, filters, search, and create navigation", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    ) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await installApi(page);

  await page.goto("/");
  await page.locator('input[type="email"]').fill("manager@example.com");
  await page.locator('input[type="password"]').fill("studio-test-password");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Q3 Product Update")).toBeVisible();
  await expect(page.getByText("Old product update")).toHaveCount(0);
  await expect(page.getByText("Summer office hours")).toBeVisible();

  await page.getByTestId("presentation-dashboard-filter-chip-published").click();
  await expect(page.getByText("Q3 Product Update")).toBeVisible();
  await expect(page.getByText("New security policy")).toHaveCount(0);

  await page.getByTestId("presentation-dashboard-filter-chip-scheduled").click();
  await expect(page.getByText("New security policy")).toBeVisible();
  await expect(page.getByText("Q3 Product Update")).toHaveCount(0);

  await page.getByTestId("presentation-dashboard-filter-chip-all").click();
  await page.getByTestId("presentation-dashboard-search-input").fill("summer");
  await expect(page.getByText("Summer office hours")).toBeVisible();
  await expect(page.getByText("Q3 Product Update")).toHaveCount(0);

  await page.getByTestId("presentation-dashboard-search-input").fill("");
  await expect(page.getByText("Q3 Product Update")).toBeVisible();
  await page.getByTestId("presentation-dashboard-new-announcement-button").click();
  await expect(page).toHaveURL(/\/editor\/aup_created$/);
  await expect(page.getByTestId("editor-placeholder")).toBeAttached();

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
