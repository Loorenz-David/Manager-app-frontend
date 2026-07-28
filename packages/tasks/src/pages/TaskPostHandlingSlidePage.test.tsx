import type React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskPostHandlingSlidePage } from "./TaskPostHandlingSlidePage";

const mocks = vi.hoisted(() => ({
  requestClose: vi.fn(),
  useController: vi.fn(),
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({
    requestClose: mocks.requestClose,
    setHeaderHidden: vi.fn(),
  }),
  useSurfaceProps: () => ({}),
}));

vi.mock("../api/use-post-handling-counts-query", () => ({
  usePostHandlingCountsQuery: () => ({ data: null }),
}));

vi.mock("../controllers/use-task-post-handling.controller", () => ({
  useTaskPostHandlingController: () => mocks.useController(),
}));

vi.mock("../components/PostHandlingBottomAction", () => ({
  PostHandlingBottomAction: () => <div />,
}));

vi.mock("../components/TaskListCard", () => ({
  TaskListCard: () => <div />,
}));

vi.mock("../components/TaskPostHandlingHeader", () => ({
  TaskPostHandlingHeader: ({
    onTabChange,
  }: {
    onTabChange: (tab: string) => void;
  }) => (
    <div data-testid="task-post-handling-header">
      <button type="button" onClick={() => onTabChange("pending")}>
        Pending
      </button>
      <button type="button" onClick={() => onTabChange("filled")}>
        Filled
      </button>
    </div>
  ),
}));

vi.mock("@beyo/ui", async () => {
  const actual = await vi.importActual<typeof import("@beyo/ui")>("@beyo/ui");
  const ActualSlideStack = actual.SlideStack;
  return {
    ...actual,
    AnimatedRemovalGroup: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    AnimatedRemovalItem: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    PullToRefresh: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SlideStack: (
      props: React.ComponentProps<typeof ActualSlideStack>,
    ) => (
      <div
        data-back-enabled={props.onBack ? "true" : "false"}
        data-testid="task-post-handling-stack"
      >
        <ActualSlideStack {...props} />
      </div>
    ),
  };
});

function makePane() {
  return {
    tasks: [],
    hasMore: false,
    loadMore: vi.fn(),
    isInitialLoading: false,
    isFetchingMore: false,
    isError: false,
  };
}

function makeController(activeTab: "pending" | "filled") {
  return {
    activeTab,
    tabs: ["pending", "filled"] as const,
    setTab: vi.fn(),
    goToPreviousTab: vi.fn(),
    goToNextTab: vi.fn(),
    completedFilterCount: 0,
    q: "",
    setQ: vi.fn(),
    isPillsDisabled: false,
    mode: "carousel" as const,
    pendingPane: makePane(),
    filledPane: makePane(),
    singlePane: makePane(),
    isBackgroundLoading: false,
    refetch: vi.fn(),
    completingTaskId: null,
    closeSurface: vi.fn(),
    openFilterSheet: vi.fn(),
    openTaskDetail: vi.fn(),
    openTaskActions: vi.fn(),
    openImageViewer: vi.fn(),
    openPendingWarning: vi.fn(),
    handleComplete: vi.fn(),
    resolveActiveInstance: vi.fn(() => null),
  };
}

function renderPage() {
  return render(
    <LazyMotion features={domAnimation}>
      <TaskPostHandlingSlidePage />
    </LazyMotion>,
  );
}

describe("TaskPostHandlingSlidePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useController.mockReturnValue(makeController("pending"));
  });

  afterEach(() => {
    cleanup();
  });

  it("releases the back gesture only when the pending pane is confirmed empty", () => {
    const emptyController = makeController("filled");
    emptyController.q = "no matches";
    mocks.useController.mockReturnValue(emptyController);
    const { rerender } = renderPage();

    expect(screen.getByTestId("task-post-handling-stack")).toHaveAttribute(
      "data-back-enabled",
      "false",
    );

    const loadingController = makeController("filled");
    loadingController.pendingPane.isInitialLoading = true;
    mocks.useController.mockReturnValue(loadingController);
    rerender(
      <LazyMotion features={domAnimation}>
        <TaskPostHandlingSlidePage />
      </LazyMotion>,
    );
    expect(screen.getByTestId("task-post-handling-stack")).toHaveAttribute(
      "data-back-enabled",
      "true",
    );

    const errorController = makeController("filled");
    errorController.pendingPane.isError = true;
    mocks.useController.mockReturnValue(errorController);
    rerender(
      <LazyMotion features={domAnimation}>
        <TaskPostHandlingSlidePage />
      </LazyMotion>,
    );
    expect(screen.getByTestId("task-post-handling-stack")).toHaveAttribute(
      "data-back-enabled",
      "true",
    );

    const populatedController = makeController("filled");
    populatedController.pendingPane.tasks = [
      {
        item_images: [],
        primary_item: null,
        task: {
          client_id: "pending-task",
          post_handling: [],
          task_type: "delivery",
          state: "ready",
          return_source: null,
          ready_by_at: null,
          assortment: null,
        },
      },
    ];
    mocks.useController.mockReturnValue(populatedController);
    rerender(
      <LazyMotion features={domAnimation}>
        <TaskPostHandlingSlidePage />
      </LazyMotion>,
    );
    expect(screen.getByTestId("task-post-handling-stack")).toHaveAttribute(
      "data-back-enabled",
      "true",
    );
  });

  it("keeps the pending pill selectable when that pane is empty", async () => {
    const user = userEvent.setup();
    const controller = makeController("filled");
    mocks.useController.mockReturnValue(controller);
    renderPage();

    await user.click(screen.getByRole("button", { name: "Pending" }));

    expect(controller.setTab).toHaveBeenCalledWith("pending");
  });
});
