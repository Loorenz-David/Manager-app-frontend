import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "manager" as string,
  openTaskActions: vi.fn(),
  openTaskDetail: vi.fn(),
}));

vi.mock("@beyo/auth", () => ({
  AuthRole: { Admin: "admin", Manager: "manager", Worker: "worker", Seller: "seller" },
  useRole: () => ({ hasRole: (value: string) => value === mocks.role }),
}));

vi.mock("@beyo/item-economics", () => ({
  TaskBudgetSignalFooter: () => <div />,
  buildTaskBudgetSignalMap: () => new Map(),
  useTaskBudgetSignalsQuery: () => ({ data: undefined }),
}));

vi.mock("@beyo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/ui")>();
  return {
    ...actual,
    PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

vi.mock("@beyo/upholstery", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/upholstery")>()),
  UpholsteryGroupHeaderCard: () => <div />,
}));
vi.mock("./TasksHeader", () => ({ TasksHeader: () => <div data-testid="tasks-header" /> }));

const card = {
  taskId: "tsk_1",
  firstImage: null,
  item: null,
  task: {
    display_date: null,
    task_type: "internal",
    state: "working",
    return_source: null,
    ready_by_at: null,
    is_overdue: false,
  },
};

vi.mock("../providers/TasksViewProvider", () => ({
  useTasksViewContext: () => ({
    cards: [card],
    renderRows: [{ kind: "row", row: card }],
    isLoading: false,
    hasMore: false,
    isFetchingMore: false,
    activeFilterCount: 0,
    q: "",
    taskStates: [],
    taskType: "all",
    refetch: vi.fn(),
    loadMore: vi.fn(),
    setQ: vi.fn(),
    setTaskStates: vi.fn(),
    setTaskType: vi.fn(),
    openFilterSheet: vi.fn(),
    openSortSheet: vi.fn(),
    openTaskActions: mocks.openTaskActions,
    openTaskDetail: mocks.openTaskDetail,
    openImageViewer: vi.fn(),
    toggleFold: vi.fn(),
  }),
}));

import { TasksView } from "./TasksView";

describe("TasksView — card ⋮ by role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the card ⋮ for a manager", () => {
    mocks.role = "manager";
    render(<TasksView />);

    expect(screen.getByTestId("tasks-card-actions-tsk_1")).toBeInTheDocument();
  });

  it("renders no card ⋮ for a worker, while the body still opens the detail", () => {
    mocks.role = "worker";
    render(<TasksView />);

    expect(screen.queryByTestId("tasks-card-actions-tsk_1")).not.toBeInTheDocument();
    screen.getByTestId("tasks-card-body-tsk_1").click();
    expect(mocks.openTaskDetail).toHaveBeenCalledWith("tsk_1");
  });
});
