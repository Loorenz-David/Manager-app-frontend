import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpholsteryPickerSlidePage } from "./UpholsteryPickerSlidePage";

const requestCloseMock = vi.fn();
const useSurfacePropsMock = vi.fn();
const useUpholsteryPickerControllerMock = vi.fn();

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@beyo/ui", async () => {
  const actual = await vi.importActual<typeof import("@beyo/ui")>("@beyo/ui");

  return {
    ...actual,
    PullToRefresh: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    useScrollVisibility: () => ({
      scrollRef: { current: null },
      isHidden: false,
    }),
  };
});

vi.mock("@/hooks/use-surface-header", () => ({
  useSurfaceHeader: () => ({
    setHeaderHidden: vi.fn(),
    requestClose: requestCloseMock,
  }),
}));

vi.mock("@/hooks/use-surface-props", () => ({
  useSurfaceProps: () => useSurfacePropsMock(),
}));

vi.mock("@beyo/upholstery", async () => {
  const actual = await vi.importActual<typeof import("@beyo/upholstery")>(
    "@beyo/upholstery",
  );

  return {
    ...actual,
    useUpholsteryPickerController: () => useUpholsteryPickerControllerMock(),
  };
});

vi.mock("@/features/upholstery/components/UpholsteryPickerHeader", () => ({
  UpholsteryPickerHeader: () => <div data-testid="upholstery-picker-header" />,
}));

const TEST_UPHOLSTERIES = [
  {
    client_id: "uph_a",
    name: "Alba",
    code: "AL-1",
    image_url: null,
    favorite: false,
    list_order: 1,
    current_stored_amount_meters: "2.5",
    inventory_condition: "available" as const,
    upholstery_category: null,
    supplier_name: null,
    origin: "database" as const,
  },
  {
    client_id: "uph_b",
    name: "Birka",
    code: "BI-2",
    image_url: null,
    favorite: false,
    list_order: 2,
    current_stored_amount_meters: "1",
    inventory_condition: "available" as const,
    upholstery_category: null,
    supplier_name: null,
    origin: "database" as const,
  },
];

function makeController() {
  return {
    activeFilter: "favorite" as const,
    activeProviderFilterCount: 0,
    direction: 1 as const,
    isLoading: false,
    isSelectionPending: false,
    onFilterChange: vi.fn(),
    openProviderFilterSheet: vi.fn(),
    refetch: vi.fn(),
    selectUpholstery: vi.fn(async (clientId: string) => clientId),
    selectingClientId: null,
    selectionError: null,
    toggleFavorite: vi.fn(),
    upholsteries: TEST_UPHOLSTERIES,
  };
}

describe("UpholsteryPickerSlidePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSurfacePropsMock.mockReturnValue({
      currentClientId: null,
      onSelect: vi.fn(),
    });
    useUpholsteryPickerControllerMock.mockReturnValue(makeController());
  });

  it("stages selection with card taps and only shows Save for a staged choice", async () => {
    const user = userEvent.setup();

    render(<UpholsteryPickerSlidePage />);

    expect(
      screen.queryByRole("button", { name: "Save selection" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Alba" }));
    expect(
      screen.getByRole("button", { name: "Save selection" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Alba" }));
    expect(
      screen.queryByRole("button", { name: "Save selection" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Birka" }));
    expect(
      screen.getByRole("button", { name: "Save selection" }),
    ).toBeVisible();
  });

  it("keeps the initial current upholstery selected without showing Save until it changes", async () => {
    const user = userEvent.setup();

    useSurfacePropsMock.mockReturnValue({
      currentClientId: "uph_a",
      onSelect: vi.fn(),
    });

    render(<UpholsteryPickerSlidePage />);

    expect(
      screen.queryByRole("button", { name: "Save selection" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Birka" }));
    expect(
      screen.getByRole("button", { name: "Save selection" }),
    ).toBeVisible();
  });

  it("saves only from the bottom action and closes after selection resolves", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const controller = makeController();
    controller.selectUpholstery = vi.fn(async () => "uph_b_saved");

    useSurfacePropsMock.mockReturnValue({
      currentClientId: null,
      onSelect,
    });
    useUpholsteryPickerControllerMock.mockReturnValue(controller);

    render(<UpholsteryPickerSlidePage />);

    await user.click(screen.getByRole("button", { name: "Birka" }));
    expect(controller.selectUpholstery).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Save selection" }));

    expect(controller.selectUpholstery).toHaveBeenCalledWith("uph_b");
    expect(onSelect).toHaveBeenCalledWith("uph_b_saved");
    expect(requestCloseMock).toHaveBeenCalled();
  });
});
