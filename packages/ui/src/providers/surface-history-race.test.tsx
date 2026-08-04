import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { lazy } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SurfaceProvider,
  useSurfaceStore,
  type SurfaceRegistrations,
} from "./SurfaceProvider";

const registry = {
  taskDetail: {
    surface: "slide",
    component: lazy(async () => ({ default: () => <div>Task detail</div> })),
  },
  shopify: {
    surface: "slide",
    component: lazy(async () => ({ default: () => <div>Shopify form</div> })),
  },
  confirm: {
    surface: "slide",
    component: lazy(async () => ({ default: () => <div>Confirm time</div> })),
  },
} satisfies SurfaceRegistrations;

beforeEach(() => {
  useSurfaceStore.setState({ registry: {}, stack: [], navigate: undefined });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("surface stack vs. delayed history.go() popstate", () => {
  it("keeps a surface opened right after a close, even once the close's own delayed popstate arrives", async () => {
    // Real browsers resolve history.go() asynchronously: its popstate lands on
    // a later task, carrying the depth that was live *at the moment go() was
    // called* — i.e. before any pushState a caller issues synchronously right
    // after (exactly what closeAndContinue-style "close, then open the next
    // surface" flows do).
    vi.spyOn(window.history, "go").mockImplementation(() => {
      const staleState = { __surfaceDepth: 1 };
      setTimeout(() => {
        window.dispatchEvent(
          new PopStateEvent("popstate", { state: staleState }),
        );
      }, 0);
    });

    render(
      <MemoryRouter>
        <SurfaceProvider registry={registry}>
          <div>App</div>
        </SurfaceProvider>
      </MemoryRouter>,
    );

    act(() => useSurfaceStore.getState().open("taskDetail"));
    await screen.findByText("Task detail");
    act(() => useSurfaceStore.getState().open("shopify"));
    await screen.findByText("Shopify form");

    // Mirrors ShopifyProductSyncSlidePage's closeAndContinue(): close the
    // current slide, then synchronously open the next one, before the
    // pending go()'s popstate has had a chance to fire.
    act(() => {
      useSurfaceStore.getState().close("shopify");
      useSurfaceStore.getState().open("confirm");
    });

    await screen.findByText("Confirm time");

    // Let the delayed popstate (scheduled via setTimeout above) actually fire.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(useSurfaceStore.getState().stack.map((s) => s.id)).toEqual([
      "taskDetail",
      "confirm",
    ]);
    expect(screen.queryByText("Confirm time")).toBeInTheDocument();
  });
});
