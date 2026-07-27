import type React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PendingUpholsterySlidePage } from "./PendingUpholsterySlidePage";

const mocks = vi.hoisted(() => ({
  requestClose: vi.fn(),
  useController: vi.fn(),
}));

vi.mock("@/hooks/use-surface-header", () => ({
  useSurfaceHeader: () => ({
    requestClose: mocks.requestClose,
    setHeaderHidden: vi.fn(),
  }),
}));

vi.mock("../providers/PendingUpholsteryProvider", () => ({
  PendingUpholsteryProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <>{children}</>,
  usePendingUpholsteryContext: () => mocks.useController(),
}));

vi.mock("../components/PendingUpholsteryHeader", () => ({
  PendingUpholsteryHeader: ({
    onBack,
    onFiltersChange,
  }: {
    onBack: () => void;
    onFiltersChange: (filter: string) => void;
  }) => (
    <div data-testid="pending-upholstery-header">
      <button type="button" onClick={onBack}>
        Back
      </button>
      <button
        type="button"
        onClick={() => onFiltersChange("missing_quantity")}
      >
        Quantity
      </button>
    </div>
  ),
}));

vi.mock("../components/PendingUpholsteryCard", () => ({
  PendingUpholsteryCard: ({ card }: { card: { taskId: string } }) => (
    <div>{card.taskId}</div>
  ),
}));

vi.mock("../components/PendingUpholsteryEmptyState", () => ({
  PendingUpholsteryEmptyState: () => <div>Empty</div>,
}));

vi.mock("../components/PendingUpholsteryErrorState", () => ({
  PendingUpholsteryErrorState: () => <div>Error</div>,
}));

vi.mock("../components/PendingUpholsterySkeleton", () => ({
  PendingUpholsterySkeleton: () => <div>Loading</div>,
}));

vi.mock("@beyo/ui", async () => {
  const actual = await vi.importActual<typeof import("@beyo/ui")>("@beyo/ui");
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
  };
});

function makeController(activeFilter: "missing_selection" | "missing_quantity") {
  const selectionCard = { taskId: "selection-task" };
  const quantityCard = { taskId: "quantity-task" };

  return {
    activeFilter,
    filters: ["missing_selection", "missing_quantity"] as const,
    missingSelection: activeFilter === "missing_selection",
    missingQuantity: activeFilter === "missing_quantity",
    setFilters: vi.fn(),
    goToPreviousFilter: vi.fn(),
    goToNextFilter: vi.fn(),
    searchInput: "",
    setSearchInput: vi.fn(),
    isInitialLoadingByFilter: {
      missing_selection: false,
      missing_quantity: false,
    },
    isErrorByFilter: {
      missing_selection: false,
      missing_quantity: false,
    },
    isFetchingMoreByFilter: {
      missing_selection: false,
      missing_quantity: false,
    },
    isPaginationErrorByFilter: {
      missing_selection: false,
      missing_quantity: false,
    },
    hasMoreByFilter: {
      missing_selection: false,
      missing_quantity: false,
    },
    cardsByFilter: {
      missing_selection: [selectionCard],
      missing_quantity: [quantityCard],
    },
    retryByFilter: {
      missing_selection: vi.fn(),
      missing_quantity: vi.fn(),
    },
    loadMoreByFilter: {
      missing_selection: vi.fn(),
      missing_quantity: vi.fn(),
    },
    counts: null,
    countsError: false,
    isBackgroundLoading: false,
    refetch: vi.fn(),
    openAmountSheet: vi.fn(),
    openUpholsteryPicker: vi.fn(),
    openTaskActions: vi.fn(),
    openTaskDetail: vi.fn(),
    openImageViewer: vi.fn(),
    close: vi.fn(),
  };
}

function renderPage() {
  return render(
    <LazyMotion features={domAnimation}>
      <PendingUpholsterySlidePage />
    </LazyMotion>,
  );
}

describe("PendingUpholsterySlidePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useController.mockReturnValue(makeController("missing_selection"));
  });

  afterEach(() => {
    cleanup();
  });

  it("renders each filter as an independent pane under the shared header", async () => {
    const selectionController = makeController("missing_selection");
    mocks.useController.mockReturnValue(selectionController);
    const { rerender } = renderPage();

    const scrollBody = screen.getByTestId("pending-upholstery-scroll");
    expect(scrollBody.parentElement).toContainElement(
      screen.getByTestId("pending-upholstery-header"),
    );
    expect(
      screen.getByTestId("pending-upholstery-body-missing_selection"),
    ).toHaveTextContent("selection-task");
    expect(screen.queryByText("quantity-task")).not.toBeInTheDocument();

    const quantityController = makeController("missing_quantity");
    mocks.useController.mockReturnValue(quantityController);
    rerender(
      <LazyMotion features={domAnimation}>
        <PendingUpholsterySlidePage />
      </LazyMotion>,
    );

    await waitFor(() =>
      expect(
        screen.getByTestId("pending-upholstery-body-missing_quantity"),
      ).toHaveTextContent("quantity-task"),
    );
    await waitFor(() =>
      expect(screen.queryByText("selection-task")).not.toBeInTheDocument(),
    );
  });

  it("routes filter pills and back through the stack/surface owners", async () => {
    const user = userEvent.setup();
    const controller = makeController("missing_selection");
    mocks.useController.mockReturnValue(controller);
    renderPage();

    await user.click(screen.getByRole("button", { name: "Quantity" }));
    expect(controller.setFilters).toHaveBeenCalledWith("missing_quantity");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(mocks.requestClose).toHaveBeenCalledOnce();
    expect(controller.close).not.toHaveBeenCalled();
  });
});
