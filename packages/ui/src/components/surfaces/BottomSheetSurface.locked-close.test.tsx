import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { lazy, useContext } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SurfaceHeaderContext,
  SurfaceProvider,
  useSurfaceStore,
  type SurfaceRegistrations,
} from "../../providers/SurfaceProvider";

function LockedWarning(): React.JSX.Element {
  const header = useContext(SurfaceHeaderContext);
  return (
    <button onClick={() => header?.requestClose()} type="button">
      Continue
    </button>
  );
}

const registry = {
  locked: {
    surface: "sheet",
    component: lazy(async () => ({ default: LockedWarning })),
  },
} satisfies SurfaceRegistrations;

function stackIds(): string[] {
  return useSurfaceStore.getState().stack.map((surface) => surface.id);
}

beforeEach(() => {
  useSurfaceStore.setState({ registry: {}, stack: [], navigate: undefined });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("a sheet opened with dismissible: false", () => {
  async function openLockedSheet(): Promise<void> {
    render(
      <MemoryRouter>
        <SurfaceProvider registry={registry}>
          <div>App</div>
        </SurfaceProvider>
      </MemoryRouter>,
    );
    act(() =>
      useSurfaceStore.getState().open("locked", {}, { dismissible: false }),
    );
    await screen.findByText("Continue");
  }

  it("ignores the backdrop tap", async () => {
    await openLockedSheet();

    fireEvent.click(screen.getByLabelText("Close sheet"));

    expect(stackIds()).toEqual(["locked"]);
  });

  it("still closes through requestClose, on the animated path", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openLockedSheet();

    fireEvent.click(screen.getByText("Continue"));

    // The animated path keeps the surface mounted while Vaul slides it down
    // and only then removes it from the stack. An abrupt store close would
    // have emptied the stack synchronously.
    expect(stackIds()).toEqual(["locked"]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(stackIds()).toEqual([]);
  });
});
