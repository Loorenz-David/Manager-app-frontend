import { expect, test, type Page, type Route } from "@playwright/test";

type StudioRole = "admin" | "manager" | "worker";

type MockSession = {
  active: boolean;
  role: StudioRole;
};

const ids = {
  user: "usr_01J00000000000000000000000",
  workspace: "wsp_01J00000000000000000000000",
  workspaceRole: "wrl_01J00000000000000000000000",
};

function encodeBase64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createAccessToken(role: StudioRole): string {
  const now = Math.floor(Date.now() / 1_000);
  const payload = {
    sub: ids.user,
    user_id: ids.user,
    email: `${role}@example.com`,
    username: `${role}-user`,
    workspace_id: ids.workspace,
    workspace_name: "Acme Workshop",
    role_name: role,
    workspace_role_id: ids.workspaceRole,
    workspace_role_name: role,
    app_scope: "manager",
    time_zone: "Europe/Stockholm",
    backend_permissions: [],
    ui: {
      apps: ["manager"],
      pages: [],
      buttons: [],
      actions: [],
      query_filters: [],
    },
    jti: `jti-${role}`,
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

async function installAuthApi(page: Page): Promise<MockSession> {
  const session: MockSession = { active: false, role: "manager" };

  await page.route("**/api/v1/auth/refresh**", async (route) => {
    if (!session.active) {
      await json(route, 401, { detail: "No active session." });
      return;
    }

    await json(route, 200, {
      ok: true,
      data: { access_token: createAccessToken(session.role) },
      warnings: [],
    });
  });

  await page.route("**/api/v1/users/me", async (route) => {
    await json(route, 200, {
      ok: true,
      data: {
        user: {
          client_id: ids.user,
          email: `${session.role}@example.com`,
          username: `${session.role}-user`,
        },
      },
      warnings: [],
    });
  });

  await page.route("**/api/v1/auth/sign-in", async (route) => {
    const requestBody = route.request().postDataJSON() as {
      app_scope?: string;
      email?: string;
    };

    expect(requestBody.app_scope).toBe("manager");
    const requestedRole = requestBody.email?.split("@")[0] as StudioRole;

    if (requestedRole === "worker") {
      await json(route, 403, { detail: "This account is not permitted to use Presentation Studio." });
      return;
    }

    session.active = true;
    session.role = requestedRole;
    await json(route, 200, {
      ok: true,
      data: {
        access_token: createAccessToken(requestedRole),
        user: {
          client_id: ids.user,
          user_id: ids.user,
          email: `${requestedRole}@example.com`,
          username: `${requestedRole}-user`,
          role: requestedRole,
          role_name: requestedRole,
          backend_permissions: [],
          ui: {
            apps: ["manager"],
            pages: [],
            buttons: [],
            actions: [],
            query_filters: [],
          },
        },
        workspace_id: ids.workspace,
      },
      warnings: [],
    });
  });

  await page.route("**/api/v1/auth/logout", async (route) => {
    session.active = false;
    await json(route, 200, { ok: true, data: {}, warnings: [] });
  });

  await page.route("**/api/v1/app-update-presentations**", async (route) => {
    if (!session.active) {
      await json(route, 401, { detail: "Session expired." });
      return;
    }
    await json(route, 200, {
      ok: true,
      data: {
        app_update_presentations_pagination: {
          items: [],
          has_more: false,
          limit: 200,
          offset: 0,
        },
      },
      warnings: [],
    });
  });

  return session;
}

async function signIn(page: Page, role: StudioRole): Promise<void> {
  await page.locator('input[type="email"]').fill(`${role}@example.com`);
  await page.locator('input[type="password"]').fill("studio-test-password");
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("presentation-studio-auth", () => {
  for (const role of ["manager", "admin"] as const) {
    test(`${role} sign-in, refresh, and sign-out`, async ({ page }) => {
      await installAuthApi(page);
      await page.goto("/");

      await expect(page).toHaveURL(/\/sign-in$/);
      await signIn(page, role);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByTestId("presentation-dashboard-top-bar")).toBeAttached();
      await expect(page.getByText(`${role}-user`)).toBeVisible();
      await expect(page.getByTestId("presentation-dashboard-top-bar").locator("span").first()).toHaveText("A");

      await page.reload();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByTestId("presentation-dashboard-top-bar")).toBeAttached();

      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/sign-in$/);
    });
  }

  test("worker role is rejected with a visible error", async ({ page }) => {
    await installAuthApi(page);
    await page.goto("/sign-in");
    await signIn(page, "worker");

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByText(/not permitted to use Presentation Studio/i)).toBeVisible();
  });

  test("editor deep link returns to the guarded destination after sign-in", async ({ page }) => {
    await installAuthApi(page);
    await page.goto("/editor/prs_01J00000000000000000000000");

    await expect(page).toHaveURL(/\/sign-in$/);
    await signIn(page, "manager");
    await expect(page).toHaveURL(/\/editor\/prs_01J00000000000000000000000$/);
    await expect(page.getByTestId("presentation-editor-error")).toBeAttached();
  });

  test("a 401 after sign-in clears the session and returns to sign-in", async ({ page }) => {
    const session = await installAuthApi(page);
    await page.goto("/");
    await signIn(page, "manager");
    await expect(page.getByTestId("presentation-dashboard-top-bar")).toBeVisible();

    session.active = false;
    await page.getByTestId("presentation-dashboard-filter-chip-drafts").click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
