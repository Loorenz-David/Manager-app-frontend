import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { LazyMotion, domAnimation } from "framer-motion";
import { MemoryRouter, Route, Routes, type InitialEntry } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TabNavigationProvider } from "@/app/TabNavigationProvider";
import { TabSlideStack } from "@/app/TabSlideStack";
import { ROUTES, TAB_ORDER } from "@/lib/routes";

vi.mock("@/lib/primary-tab-preload", async () => {
  const { TAB_ORDER: order } = await import("@/lib/routes");

  return {
    TAB_ROUTE_COMPONENTS: Object.fromEntries(
      order.map((path) => [
        path,
        () => <div data-testid={`tab-content-${path}`} />,
      ]),
    ),
    preloadPrimaryTabRoute: vi.fn(),
    preloadPrimaryTabRoutes: vi.fn(),
  };
});

/** Mirrors the real router: tab routes match the URL and render nothing. */
function TabRenderedByShell(): null {
  return null;
}

function renderShell(initialEntry: InitialEntry): void {
  render(
    <LazyMotion features={domAnimation}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <TabNavigationProvider>
          <div style={{ position: "relative", overflow: "hidden" }}>
            <Routes>
              <Route element={<TabSlideStack />}>
                {TAB_ORDER.map((path) => (
                  <Route element={<TabRenderedByShell />} key={path} path={path} />
                ))}
                <Route
                  element={<div data-testid="conversation-page" />}
                  path={ROUTES.caseConversation}
                />
              </Route>
            </Routes>
          </div>
        </TabNavigationProvider>
      </MemoryRouter>
    </LazyMotion>,
  );
}

afterEach(cleanup);

describe("TabSlideStack", () => {
  it("renders only the tab the route points at", () => {
    renderShell(ROUTES.cases);

    expect(screen.getByTestId(`tab-content-${ROUTES.cases}`)).toBeTruthy();
    expect(screen.queryByTestId(`tab-content-${ROUTES.home}`)).toBeNull();
    expect(screen.queryByTestId("route-layer")).toBeNull();
  });

  it("anchors the tab's fixed chrome to the pane, not the viewport", () => {
    renderShell(ROUTES.tasks);

    // Without paint containment a page's `fixed` FAB / bottom bar resolves
    // against the viewport and hides behind the nav bar.
    expect(
      screen.getByTestId(`slide-stack-pane-${ROUTES.tasks}`).className,
    ).toContain("contain-[paint]");
  });

  it("keeps the tab underneath mounted for a route-backed surface", async () => {
    renderShell({
      pathname: "/cases/case_1",
      state: { background: { pathname: ROUTES.tasks, search: "" } },
    });

    await waitFor(() => expect(screen.getByTestId("route-layer")).toBeTruthy());
    expect(screen.getByTestId("conversation-page")).toBeTruthy();
    // The tab that opened the surface stays mounted behind it, so closing it
    // restores the list without a remount.
    expect(screen.getByTestId(`tab-content-${ROUTES.tasks}`)).toBeTruthy();
  });

  it("falls back to a tab for a deep link with no background", async () => {
    renderShell("/cases/case_1");

    await waitFor(() => expect(screen.getByTestId("route-layer")).toBeTruthy());
    expect(screen.getByTestId(`tab-content-${ROUTES.home}`)).toBeTruthy();
  });
});
