import { expect, test, type Route } from "@playwright/test";

const ids = {
  user: "usr_01J00000000000000000000000",
  workspace: "wsp_01J00000000000000000000000",
  workspaceRole: "wrl_01J00000000000000000000000",
  presentation: "aup_timeline_01",
  firstSlide: "aups_timeline_01",
  secondSlide: "aups_timeline_02",
  media: "aupm_timeline_01",
  mediaElement: "aupe_media_timeline_01",
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
    jti: "jti-editor-timeline",
    iat: now,
    exp: now + 3_600,
  })}.`;
}

async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function slide(
  clientId: string,
  sequenceOrder: number,
  elements: unknown[] = [],
  media: unknown[] = [],
) {
  return {
    client_id: clientId,
    sequence_order: sequenceOrder,
    title: null,
    description: null,
    layout_type: "media_top" as const,
    playback_mode: "timed" as const,
    duration_ms: 4_000,
    composition_schema_version: 1,
    background_color: null as string | null,
    media,
    action: null,
    elements,
  };
}

function presentation(slides: ReturnType<typeof slide>[]) {
  return {
    client_id: ids.presentation,
    logical_client_id: ids.presentation,
    version: 1,
    workspace_id: ids.workspace,
    title: "Timeline test",
    summary: null,
    status: "draft" as const,
    presentation_type: "slide_page" as const,
    category: "improvement" as const,
    audience_mode: "all_matching" as const,
    display_priority: 100,
    is_dismissible: true,
    starts_at: null,
    expires_at: null,
    published_at: null,
    archived_at: null,
    created_at: "2026-07-22T09:00:00+00:00",
    created_by_id: ids.user,
    updated_at: "2026-07-22T10:00:00+00:00",
    slides,
    audience: { audience_mode: "all_matching" as const, app_keys: [], role_keys: [], workspace_ids: [], user_ids: [] },
  };
}

test("presentation-editor-timeline edits, flushes, reloads, and plays without errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  let signedIn = false;
  let compositionPutCount = 0;
  const media = {
    client_id: ids.media,
    sequence_order: 0,
    media_type: "image",
    media_url: "https://cdn.example.com/timeline-media.png",
    poster_url: null,
    fallback_url: null,
    alt_text: "Timeline media",
    mime_type: "image/png",
    width: 1080,
    height: 1920,
    duration_ms: null,
    is_looping: false,
  };
  let current = presentation([
    slide(ids.firstSlide, 1, [{
      client_id: ids.mediaElement,
      element_type: "media",
      sequence_order: 0,
      layer_index: 0,
      start_ms: 0,
      end_ms: null,
      media,
      text_content: null,
      layout: { x: 0.5, y: 0.5, width: 0.4, height: 0.2, fit: "cover", anchor: "center" },
      style: null,
      enter_animation: null,
      exit_animation: null,
    }], [media]),
    slide(ids.secondSlide, 2),
  ]);

  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route("**/api/v1/auth/refresh**", async (route) => {
    if (!signedIn) return json(route, 401, { detail: "No active session." });
    return json(route, 200, { ok: true, data: { access_token: token() }, warnings: [] });
  });
  await page.route("**/api/v1/auth/sign-in", async (route) => {
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
  await page.route("**/api/v1/users/me", async (route) => json(route, 200, { ok: true, data: { user: { client_id: ids.user, email: "manager@example.com", username: "Marta Karlsson" } }, warnings: [] }));
  await page.route(`${API}/${ids.presentation}`, async (route) => json(route, 200, { ok: true, data: { presentation: current }, warnings: [] }));
  await page.route(`${API}/${ids.presentation}/slides/${ids.firstSlide}/composition`, async (route) => {
    compositionPutCount += 1;
    const body = route.request().postDataJSON() as {
      duration_ms: number;
      background_color: string | null;
      elements: Array<Record<string, unknown>>;
    };
    const elements = body.elements.map((element, index) => ({
      client_id: `aupe_timeline_${String(element.element_type)}_${index}`,
      element_type: element.element_type,
      sequence_order: index,
      layer_index: element.layer_index ?? 0,
      start_ms: element.start_ms ?? 0,
      end_ms: element.end_ms ?? null,
      media: element.media_id === ids.media ? media : null,
      text_content: element.text_content ?? null,
      layout: element.layout ?? null,
      style: element.style ?? null,
      enter_animation: element.enter_animation ?? null,
      exit_animation: element.exit_animation ?? null,
    }));
    current = presentation([
      {
        ...current.slides[0]!,
        duration_ms: body.duration_ms,
        background_color: body.background_color,
        elements,
      },
      current.slides[1]!,
    ]);
    await json(route, 200, { ok: true, data: { presentation: current }, warnings: [] });
  });

  await page.goto(`/editor/${ids.presentation}`);
  await page.locator('input[type="email"]').fill("manager@example.com");
  await page.locator('input[type="password"]').fill("studio-test-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByTestId("presentation-timeline-play-button")).toBeVisible();

  const canvasRenderer = page
    .getByTestId("presentation-editor-renderer-layer")
    .getByTestId("slide-composition-renderer");
  await page
    .getByTestId("presentation-panel-slide-background-color-swatch-3f78a8")
    .click();
  await expect(canvasRenderer).toHaveCSS("background-color", "rgb(63, 120, 168)");

  const mediaCanvas = page.getByTestId(`presentation-canvas-element-${ids.mediaElement}`);
  await mediaCanvas.click();
  const mediaWidthBefore = Number.parseFloat(
    (await mediaCanvas.getAttribute("style"))?.match(/width:\s*([\d.]+)%/)?.[1] ?? "0",
  );
  const mediaResizeHandle = page.getByTestId(
    `presentation-canvas-element-${ids.mediaElement}-resize-se`,
  );
  const mediaResizeBox = await mediaResizeHandle.boundingBox();
  if (!mediaResizeBox) throw new Error("Media resize handle geometry unavailable");
  await page.mouse.move(mediaResizeBox.x + mediaResizeBox.width / 2, mediaResizeBox.y + mediaResizeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(mediaResizeBox.x + mediaResizeBox.width / 2 + 30, mediaResizeBox.y + mediaResizeBox.height / 2 + 5);
  await page.mouse.up();
  await expect.poll(async () => Number.parseFloat(
    (await mediaCanvas.getAttribute("style"))?.match(/width:\s*([\d.]+)%/)?.[1] ?? "0",
  )).toBeGreaterThan(mediaWidthBefore);
  const resizedMediaWidth = Number.parseFloat(
    (await mediaCanvas.getAttribute("style"))?.match(/width:\s*([\d.]+)%/)?.[1] ?? "0",
  );

  const ruler = page.getByTestId("presentation-timeline-ruler");
  const rulerBox = await ruler.boundingBox();
  if (!rulerBox) throw new Error("Timeline ruler geometry unavailable");
  const rulerAxis = ruler.locator(":scope > div").nth(1);
  const axisBox = await rulerAxis.boundingBox();
  if (!axisBox) throw new Error("Timeline ruler axis unavailable");
  await rulerAxis.click({ position: { x: axisBox.width * 0.25, y: axisBox.height / 2 } });
  await expect(page.getByTestId("presentation-timeline-timecode")).toContainText("1.0s");
  await page.getByTestId("presentation-timeline-add-text-button").click();
  const inlineTextEditor = page.locator('[data-testid^="presentation-canvas-text-editor-local-text-"]');
  await expect(inlineTextEditor).toBeFocused();
  await page.keyboard.type("Hello");
  await expect(inlineTextEditor).toHaveValue("Hello");
  await page.keyboard.press("Escape");
  await expect(inlineTextEditor).toBeHidden();
  await expect(page.getByTestId("presentation-panel-text-content")).toHaveValue("Hello");
  const bar = page.locator('[data-testid^="presentation-timeline-bar-local-text-"]:not([data-testid$="handle-start"]):not([data-testid$="handle-end"])');
  await expect(bar).toBeVisible();

  const barBox = await bar.boundingBox();
  if (!barBox) throw new Error("Timeline bar geometry unavailable");
  await page.mouse.move(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(barBox.x + barBox.width / 2 + 35, barBox.y + barBox.height / 2);
  await page.mouse.up();
  const startHandle = page.locator('[data-testid^="presentation-timeline-bar-local-text-"][data-testid$="handle-start"]');
  const startBox = await startHandle.boundingBox();
  if (!startBox) throw new Error("Start handle geometry unavailable");
  await page.mouse.move(startBox.x + 2, startBox.y + 2);
  await page.mouse.down();
  await page.mouse.move(startBox.x - 18, startBox.y + 2);
  await page.mouse.up();
  const endHandle = page.locator('[data-testid^="presentation-timeline-bar-local-text-"][data-testid$="handle-end"]');
  const endBox = await endHandle.boundingBox();
  if (!endBox) throw new Error("End handle geometry unavailable");
  await page.mouse.move(endBox.x + 2, endBox.y + 2);
  await page.mouse.down();
  await page.mouse.move(endBox.x + 18, endBox.y + 2);
  await page.mouse.up();

  const canvasElement = page.locator('[data-testid^="presentation-canvas-element-local-text-"]');
  const canvasBox = await canvasElement.boundingBox();
  if (!canvasBox) throw new Error("Canvas element geometry unavailable");
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 28, canvasBox.y + canvasBox.height / 2 + 22);
  await page.mouse.up();
  await expect.poll(() =>
    page.evaluate(() => window.getSelection()?.toString() ?? ""),
  ).toBe("");

  await page.getByTestId("presentation-panel-appears-fade").click();
  await page.getByTestId("presentation-panel-disappears-slide").click();
  await page.getByTestId("presentation-panel-text-alignment-right").click();
  await page.getByTestId("presentation-panel-text-color-hex").fill("#123456");
  await page.getByTestId("presentation-panel-text-background-swatch-3f78a8").click();
  const radiusSlider = page.getByTestId("presentation-panel-text-radius-input");
  await radiusSlider.focus();
  for (let index = 0; index < 16; index += 1) await radiusSlider.press("ArrowRight");
  const paddingSlider = page.getByTestId("presentation-panel-text-padding-input");
  await paddingSlider.focus();
  for (let index = 0; index < 10; index += 1) await paddingSlider.press("ArrowRight");
  const sizeSlider = page.getByTestId("presentation-panel-text-size");
  await sizeSlider.focus();
  for (let index = 0; index < 6; index += 1) await sizeSlider.press("ArrowRight");
  await expect(page.getByTestId("presentation-panel-appears-fade")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("presentation-panel-disappears-slide")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("presentation-panel-text-alignment-right")).toHaveAttribute("aria-checked", "true");

  const playButton = page.getByTestId("presentation-timeline-play-button");
  await page.getByTestId("presentation-editor-canvas").click({ position: { x: 12, y: 12 } });
  await page.keyboard.press("Space");
  await expect(playButton).toHaveAttribute("aria-label", "Pause");
  const panelTextarea = page.getByTestId("presentation-panel-text-content");
  await panelTextarea.focus();
  await page.keyboard.press("End");
  await page.keyboard.type(" ");
  await expect(panelTextarea).toHaveValue("Hello ");
  await expect(playButton).toHaveAttribute("aria-label", "Pause");
  await panelTextarea.evaluate((element) => element.blur());
  await page.keyboard.press("Space");
  await expect(playButton).toHaveAttribute("aria-label", "Play");
  await rulerAxis.click({ position: { x: axisBox.width * 0.5, y: axisBox.height / 2 } });
  await expect(page.getByTestId("presentation-timeline-timecode")).toContainText("2.0s");

  await page.getByTestId(`presentation-editor-slide-card-${ids.secondSlide}`).click();
  await expect.poll(() => compositionPutCount).toBeGreaterThan(0);
  await page.reload();
  await page.getByTestId(`presentation-editor-slide-card-${ids.firstSlide}`).click();
  await expect(canvasRenderer).toHaveCSS("background-color", "rgb(63, 120, 168)");

  const savedBar = page.locator('[data-testid^="presentation-timeline-bar-aupe_timeline_text_"]:not([data-testid$="handle-start"]):not([data-testid$="handle-end"])');
  await expect(savedBar).toBeVisible();
  await savedBar.click();
  await expect(page.getByTestId("presentation-panel-appears-fade")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("presentation-panel-disappears-slide")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("presentation-panel-text-size")).toHaveValue("36");
  await expect(page.getByTestId("presentation-panel-text-alignment-right")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("presentation-panel-text-color-hex")).toHaveValue("#123456");
  await expect(page.getByTestId("presentation-panel-text-radius-input")).toHaveValue("16");
  await expect(page.getByTestId("presentation-panel-text-padding-input")).toHaveValue("10");
  const savedCanvas = page.locator('[data-testid^="presentation-canvas-element-aupe_timeline_text_"]');
  await expect(savedCanvas).toBeVisible();
  expect(await savedCanvas.getAttribute("style")).toContain("left:");
  const savedMediaCanvas = page.locator(
    '[data-testid^="presentation-canvas-element-aupe_timeline_media_"]',
  );
  await expect(savedMediaCanvas).toBeVisible();
  await expect.poll(async () => Number.parseFloat(
    (await savedMediaCanvas.getAttribute("style"))?.match(/width:\s*([\d.]+)%/)?.[1] ?? "0",
  )).toBeCloseTo(resizedMediaWidth, 4);

  await page.getByTestId("presentation-panel-text-close-button").click();
  const putCountBeforeClear = compositionPutCount;
  await page
    .getByTestId("presentation-panel-slide-background-color-none")
    .click();
  await expect(canvasRenderer).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.getByTestId("presentation-editor-canvas")).toHaveCSS(
    "background-color",
    "rgb(71, 77, 86)",
  );
  await page.getByTestId("presentation-editor-save-draft-button").click();
  await expect.poll(() => compositionPutCount).toBeGreaterThan(putCountBeforeClear);
  await page.reload();
  await expect(canvasRenderer).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
