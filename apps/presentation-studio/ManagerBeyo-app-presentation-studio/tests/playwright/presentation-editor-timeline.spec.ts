import { expect, test, type Route } from "@playwright/test";

const ids = {
  user: "usr_01J00000000000000000000000",
  workspace: "wsp_01J00000000000000000000000",
  workspaceRole: "wrl_01J00000000000000000000000",
  presentation: "aup_timeline_01",
  firstSlide: "aups_timeline_01",
  secondSlide: "aups_timeline_02",
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

function slide(clientId: string, sequenceOrder: number, elements: unknown[] = []) {
  return {
    client_id: clientId,
    sequence_order: sequenceOrder,
    title: null,
    description: null,
    layout_type: "media_top" as const,
    playback_mode: "timed" as const,
    duration_ms: 4_000,
    composition_schema_version: 1,
    media: [],
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
  let current = presentation([slide(ids.firstSlide, 1), slide(ids.secondSlide, 2)]);

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
      elements: Array<Record<string, unknown>>;
    };
    const elements = body.elements.map((element, index) => ({
      client_id: `aupe_timeline_${index}`,
      element_type: element.element_type,
      sequence_order: index,
      layer_index: element.layer_index ?? 0,
      start_ms: element.start_ms ?? 0,
      end_ms: element.end_ms ?? null,
      media: null,
      text_content: element.text_content ?? null,
      layout: element.layout ?? null,
      style: element.style ?? null,
      enter_animation: element.enter_animation ?? null,
      exit_animation: element.exit_animation ?? null,
    }));
    current = presentation([
      { ...current.slides[0]!, duration_ms: body.duration_ms, elements },
      current.slides[1]!,
    ]);
    await json(route, 200, { ok: true, data: { presentation: current }, warnings: [] });
  });

  await page.goto(`/editor/${ids.presentation}`);
  await page.locator('input[type="email"]').fill("manager@example.com");
  await page.locator('input[type="password"]').fill("studio-test-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByTestId("presentation-timeline-play-button")).toBeVisible();

  const ruler = page.getByTestId("presentation-timeline-ruler");
  const rulerBox = await ruler.boundingBox();
  if (!rulerBox) throw new Error("Timeline ruler geometry unavailable");
  const rulerAxis = ruler.locator(":scope > div").nth(1);
  const axisBox = await rulerAxis.boundingBox();
  if (!axisBox) throw new Error("Timeline ruler axis unavailable");
  await rulerAxis.click({ position: { x: axisBox.width * 0.25, y: axisBox.height / 2 } });
  await expect(page.getByTestId("presentation-timeline-timecode")).toContainText("1.0s");
  await page.getByTestId("presentation-timeline-add-text-button").click();
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

  await page.getByTestId("presentation-panel-appears-fade").click();
  await page.getByTestId("presentation-panel-disappears-slide").click();
  const sizeSlider = page.getByTestId("presentation-panel-text-size");
  await sizeSlider.focus();
  for (let index = 0; index < 6; index += 1) await sizeSlider.press("ArrowRight");
  await expect(page.getByTestId("presentation-panel-appears-fade")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("presentation-panel-disappears-slide")).toHaveAttribute("aria-checked", "true");

  await page.getByTestId("presentation-timeline-play-button").click();
  await expect(page.getByTestId("presentation-timeline-play-button")).toHaveAttribute("aria-label", "Pause");
  await page.waitForTimeout(150);
  await page.getByTestId("presentation-timeline-play-button").click();
  await expect(page.getByTestId("presentation-timeline-play-button")).toHaveAttribute("aria-label", "Play");
  await rulerAxis.click({ position: { x: axisBox.width * 0.5, y: axisBox.height / 2 } });
  await expect(page.getByTestId("presentation-timeline-timecode")).toContainText("2.0s");

  await page.getByTestId(`presentation-editor-slide-card-${ids.secondSlide}`).click();
  await expect.poll(() => compositionPutCount).toBe(1);
  await page.reload();
  await page.getByTestId(`presentation-editor-slide-card-${ids.firstSlide}`).click();

  const savedBar = page.locator('[data-testid^="presentation-timeline-bar-aupe_timeline_"]:not([data-testid$="handle-start"]):not([data-testid$="handle-end"])');
  await expect(savedBar).toBeVisible();
  await savedBar.click();
  await expect(page.getByTestId("presentation-panel-appears-fade")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("presentation-panel-disappears-slide")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("presentation-panel-text-size")).toHaveValue("36");
  const savedCanvas = page.locator('[data-testid^="presentation-canvas-element-aupe_timeline_"]');
  await expect(savedCanvas).toBeVisible();
  expect(await savedCanvas.getAttribute("style")).toContain("left:");
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
