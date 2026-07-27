import type React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UpholsteryOrderingSlidePage } from "./UpholsteryOrderingSlidePage";

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

vi.mock("../providers/UpholsteryOrderingProvider", () => ({
  UpholsteryOrderingProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <>{children}</>,
  useUpholsteryOrderingContext: () => mocks.useController(),
}));

vi.mock("../components/UpholsteryOrderingHeader", () => ({
  UpholsteryOrderingHeader: ({
    onBack,
    onModeChange,
  }: {
    onBack: () => void;
    onModeChange: (mode: string) => void;
  }) => (
    <div data-testid="upholstery-ordering-header">
      <button type="button" onClick={onBack}>
        Back
      </button>
      <button type="button" onClick={() => onModeChange("orders")}>
        Orders
      </button>
    </div>
  ),
}));

vi.mock("../components/ShortageCard", () => ({
  ShortageCard: ({ card }: { card: { upholsteryId: string } }) => (
    <div>{card.upholsteryId}</div>
  ),
}));

vi.mock("../components/OrderCard", () => ({
  OrderCard: ({ card }: { card: { orderId: string } }) => (
    <div>{card.orderId}</div>
  ),
}));

vi.mock("../components/OrderingStates", () => ({
  OrderingEmptyState: () => <div>Empty</div>,
  OrderingErrorState: () => <div>Error</div>,
  OrderingSkeleton: () => <div>Loading</div>,
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

function makeController(mode: "needs" | "orders") {
  return {
    mode,
    modes: ["needs", "orders"] as const,
    setMode: vi.fn(),
    goToPreviousMode: vi.fn(),
    goToNextMode: vi.fn(),
    searchInput: "",
    setSearchInput: vi.fn(),
    shortageCards: [{ upholsteryId: "needs-upholstery" }],
    orderCards: [{ orderId: "active-order" }],
    needsCount: null,
    ordersCount: null,
    countsError: false,
    isInitialLoadingByMode: {
      needs: false,
      orders: false,
    },
    isErrorByMode: {
      needs: false,
      orders: false,
    },
    isFetchingMoreByMode: {
      needs: false,
      orders: false,
    },
    isPaginationErrorByMode: {
      needs: false,
      orders: false,
    },
    hasMoreByMode: {
      needs: false,
      orders: false,
    },
    retryByMode: {
      needs: vi.fn(),
      orders: vi.fn(),
    },
    loadMoreByMode: {
      needs: vi.fn(),
      orders: vi.fn(),
    },
    isBackgroundLoading: false,
    refetch: vi.fn(),
    close: vi.fn(),
    openShortageDetail: vi.fn(),
    openCreateOrder: vi.fn(),
    openOrderDetail: vi.fn(),
    openReceiveOrder: vi.fn(),
  };
}

function renderPage() {
  return render(
    <LazyMotion features={domAnimation}>
      <UpholsteryOrderingSlidePage />
    </LazyMotion>,
  );
}

describe("UpholsteryOrderingSlidePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useController.mockReturnValue(makeController("needs"));
  });

  afterEach(() => {
    cleanup();
  });

  it("renders each ordering mode as an independent pane below the header", async () => {
    const { rerender } = renderPage();

    const scrollBody = screen.getByTestId("upholstery-ordering-scroll");
    expect(scrollBody.parentElement).toContainElement(
      screen.getByTestId("upholstery-ordering-header"),
    );
    expect(
      screen.getByTestId("upholstery-ordering-body-needs"),
    ).toHaveTextContent("needs-upholstery");
    expect(screen.queryByText("active-order")).not.toBeInTheDocument();

    mocks.useController.mockReturnValue(makeController("orders"));
    rerender(
      <LazyMotion features={domAnimation}>
        <UpholsteryOrderingSlidePage />
      </LazyMotion>,
    );

    await waitFor(() =>
      expect(
        screen.getByTestId("upholstery-ordering-body-orders"),
      ).toHaveTextContent("active-order"),
    );
    await waitFor(() =>
      expect(screen.queryByText("needs-upholstery")).not.toBeInTheDocument(),
    );
  });

  it("routes the mode pills and back button through their navigation owners", async () => {
    const user = userEvent.setup();
    const controller = makeController("needs");
    mocks.useController.mockReturnValue(controller);
    renderPage();

    await user.click(screen.getByRole("button", { name: "Orders" }));
    expect(controller.setMode).toHaveBeenCalledWith("orders");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(mocks.requestClose).toHaveBeenCalledOnce();
    expect(controller.close).not.toHaveBeenCalled();
  });
});
