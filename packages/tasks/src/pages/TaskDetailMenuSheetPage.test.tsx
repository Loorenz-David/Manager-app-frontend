import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskDetailMenuSheetPage } from "./TaskDetailMenuSheetPage";
import { FORCE_TASK_READY_SLIDE_SURFACE_ID } from "../surface-ids";

const mocks = vi.hoisted(() => ({
  role: "manager" as string,
  taskState: "working" as string,
  open: vi.fn(),
  close: vi.fn(),
  requestClose: vi.fn(),
}));

vi.mock("@beyo/auth", () => ({
  AuthRole: {
    Admin: "admin",
    Manager: "manager",
    Worker: "worker",
    Seller: "seller",
  },
  useRole: () => ({ hasRole: (value: string) => value === mocks.role }),
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({
    requestClose: mocks.requestClose,
    setTitle: vi.fn(),
    setActions: vi.fn(),
  }),
  useSurfaceProps: () => ({ taskId: "tsk_1", itemId: "itm_1" }),
}));

vi.mock("@beyo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/ui")>();
  return {
    ...actual,
    useSurfaceStore: {
      getState: () => ({ open: mocks.open, close: mocks.close }),
    },
  };
});

vi.mock("../actions/use-delete-task", () => ({
  useDeleteTask: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../api/use-get-task-query", () => ({
  useGetTaskQuery: () => ({
    data: { task: { client_id: "tsk_1", state: mocks.taskState } },
  }),
}));

describe("TaskDetailMenuSheetPage — force ready action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.role = "manager";
    mocks.taskState = "working";
  });

  it.each(["manager", "admin"])("is offered to a %s", (role) => {
    mocks.role = role;

    render(<TaskDetailMenuSheetPage />);

    expect(
      screen.getByTestId("task-actions-force-ready"),
    ).toBeInTheDocument();
  });

  it.each(["seller", "worker"])("is hidden from a %s", (role) => {
    mocks.role = role;

    render(<TaskDetailMenuSheetPage />);

    expect(
      screen.queryByTestId("task-actions-force-ready"),
    ).not.toBeInTheDocument();
  });

  // Each of these states is a 409 from the endpoint, so the row is not offered.
  it.each(["ready", "resolved", "failed", "cancelled"])(
    "is hidden when the task is %s",
    (state) => {
      mocks.taskState = state;

      render(<TaskDetailMenuSheetPage />);

      expect(
        screen.queryByTestId("task-actions-force-ready"),
      ).not.toBeInTheDocument();
    },
  );

  it("opens the force-ready slide and dismisses the menu underneath it", async () => {
    const user = userEvent.setup();
    render(<TaskDetailMenuSheetPage />);

    await user.click(screen.getByTestId("task-actions-force-ready"));

    expect(mocks.open).toHaveBeenCalledWith(FORCE_TASK_READY_SLIDE_SURFACE_ID, {
      taskId: "tsk_1",
    });
    expect(mocks.requestClose).toHaveBeenCalledTimes(1);
  });
});
