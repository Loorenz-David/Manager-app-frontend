import { test, expect } from "./fixtures/app-fixture";

function encodeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

test("floor-bootstrap: sign-in inputs keep digits and issue no unauthenticated roster request", async ({
  page,
}) => {
  await page.clock.install({
    time: new Date("2026-07-29T13:14:30.000Z"),
  });

  const workspaceId = "wrk_floor_bootstrap";
  const accessToken = encodeJwt({
    user_id: "usr_floor_manager",
    username: "Floor Manager",
    workspace_id: workspaceId,
    workspace_name: "Beyo Workshop",
    workspace_role_id: "wrole_floor_manager",
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
    jti: "floor-bootstrap",
    exp: 4_102_444_800,
  });

  let rosterRequests = 0;
  page.on("request", (request) => {
    if (
      request
        .url()
        .includes("/api/v1/users?role=worker&compact=true&limit=200")
    ) {
      rosterRequests += 1;
    }
  });

  await page.route("**/api/v1/auth/sign-in", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject({
      email: "floor42@shop.com",
      password: "Passw0rd123",
      app_scope: "floor",
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          access_token: accessToken,
          user: {
            user_id: "usr_floor_manager",
            email: "manager@example.com",
            username: "Floor Manager",
            workspace_id: workspaceId,
            workspace_role_id: "wrole_floor_manager",
            workspace_name: "Beyo Workshop",
            role_name: "manager",
            workspace_role_name: "manager",
            workspace_specialization: null,
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
          },
          workspace_id: workspaceId,
        },
        warnings: [],
      }),
    });
  });

  await page.goto("/sign-in");
  await expect(page.getByTestId("floor-session-expired-note")).toHaveCount(0);
  await page
    .getByTestId("floor-terminal-label-input")
    .pressSequentially("TERMINAL 04");
  await page
    .getByTestId("auth-email-input")
    .pressSequentially("floor42@shop.com");
  await page
    .getByTestId("auth-password-input")
    .pressSequentially("Passw0rd123");

  await expect(page.getByTestId("floor-terminal-label-input")).toHaveValue(
    "TERMINAL 04",
  );
  await expect(page.getByTestId("auth-email-input")).toHaveValue(
    "floor42@shop.com",
  );
  await expect(page.getByTestId("auth-password-input")).toHaveValue(
    "Passw0rd123",
  );
  expect(rosterRequests).toBe(0);

  await page.getByTestId("auth-sign-in-button").click();

  await expect(page).toHaveURL("/");
  await expect(page.getByTestId("keypad-screen")).toBeVisible();
  await expect(page.getByTestId("kiosk-header")).toContainText(
    "TERMINAL 04",
  );
  await expect(page.getByTestId("kiosk-header")).toContainText("Beyo Workshop");
  await expect(page.getByTestId("kiosk-header-time")).toHaveText("15:14");

  await page.clock.fastForward(60_000);

  await expect(page.getByTestId("kiosk-header-time")).toHaveText("15:15");
});
