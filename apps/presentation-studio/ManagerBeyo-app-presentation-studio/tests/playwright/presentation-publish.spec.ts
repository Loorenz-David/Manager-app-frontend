import { expect, test, type Page, type Route } from "@playwright/test";

const ids = {
  user: "usr_publish_manager",
  workspace: "wsp_publish_workspace",
  workspaceRole: "wrl_publish_manager",
  v1: "aup_publish_v1",
  v2: "aup_publish_v2",
  slide1: "aups_publish_1",
  slide2: "aups_publish_2",
};

function encodeBase64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function token(): string {
  const now = Math.floor(Date.now() / 1_000);
  return `${encodeBase64Url({ alg: "none", typ: "JWT" })}.${encodeBase64Url({
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
    jti: "jti-presentation-publish",
    iat: now,
    exp: now + 3_600,
  })}.`;
}

async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function element(id: string, text: string) {
  return {
    client_id: id,
    element_type: "text" as const,
    sequence_order: 0,
    layer_index: 10,
    start_ms: 0,
    end_ms: null,
    media: null,
    text_content: text,
    layout: { x: 0.5, y: 0.5, width: 0.7, height: 0.15, anchor: "center" as const },
    style: { text_role: "headline" as const, text_align: "center" as const, font_size: 44, font_weight: 700 as const },
    enter_animation: { type: "fade" as const, duration_ms: 100 },
    exit_animation: { type: "none" as const },
  };
}

function slide(clientId: string, sequenceOrder: number, text: string) {
  return {
    client_id: clientId,
    sequence_order: sequenceOrder,
    title: null,
    description: null,
    layout_type: "text_overlay" as const,
    playback_mode: "timed" as const,
    duration_ms: 600,
    composition_schema_version: 1,
    media: [],
    action: null,
    elements: [element(`aupe_${clientId}`, text)],
  };
}

function draftV1() {
  return {
    client_id: ids.v1,
    logical_client_id: ids.v1,
    version: 1,
    workspace_id: ids.workspace,
    title: "Publish lifecycle",
    summary: null,
    status: "draft" as "draft" | "published" | "archived",
    presentation_type: "slide_page" as const,
    category: "improvement" as const,
    audience_mode: "all_matching" as const,
    display_priority: 100,
    is_dismissible: true,
    starts_at: null,
    expires_at: null,
    published_at: null as string | null,
    archived_at: null as string | null,
    created_at: "2026-07-22T09:00:00+00:00",
    created_by_id: ids.user,
    updated_at: "2026-07-22T10:00:00+00:00",
    slides: [slide(ids.slide1, 1, "First slide"), slide(ids.slide2, 2, "Second slide")],
    audience: {
      audience_mode: "all_matching" as const,
      app_keys: [] as string[],
      role_keys: [] as string[],
      workspace_ids: [] as string[],
      user_ids: [] as string[],
    },
  };
}

type Deck = ReturnType<typeof draftV1>;

function listItem(deck: Deck) {
  const { slides, audience: _audience, ...metadata } = deck;
  return { ...metadata, slide_count: slides.length, media_kinds: [], cover_url: null };
}

async function installApi(page: Page) {
  let signedIn = false;
  let v1 = draftV1();
  let v2: Deck | null = null;
  let audienceBody: Record<string, unknown> | null = null;

  await page.route("**/api/v1/auth/refresh**", async (route) => {
    if (!signedIn) return json(route, 401, { detail: "No active session." });
    return json(route, 200, { ok: true, data: { access_token: token() }, warnings: [] });
  });
  await page.route("**/api/v1/auth/sign-in", async (route) => {
    signedIn = true;
    return json(route, 200, {
      ok: true,
      data: {
        access_token: token(),
        user: { client_id: ids.user, user_id: ids.user, email: "manager@example.com", username: "Marta Karlsson", role: "manager", role_name: "manager", backend_permissions: [], ui: { apps: ["manager"], pages: [], buttons: [], actions: [], query_filters: [] } },
        workspace_id: ids.workspace,
      },
      warnings: [],
    });
  });
  await page.route("**/api/v1/users/me", (route) => json(route, 200, { ok: true, data: { user: { client_id: ids.user, email: "manager@example.com", username: "Marta Karlsson" } }, warnings: [] }));
  await page.route("**/api/v1/users?**", (route) => json(route, 200, {
    ok: true,
    data: {
      users: [{ client_id: ids.user, username: "Marta Karlsson", profile_picture: null, role: { client_id: ids.workspaceRole, name: "manager" } }],
      users_pagination: { has_more: false, total: 1, limit: 50, offset: 0 },
    },
    warnings: [],
  }));

  await page.route("**/api/v1/app-update-presentations**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const deck = path.includes(ids.v2) ? v2 : v1;

    if (method === "GET" && path.endsWith("/app-update-presentations")) {
      const items = [listItem(v1), ...(v2 ? [listItem(v2)] : [])];
      return json(route, 200, { ok: true, data: { app_update_presentations_pagination: { items, has_more: false, limit: 200, offset: 0 } }, warnings: [] });
    }
    if (!deck) return json(route, 404, { ok: false, error: "Not found" });
    if (method === "GET" && path.endsWith("/preview")) {
      return json(route, 200, { ok: true, data: { presentation: { ...deck, view_state: { status: "unseen", last_slide_index: 0 } } }, warnings: [] });
    }
    if (method === "GET" && (path.endsWith(ids.v1) || path.endsWith(ids.v2))) {
      return json(route, 200, { ok: true, data: { presentation: deck }, warnings: [] });
    }
    if (method === "PUT" && path.endsWith("/composition")) {
      const body = request.postDataJSON() as { duration_ms: number; elements: Array<Record<string, unknown>> };
      const slideId = path.includes(ids.slide2) ? ids.slide2 : ids.slide1;
      const elements = body.elements.map((item, index) => ({
        client_id: `aupe_saved_${index}`,
        element_type: item.element_type,
        sequence_order: index,
        layer_index: item.layer_index ?? 0,
        start_ms: item.start_ms ?? 0,
        end_ms: item.end_ms ?? null,
        media: null,
        text_content: item.text_content ?? null,
        layout: item.layout ?? null,
        style: item.style ?? null,
        enter_animation: item.enter_animation ?? null,
        exit_animation: item.exit_animation ?? null,
      }));
      v1 = { ...v1, slides: v1.slides.map((item) => item.client_id === slideId ? { ...item, duration_ms: body.duration_ms, elements: elements as typeof item.elements } : item) };
      return json(route, 200, { ok: true, data: { presentation: v1 }, warnings: [] });
    }
    if (method === "PUT" && path.endsWith("/audience")) {
      audienceBody = request.postDataJSON() as Record<string, unknown>;
      v1 = { ...v1, audience_mode: audienceBody.audience_mode as "all_matching", audience: audienceBody as Deck["audience"] };
      return json(route, 200, { ok: true, data: { presentation: v1 }, warnings: [] });
    }
    if (method === "PATCH" && path.endsWith(ids.v1)) {
      v1 = { ...v1, ...(request.postDataJSON() as Partial<Deck>) };
      return json(route, 200, { ok: true, data: { presentation: v1 }, warnings: [] });
    }
    if (method === "POST" && path.endsWith("/publish")) {
      v1 = { ...v1, status: "published", published_at: "2026-07-22T20:00:00+00:00" };
      return json(route, 200, { ok: true, data: { presentation: v1 }, warnings: [] });
    }
    if (method === "POST" && path.endsWith("/new-version")) {
      v2 = { ...v1, client_id: ids.v2, version: 2, status: "draft", published_at: null, archived_at: null };
      return json(route, 200, { ok: true, data: { presentation: v2 }, warnings: [] });
    }
    if (method === "POST" && path.endsWith("/archive")) {
      v1 = { ...v1, status: "archived", archived_at: "2026-07-22T21:00:00+00:00" };
      return json(route, 200, { ok: true, data: { presentation: v1 }, warnings: [] });
    }
    return json(route, 404, { ok: false, error: `Unhandled ${method} ${path}` });
  });

  return { audience: () => audienceBody };
}

test("presentation-publish full preview, publish, version, and archive lifecycle", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const api = await installApi(page);

  await page.goto(`/editor/${ids.v1}`);
  await page.locator('input[type="email"]').fill("manager@example.com");
  await page.locator('input[type="password"]').fill("studio-test-password");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByTestId(`presentation-editor-slide-card-${ids.slide2}`)).toBeVisible();
  await page.getByTestId("presentation-editor-preview-button").click();
  await expect(page.getByTestId("presentation-preview-overlay")).toBeVisible();
  await expect(page.getByTestId("presentation-preview-dot-1")).toHaveClass(/w-\[18px\]/, { timeout: 2_000 });
  await expect(page.getByTestId("presentation-preview-play-button")).toHaveAttribute("aria-label", "Play", { timeout: 2_000 });
  await expect(page.getByTestId("presentation-preview-progress")).toHaveAttribute("style", /100%/);
  await page.getByTestId("presentation-preview-exit-button").click();

  await page.getByTestId("presentation-editor-publish-button").click();
  await page.getByTestId("presentation-publish-roles-manager").click();
  await page.getByTestId("presentation-publish-confirm-button").click();
  await expect(page.getByTestId("presentation-editor-read-only-banner")).toContainText("Published — read-only · v1");
  expect(api.audience()).toMatchObject({ audience_mode: "all_matching", role_keys: ["manager"], workspace_ids: [] });

  await page.getByTestId("presentation-editor-back-button").click();
  await expect(page.getByTestId(`presentation-announcement-card-${ids.v1}`)).toContainText("Published");
  await page.getByTestId(`presentation-announcement-card-${ids.v1}`).click();
  await expect(page.getByTestId("presentation-editor-title-input")).toHaveCount(0);
  await page.getByTestId("presentation-editor-edit-as-new-version-button").click();
  await expect(page).toHaveURL(new RegExp(`/editor/${ids.v2}$`));
  await expect(page.getByTestId("presentation-editor-title-input")).toBeEditable();
  await expect(page.getByTestId("presentation-editor-top-bar")).toContainText("Draft");

  await page.goto(`/editor/${ids.v1}`);
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByTestId("presentation-editor-archive-button").click();
  await expect(page.getByTestId("presentation-editor-read-only-banner")).toContainText("Archived — read-only · v1");
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
