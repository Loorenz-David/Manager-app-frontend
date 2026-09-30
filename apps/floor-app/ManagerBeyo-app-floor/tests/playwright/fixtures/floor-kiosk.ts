import type { Page, Route } from "@playwright/test";

/**
 * A paired floor device (stored kiosk token + terminal config) and the
 * backend answers its keypad needs at boot (/users/me and the roster), for the
 * system-gate and outage specs. Each answer can be switched to an outage.
 */

export const FLOOR_TOKEN_STORAGE_KEY = "beyo.floor.access_token";
export const ROSTER_URL = "**/api/v1/users?role=worker&compact=true&limit=200";
export const ME_URL = "**/api/v1/users/me";

export function encodeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

export function floorDeviceToken(jti: string): string {
  return encodeJwt({
    user_id: "usr_floor_manager",
    username: "Floor Manager",
    workspace_id: "wrk_floor_gate",
    workspace_name: "Beyo Workshop",
    workspace_role_id: "wrole_floor_manager",
    workspace_role_name: "manager",
    role_name: "manager",
    app_scope: "floor",
    time_zone: "Europe/Stockholm",
    backend_permissions: [],
    ui: { apps: [], pages: [], buttons: [], actions: [], query_filters: [] },
    jti,
    exp: 4_102_444_800,
  });
}

/** Stores a paired device's token and terminal config before the page loads. */
export async function pairFloorDevice(page: Page, token: string): Promise<void> {
  await page.addInitScript((storedToken) => {
    localStorage.setItem("beyo.floor.access_token", storedToken);
    localStorage.setItem(
      "beyo.floor.device-config",
      JSON.stringify({
        state: { terminalLabel: "TERMINAL 04 · BAY B", autoReturnSeconds: 12 },
        version: 1,
      }),
    );
  }, token);
}

/** How a mocked endpoint answers. */
export type BackendMode =
  | "ok"
  /** 503 with the backend's `auth_unavailable` code. */
  | "auth_unavailable"
  /** 502 from the proxy in front of a sleeping backend. */
  | "bad_gateway"
  /** No response at all (connection refused / DNS / offline). */
  | "network";

async function answerOutage(route: Route, mode: Exclude<BackendMode, "ok">) {
  switch (mode) {
    case "auth_unavailable":
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: "Authentication is temporarily unavailable.",
          code: "auth_unavailable",
        }),
      });
      return;
    case "bad_gateway":
      await route.fulfill({
        status: 502,
        contentType: "text/html",
        body: "<html><body>502 Bad Gateway</body></html>",
      });
      return;
    case "network":
      await route.abort("connectionrefused");
      return;
  }
}

export type FloorBackendMock = {
  me: BackendMode;
  roster: BackendMode;
  readonly meRequests: number;
  readonly rosterRequests: number;
};

export async function routeFloorBackend(
  page: Page,
  initial: { me?: BackendMode; roster?: BackendMode } = {},
): Promise<FloorBackendMock> {
  const mock = {
    me: initial.me ?? "ok",
    roster: initial.roster ?? "ok",
    meRequests: 0,
    rosterRequests: 0,
  };

  await page.route(ME_URL, async (route) => {
    mock.meRequests += 1;
    if (mock.me !== "ok") {
      await answerOutage(route, mock.me);
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          user: {
            client_id: "usr_floor_manager",
            email: "manager@example.com",
            username: "Floor Manager",
          },
        },
        warnings: [],
      }),
    });
  });

  await page.route(ROSTER_URL, async (route) => {
    mock.rosterRequests += 1;
    if (mock.roster !== "ok") {
      await answerOutage(route, mock.roster);
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          users: [
            {
              client_id: "usr_marco",
              username: "Marco Silva",
              profile_picture: null,
              role: { name: "Assembly" },
              clock_in_code: "4821",
              email: "marco@shop.com",
            },
          ],
        },
        warnings: [],
      }),
    });
  });

  return mock;
}
