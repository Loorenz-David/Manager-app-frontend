import { render, screen } from "@testing-library/react";
import { useAuthStore, type AuthUser } from "@beyo/auth";
import type { UserId, WorkspaceId } from "@beyo/lib";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import {
  FloorGuestRoute,
  FloorProtectedRoute,
} from "@/app/router-guards";

function LocationProbe(): React.JSX.Element {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const authenticatedUser: AuthUser = {
  id: "usr_floor_test" as UserId,
  email: "manager@example.com",
  username: "Floor Manager",
  role_name: "manager",
  role: "manager",
  workspaceRoleId: "wrole_floor_test",
  workspaceName: "Beyo Workshop",
  workspaceRoleName: "manager",
  workspaceSpecialization: null,
  appScope: "floor",
  timeZone: "Europe/Stockholm",
  backend_permissions: [],
  ui: {
    apps: [],
    pages: [],
    buttons: [],
    actions: [],
    query_filters: [],
  },
  jti: "floor-test",
  exp: 0,
};

beforeEach(() => {
  useAuthStore.getState().clearAuth();
});

describe("floor router guards", () => {
  it("redirects an unauthenticated protected route to sign-in", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<FloorProtectedRoute />}>
            <Route index element={<div>Protected kiosk</div>} />
          </Route>
          <Route
            path="/sign-in"
            element={
              <>
                <div>Sign in</div>
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in")).toBeVisible();
    expect(screen.getByTestId("location")).toHaveTextContent("/sign-in");
  });

  it("redirects an authenticated guest route to the kiosk home", () => {
    useAuthStore
      .getState()
      .setUser(authenticatedUser, "wrk_floor_test" as WorkspaceId);

    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <Routes>
          <Route element={<FloorGuestRoute />}>
            <Route path="/sign-in" element={<div>Sign in</div>} />
          </Route>
          <Route
            path="/"
            element={
              <>
                <div>Protected kiosk</div>
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected kiosk")).toBeVisible();
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });
});
