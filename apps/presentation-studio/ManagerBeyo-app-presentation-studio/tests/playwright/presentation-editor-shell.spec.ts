import { expect, test, type Page, type Route } from "@playwright/test";

const ids = {
  user: "usr_01J00000000000000000000000",
  workspace: "wsp_01J00000000000000000000000",
  workspaceRole: "wrl_01J00000000000000000000000",
  presentation: "aup_editor_01",
  firstSlide: "aups_editor_01",
  secondSlide: "aups_editor_02",
};

const API = "**/api/v1/app-update-presentations";

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
    jti: "jti-editor-shell",
    iat: now,
    exp: now + 3_600,
  })}.`;
}

async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function media(clientId: string, sequenceOrder: number) {
  return {
    client_id: clientId,
    sequence_order: sequenceOrder,
    media_type: "image" as const,
    media_url: `https://cdn.example.com/${clientId}.png`,
    poster_url: null,
    fallback_url: null,
    alt_text: null,
    mime_type: "image/png",
    width: 1080,
    height: 1920,
    duration_ms: null,
    is_looping: false,
  };
}

function element(asset: ReturnType<typeof media>, layerIndex: number) {
  return {
    client_id: null,
    element_type: "media" as const,
    sequence_order: layerIndex,
    layer_index: layerIndex,
    start_ms: 0,
    end_ms: null,
    media: asset,
    text_content: null,
    layout: { x: 0, y: 0, width: 1, height: 1, fit: layerIndex === 0 ? "cover" as const : "contain" as const },
    style: null,
    enter_animation: null,
    exit_animation: null,
  };
}

function slide(clientId: string, sequenceOrder: number, assets: ReturnType<typeof media>[]) {
  return {
    client_id: clientId,
    sequence_order: sequenceOrder,
    title: null,
    description: null,
    layout_type: "media_top" as const,
    playback_mode: "timed" as const,
    duration_ms: 8_000,
    composition_schema_version: 1,
    background_color: null,
    media: assets,
    action: null,
    elements: assets.map((asset, index) => element(asset, index)),
  };
}

function presentation(slides: ReturnType<typeof slide>[], status: "draft" | "published" = "draft", title = "Editor shell test") {
  return {
    client_id: ids.presentation,
    logical_client_id: ids.presentation,
    version: 1,
    workspace_id: ids.workspace,
    title,
    summary: null,
    status,
    presentation_type: "slide_page" as const,
    category: "improvement" as const,
    audience_mode: "all_matching" as const,
    display_priority: 100,
    is_dismissible: true,
    starts_at: null,
    expires_at: null,
    published_at: status === "published" ? "2026-07-22T10:00:00+00:00" : null,
    archived_at: null,
    created_at: "2026-07-22T09:00:00+00:00",
    created_by_id: ids.user,
    updated_at: "2026-07-22T10:00:00+00:00",
    slides,
    audience: { audience_mode: "all_matching" as const, app_keys: [], role_keys: [], workspace_ids: [], user_ids: [] },
  };
}

test("presentation-editor-shell covers structural editing, media upload, title persistence, and read-only gating", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const mutationMethods: string[] = [];
  let current = presentation([slide(ids.firstSlide, 1, [])]);
  let readOnly = false;
  let uploadNumber = 0;
  let signedIn = false;

  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route("**/api/v1/auth/refresh**", async (route) => {
    if (!signedIn) {
      await json(route, 401, { detail: "No active session." });
      return;
    }
    await json(route, 200, { ok: true, data: { access_token: token() }, warnings: [] });
  });
  await page.route("**/api/v1/auth/sign-in", async (route) => {
    expect((route.request().postDataJSON() as { app_scope?: string }).app_scope).toBe("manager");
    signedIn = true;
    await json(route, 200, {
      ok: true,
      data: {
        access_token: token(),
        user: { client_id: ids.user, user_id: ids.user, email: "manager@example.com", username: "Marta Karlsson", role: "manager", role_name: "manager", backend_permissions: [], ui: { apps: ["manager"], pages: [], buttons: [], actions: [], query_filters: [] } },
        workspace_id: ids.workspace,
      },
      warnings: [],
    });
  });
  await page.route("**/api/v1/users/me", async (route) => await json(route, 200, { ok: true, data: { user: { client_id: ids.user, email: "manager@example.com", username: "Marta Karlsson" } }, warnings: [] }));
  await page.route(`${API}/${ids.presentation}`, async (route) => {
    if (route.request().method() === "PATCH") {
      mutationMethods.push(route.request().method());
      const body = route.request().postDataJSON() as { title: string };
      expect(body.title).toBe("Persisted editor title");
      current = presentation(current.slides, "draft", body.title);
      await json(route, 200, { ok: true, data: { presentation: current }, warnings: [] });
      return;
    }
    await json(route, 200, { ok: true, data: { presentation: readOnly ? presentation(current.slides, "published", current.title) : current }, warnings: [] });
  });
  await page.route(`${API}/${ids.presentation}/slides`, async (route) => {
    mutationMethods.push(route.request().method());
    current = presentation([...current.slides, slide(ids.secondSlide, 2, [])], "draft", current.title);
    await json(route, 200, { ok: true, data: { presentation: current }, warnings: [] });
  });
  await page.route(`${API}/${ids.presentation}/slides/reorder`, async (route) => {
    mutationMethods.push(route.request().method());
    const body = route.request().postDataJSON() as { ordered_slide_ids: string[] };
    expect(body.ordered_slide_ids).toEqual([ids.secondSlide, ids.firstSlide]);
    current = presentation([current.slides[1]!, current.slides[0]!], "draft", current.title);
    await json(route, 200, { ok: true, data: { presentation: current }, warnings: [] });
  });
  await page.route(`${API}/${ids.presentation}/slides/${ids.secondSlide}`, async (route) => {
    mutationMethods.push(route.request().method());
    current = presentation([slide(ids.firstSlide, 1, [])], "draft", current.title);
    await json(route, 200, { ok: true, data: { presentation: current }, warnings: [] });
  });
  await page.route(`${API}/${ids.presentation}/slides/${ids.secondSlide}/media/upload-url`, async (route) => {
    mutationMethods.push(route.request().method());
    uploadNumber += 1;
    await json(route, 200, { ok: true, data: { upload_url: `https://uploads.example.com/${uploadNumber}`, pending_upload_client_id: `pu_editor_${uploadNumber}`, storage_key: `editor/${uploadNumber}.png`, expires_in: 900 }, warnings: [] });
  });
  await page.route("https://uploads.example.com/**", async (route) => await route.fulfill({ status: 200 }));
  await page.route(`${API}/${ids.presentation}/slides/${ids.secondSlide}/media`, async (route) => {
    mutationMethods.push(route.request().method());
    const uploaded = media(`aupm_editor_${uploadNumber}`, uploadNumber);
    const existing = current.slides.find((item) => item.client_id === ids.secondSlide)?.media ?? [];
    const assets = [...existing, uploaded];
    current = presentation(current.slides.map((item) => item.client_id === ids.secondSlide ? slide(ids.secondSlide, 1, assets) : item), "draft", current.title);
    await json(route, 200, { ok: true, data: { presentation: current }, warnings: [] });
  });

  await page.goto(`/editor/${ids.presentation}`);
  await page.locator('input[type="email"]').fill("manager@example.com");
  await page.locator('input[type="password"]').fill("studio-test-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByTestId("presentation-editor-shell")).toBeVisible();
  await expect(page.getByTestId(`presentation-editor-slide-card-${ids.firstSlide}`)).toBeVisible();

  await page.getByTestId("presentation-editor-add-slide-button").click();
  await expect(page.getByTestId(`presentation-editor-slide-card-${ids.secondSlide}`)).toBeVisible();

  const input = page.getByTestId("presentation-editor-media-file-input");
  await input.setInputFiles({ name: "background.png", mimeType: "image/png", buffer: Buffer.from("background") });
  await expect(page.getByTestId("presentation-editor-canvas").getByTestId("slide-composition-renderer")).toBeVisible();
  await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="presentation-editor-canvas"]');
    if (!canvas) throw new Error("Canvas not found");
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(["overlay"], "overlay.png", { type: "image/png" }));
    canvas.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer }));
  });
  await expect(page.getByTestId("presentation-editor-upload-overlay")).toBeHidden();

  const secondHandle = page.getByTestId(`presentation-editor-slide-drag-handle-${ids.secondSlide}`);
  const secondBox = await secondHandle.boundingBox();
  const firstCard = page.getByTestId(`presentation-editor-slide-card-${ids.firstSlide}`);
  const firstBox = await firstCard.boundingBox();
  if (!secondBox || !firstBox) throw new Error("Slide rail geometry unavailable");
  await page.mouse.move(secondBox.x + 4, secondBox.y + 4);
  await page.mouse.down();
  await page.mouse.move(firstBox.x + 4, firstBox.y + 2);
  await page.mouse.up();
  await expect(firstCard).toHaveAttribute("aria-pressed", "false");

  await page.getByTestId(`presentation-editor-slide-delete-${ids.secondSlide}`).click();
  await expect(page.getByTestId(`presentation-editor-slide-card-${ids.secondSlide}`)).toHaveCount(0);
  const titleInput = page.getByTestId("presentation-editor-title-input");
  await titleInput.fill("Persisted editor title");
  await titleInput.press("Enter");
  await expect.poll(() => mutationMethods.filter((method) => method === "PATCH").length).toBe(1);

  readOnly = true;
  await page.reload();
  await expect(page.getByTestId("presentation-editor-read-only-banner")).toContainText("Published — read-only · v1");
  await expect(page.getByTestId("presentation-editor-add-slide-button")).toHaveCount(0);
  await expect(page.getByTestId("presentation-editor-title-input")).toHaveCount(0);
  const mutationCount = mutationMethods.length;
  await expect(page.getByTestId("presentation-editor-canvas")).toBeVisible();
  expect(mutationMethods.length).toBe(mutationCount);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
