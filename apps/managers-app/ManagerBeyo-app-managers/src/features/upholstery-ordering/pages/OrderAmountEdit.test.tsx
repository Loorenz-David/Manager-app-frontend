import type React from "react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { patchOrderAmount } from "../actions/use-update-upholstery-order-amount";
import {
  UPHOLSTERY_ORDER_ACTIONS_SHEET_ID,
  UPHOLSTERY_ORDER_AMOUNT_SHEET_ID,
} from "../surfaces";
import type { OrderCardViewModel, OrderRow, UpholsteryOrderState } from "../types";
import { OrderDetailSlidePage } from "./DetailSlidePages";
import { OrderActionsSheetPage } from "./OrderActionsSheetPage";
import { OrderAmountSheetPage } from "./OrderAmountSheetPage";

const mocks = vi.hoisted(() => ({
  props: {} as Record<string, unknown>,
  open: vi.fn(),
  close: vi.fn(),
  storeClose: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("@/hooks/use-surface", () => ({
  useSurface: () => ({ open: mocks.open, close: mocks.close }),
}));
vi.mock("@/hooks/use-surface-props", () => ({
  useSurfaceProps: () => mocks.props,
}));
vi.mock("@/hooks/use-surface-header", () => ({
  useSurfaceHeader: () => ({
    setHeaderHidden: vi.fn(),
    setTitle: vi.fn(),
    setActions: vi.fn(),
  }),
}));
vi.mock("@/providers/SurfaceProvider", () => ({
  useSurfaceStore: { getState: () => ({ close: mocks.storeClose }) },
}));
vi.mock("../actions/use-update-upholstery-order-amount", async () => {
  const actual = await vi.importActual<
    typeof import("../actions/use-update-upholstery-order-amount")
  >("../actions/use-update-upholstery-order-amount");
  return {
    ...actual,
    useUpdateUpholsteryOrderAmount: () => ({ mutate: mocks.mutate, isPending: false }),
  };
});
vi.mock("../controllers/use-detail-items.controller", () => ({
  useDetailItemsController: () => ({
    close: vi.fn(),
    selectedCount: 0,
    selectedTotalMeters: 0,
    selectedItemUpholsteryIds: [],
    selectedIds: new Set(),
    isBackgroundLoading: false,
    searchInput: "",
    setSearchInput: vi.fn(),
    refetch: vi.fn(),
    isInitialLoading: false,
    isError: false,
    cards: [],
    retry: vi.fn(),
    hasMore: false,
    isFetchingMore: false,
    loadMore: vi.fn(),
    openImageViewer: vi.fn(),
    openTaskDetail: vi.fn(),
    toggleSelection: vi.fn(),
  }),
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
    PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    BackendImage: () => <div />,
    FloatingKeyboardBar: ({
      renderControls,
    }: {
      renderControls: (args: {
        inputRef: React.RefObject<HTMLInputElement | null>;
        preventFocusSteal: () => void;
      }) => React.ReactNode;
    }) => <>{renderControls({ inputRef: { current: null }, preventFocusSteal: () => {} })}</>,
  };
});

function order(overrides: Partial<OrderCardViewModel> = {}): OrderCardViewModel {
  return {
    orderId: "uor_1",
    upholsteryId: "uph_1",
    name: "Tyg Studio CS 9901 Papyrus",
    code: "1032506",
    imageUrl: null,
    orderAmountMeters: 4.5,
    orderAmountLabel: "4.5 m",
    receivedAmountMeters: 2,
    receivedAmountLabel: "2 m",
    remainingReceivableMeters: 2.5,
    remainingReceivableLabel: "2.5 m",
    remainingReceivableValueLabel: "2.5",
    expectedReceiveAt: null,
    receivedAt: null,
    dateLabel: null,
    state: "partially_received",
    stateLabel: "Partially received",
    ...overrides,
  };
}

function renderWithClient(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  mocks.props = {};
  mocks.open.mockReset();
  mocks.close.mockReset();
  mocks.storeClose.mockReset();
  mocks.mutate.mockReset();
});
afterEach(cleanup);

describe("order detail ⋮ menu", () => {
  it.each<UpholsteryOrderState>(["ordered", "partially_received", "pending"])(
    "is shown for an editable %s order and opens the actions sheet",
    async (state) => {
      const current = order({ state });
      mocks.props = { order: current };
      renderWithClient(<OrderDetailSlidePage />);

      await userEvent.click(screen.getByRole("button", { name: "Order actions" }));

      expect(mocks.open).toHaveBeenCalledWith(UPHOLSTERY_ORDER_ACTIONS_SHEET_ID, {
        order: current,
      });
    },
  );

  it.each<UpholsteryOrderState>(["received", "cancelled", "failed"])(
    "is hidden for a closed %s order",
    (state) => {
      mocks.props = { order: order({ state }) };
      renderWithClient(<OrderDetailSlidePage />);

      expect(screen.queryByRole("button", { name: "Order actions" })).toBeNull();
    },
  );
});

describe("OrderActionsSheetPage", () => {
  it("swaps itself for the amount sheet", async () => {
    const current = order();
    mocks.props = { order: current };
    render(<OrderActionsSheetPage />);

    await userEvent.click(screen.getByRole("button", { name: "Change ordered amount" }));

    expect(mocks.close).toHaveBeenCalledWith(UPHOLSTERY_ORDER_ACTIONS_SHEET_ID);
    expect(mocks.open).toHaveBeenCalledWith(UPHOLSTERY_ORDER_AMOUNT_SHEET_ID, {
      order: current,
    });
  });
});

describe("OrderAmountSheetPage", () => {
  it("is prefilled and cannot save the unchanged amount", () => {
    mocks.props = { order: order() };
    render(<OrderAmountSheetPage />);

    expect(screen.getByTestId("upholstery-order-amount-input")).toHaveValue("4.500");
    expect(screen.getByTestId("upholstery-order-amount-save")).toBeDisabled();
  });

  it("refuses less than what was received", async () => {
    mocks.props = { order: order() };
    render(<OrderAmountSheetPage />);
    const input = screen.getByTestId("upholstery-order-amount-input");

    await userEvent.clear(input);
    await userEvent.type(input, "1.5");

    expect(screen.getByText("Can't be less than the 2.000 m already received.")).toBeInTheDocument();
    expect(screen.getByTestId("upholstery-order-amount-save")).toBeDisabled();
  });

  it("saves a decrease as a 3-dp string, warns about it, and closes on success", async () => {
    mocks.props = { order: order() };
    mocks.mutate.mockImplementation((_input, options) => options.onSuccess());
    render(<OrderAmountSheetPage />);
    const input = screen.getByTestId("upholstery-order-amount-input");

    await userEvent.clear(input);
    await userEvent.type(input, "3,25");
    expect(screen.getByTestId("upholstery-order-amount-decrease-hint")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("upholstery-order-amount-save"));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { client_id: "uor_1", order_amount_meters: "3.250" },
      expect.any(Object),
    );
    expect(mocks.storeClose).toHaveBeenCalledWith(UPHOLSTERY_ORDER_AMOUNT_SHEET_ID);
  });
});

describe("patchOrderAmount", () => {
  it("updates only the edited order row", () => {
    const row = (client_id: string): OrderRow => ({
      client_id,
      upholstery_id: "uph_1",
      upholstery_name: null,
      upholstery_code: null,
      upholstery_image_url: null,
      order_amount_meters: 4.5,
      received_amount_meters: 2,
      expected_receive_at: null,
      received_at: null,
      state: "partially_received",
      supplier_id: null,
    });
    const page = { items: [row("uor_1"), row("uor_2")], limit: 50, offset: 0, hasMore: false };

    const patched = patchOrderAmount(page, {
      client_id: "uor_1",
      state: "received",
      order_amount_meters: 2,
      received_amount_meters: 2,
    });

    expect(patched?.items[0]).toMatchObject({ order_amount_meters: 2, state: "received" });
    expect(patched?.items[1]).toEqual(row("uor_2"));
  });
});
