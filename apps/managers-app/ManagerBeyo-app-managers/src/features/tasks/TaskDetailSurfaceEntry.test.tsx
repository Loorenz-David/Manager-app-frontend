import { Suspense, useContext } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SurfacePropsContext } from "@beyo/ui";
import type { TaskDetailSurfaceProps } from "@beyo/tasks";

const mocks = vi.hoisted(() => ({ open: vi.fn() }));

vi.mock("@beyo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/ui")>()),
  useSurfaceStore: (select: (state: { open: unknown }) => unknown) =>
    select({ open: mocks.open }),
}));

// The real page pulls in the whole task detail; this entry's only job is the
// props it hands down, so a probe stands in for it.
vi.mock("@beyo/tasks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/tasks")>()),
  loadTaskDetailSlidePage: () =>
    Promise.resolve({
      default: function TaskDetailProbe(): React.JSX.Element {
        const props = useContext(SurfacePropsContext) as TaskDetailSurfaceProps;
        const open = props.surfaceOpeners?.openTypicalStrategy;

        return (
          <>
            <span data-testid="probe-task-id">{props.taskId}</span>
            <button
              type="button"
              disabled={open === undefined}
              onClick={() =>
                open?.({
                  strategy: { pillLabel: "probe" } as never,
                })
              }
            >
              open strategy
            </button>
          </>
        );
      },
    }),
}));

const { default: TaskDetailSurfaceEntry } =
  await import("./TaskDetailSurfaceEntry");

function renderEntry(props: Record<string, unknown>) {
  return render(
    <SurfacePropsContext.Provider value={props}>
      <Suspense fallback={null}>
        <TaskDetailSurfaceEntry />
      </Suspense>
    </SurfacePropsContext.Provider>,
  );
}

afterEach(() => {
  cleanup();
  mocks.open.mockClear();
});

describe("TaskDetailSurfaceEntry", () => {
  it("supplies the typical-strategy opener to a detail opened without one", async () => {
    // The regression: six call sites live inside @beyo/tasks and @beyo/stats
    // and cannot reach this app's registry, so they open the detail with
    // `taskId` alone. Before the openers moved to registration, that shipped a
    // strategy pill with no tap target.
    renderEntry({ taskId: "tsk_1" });

    const trigger = await screen.findByRole("button", {
      name: "open strategy",
    });
    expect(trigger).toBeEnabled();

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(mocks.open).toHaveBeenCalledWith(
        "typical-strategy-sheet",
        expect.objectContaining({
          strategy: expect.objectContaining({ pillLabel: "probe" }),
        }),
      );
    });
  });

  it("augments the caller's props rather than replacing them", async () => {
    renderEntry({ taskId: "tsk_2" });

    // The entry spreads the surface props before adding its openers; dropping
    // that spread would leave the page without the id it was opened for.
    await waitFor(() => {
      expect(screen.getByTestId("probe-task-id")).toHaveTextContent("tsk_2");
    });
  });
});
