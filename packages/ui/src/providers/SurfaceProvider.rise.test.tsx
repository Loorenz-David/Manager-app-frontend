import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { lazy } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SurfaceProvider,
  useSurfaceStore,
  type SurfaceRegistrations,
} from "./SurfaceProvider";

const registry = {
  "rise-one": {
    surface: "rise",
    component: lazy(async () => ({
      default: () => <div>First rise</div>,
    })),
  },
  "rise-two": {
    surface: "rise",
    component: lazy(async () => ({
      default: () => <div>Second rise</div>,
    })),
  },
} satisfies SurfaceRegistrations;

beforeEach(() => {
  useSurfaceStore.setState({
    registry: {},
    stack: [],
    navigate: undefined,
  });
  vi.spyOn(window.history, "go").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("rise surface renderer", () => {
  it("renders a backdrop and removes the surface through the shared close lifecycle", async () => {
    render(
      <MemoryRouter>
        <SurfaceProvider registry={registry}>
          <div>Underlying page</div>
        </SurfaceProvider>
      </MemoryRouter>,
    );

    act(() => useSurfaceStore.getState().open("rise-one"));

    expect(await screen.findByText("First rise")).toBeInTheDocument();
    const surface = screen.getByTestId("rise-surface");
    expect(surface.querySelector(".bg-black\\/35")).not.toBeNull();
    // C9: the dialog must carry an accessible name (setTitle-fed, "Screen" fallback).
    expect(surface.querySelector('[role="dialog"]')).toHaveAttribute(
      "aria-label",
      "Screen",
    );

    act(() => useSurfaceStore.getState().closeTop());

    await waitFor(() =>
      expect(useSurfaceStore.getState().stack).toHaveLength(0),
    );
  });

  it("keeps covered rise surfaces mounted and inert while the top surface stays interactive", async () => {
    render(
      <MemoryRouter>
        <SurfaceProvider registry={registry}>
          <div>Underlying page</div>
        </SurfaceProvider>
      </MemoryRouter>,
    );

    act(() => {
      useSurfaceStore.getState().open("rise-one");
      useSurfaceStore.getState().open("rise-two");
    });

    const first = await screen.findByText("First rise");
    const second = await screen.findByText("Second rise");
    const firstWrapper = first.closest("[inert]");
    const secondWrapper = second.closest("[inert]");

    expect(screen.getAllByTestId("rise-surface")).toHaveLength(2);
    expect(firstWrapper).not.toBeNull();
    expect(secondWrapper).toBeNull();
    expect(first.closest('[role="dialog"]')).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(second.closest('[role="dialog"]')).toHaveAttribute(
      "aria-modal",
      "true",
    );
  });
});
