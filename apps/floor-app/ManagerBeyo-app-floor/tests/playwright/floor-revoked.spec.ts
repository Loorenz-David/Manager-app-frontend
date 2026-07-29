import { test, expect } from "./fixtures/app-fixture";

function encodeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

test("floor-revoked: a stored floor device session is cleared and returns to sign-in", async ({
  page,
}) => {
  const accessToken = encodeJwt({
    user_id: "usr_revoked_floor_manager",
    username: "Revoked Floor Manager",
    workspace_id: "wrk_revoked_floor",
    workspace_name: "Beyo Workshop",
    workspace_role_id: "wrole_revoked_floor_manager",
    workspace_role_name: "manager",
    role_name: "manager",
    app_scope: "floor",
    time_zone: "Europe/Stockholm",
    backend_permissions: [],
    ui: {
      apps: [],
      pages: [],
      buttons: [],
      actions: [],
      query_filters: [],
    },
    jti: "floor-revoked",
    exp: 4_102_444_800,
  });

  await page.addInitScript((token) => {
    localStorage.setItem("beyo.floor.access_token", token);
    localStorage.setItem(
      "beyo.floor.device-config",
      JSON.stringify({
        state: {
          terminalLabel: "TERMINAL 04 · BAY B",
          autoReturnSeconds: 12,
        },
        version: 1,
      }),
    );
  }, accessToken);

  await page.route("**/api/v1/users/me", async (route) => {
    expect(route.request().headers().authorization).toBe(
      `Bearer ${accessToken}`,
    );
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "This floor device token was revoked.",
      }),
    });
  });

  await page.goto("/");

  await expect(page).toHaveURL("/sign-in");
  await expect(page.getByTestId("floor-session-expired-note")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("beyo.floor.access_token"),
      ),
    )
    .toBeNull();
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem("beyo.floor.session-expired"),
      ),
    )
    .toBeNull();
});
