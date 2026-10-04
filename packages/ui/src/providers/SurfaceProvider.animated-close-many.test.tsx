import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { lazy } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SurfaceProvider, useSurfaceStore, type SurfaceRegistrations } from "./SurfaceProvider";

function CategorySheet(): React.JSX.Element {
  const requestCloseMany = useSurfaceStore((state) => state.requestCloseMany);
  return <button type="button" onClick={() => requestCloseMany(["category", "filters"])}>Save categories</button>;
}

const registry = {
  filters: { surface: "sheet", component: lazy(async () => ({ default: () => <div>Filters sheet</div> })) },
  category: { surface: "sheet", component: lazy(async () => ({ default: CategorySheet })) },
} satisfies SurfaceRegistrations;

beforeEach(() => {
  useSurfaceStore.setState({ registry: {}, stack: [], closingManyIds: [], navigate: undefined });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("requestCloseMany", () => {
  it("keeps both sheets mounted through the shared backdrop fade, then removes them together", async () => {
    render(<MemoryRouter><SurfaceProvider registry={registry}>App</SurfaceProvider></MemoryRouter>);
    act(() => {
      useSurfaceStore.getState().open("filters");
      useSurfaceStore.getState().open("category");
    });
    await screen.findByText("Save categories");
    vi.useFakeTimers({ shouldAdvanceTime: true });

    fireEvent.click(screen.getByText("Save categories"));
    expect(useSurfaceStore.getState().stack.map((surface) => surface.id)).toEqual(["filters", "category"]);
    expect(useSurfaceStore.getState().closingManyIds).toEqual(["category", "filters"]);
    expect(document.querySelector("[data-testid='surface-shared-sheet-backdrop']")).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(379); });
    expect(useSurfaceStore.getState().stack).toHaveLength(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(useSurfaceStore.getState().stack).toHaveLength(0);
    expect(useSurfaceStore.getState().closingManyIds).toEqual([]);
  });
});
