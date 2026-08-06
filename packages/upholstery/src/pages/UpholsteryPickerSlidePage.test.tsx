import type React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UpholsteryPickerSlidePage } from "./UpholsteryPickerSlidePage";

const requestCloseMock = vi.fn();
const useSurfacePropsMock = vi.fn();
const useUpholsteryPickerControllerMock = vi.fn();

// framer-motion is used for real here: the body is a SlideStack, whose pane
// switching and drag machinery depend on the actual motion primitives. The
// apps load LazyMotion with domAnimation at their root, so mirror that.
function renderPage(): { unmount: () => void } {
  return render(
    <LazyMotion features={domAnimation}>
      <UpholsteryPickerSlidePage />
    </LazyMotion>,
  );
}

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
    useScrollHide: () => ({
      scrollRef: { current: null },
      hideProgressContainerRef: { current: null },
    }),
  };
});

vi.mock("@beyo/hooks", async () => {
  const actual =
    await vi.importActual<typeof import("@beyo/hooks")>("@beyo/hooks");

  return {
    ...actual,
    useSurfaceHeader: () => ({
      setHeaderHidden: vi.fn(),
      requestClose: requestCloseMock,
    }),
    useSurfaceProps: () => useSurfacePropsMock(),
  };
});

vi.mock("../controllers/use-upholstery-picker.controller", () => ({
  useUpholsteryPickerController: () => useUpholsteryPickerControllerMock(),
}));

vi.mock("../components/UpholsteryPickerHeader", () => ({
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
    filterOptions: [
      { value: "favorite" as const, label: "Favorites" },
      { value: "in_stock" as const, label: "In Stock" },
      { value: "out_of_stock" as const, label: "Out of Stock" },
    ],
    isLoading: false,
    isLoadingByFilter: {
      favorite: false,
      in_stock: false,
      out_of_stock: false,
    },
    isSelectionPending: false,
    goToPreviousFilter: vi.fn(),
    goToNextFilter: vi.fn(),
    onFilterChange: vi.fn(),
    openProviderFilterSheet: vi.fn(),
    refetch: vi.fn(),
    selectUpholstery: vi.fn(async (clientId: string) => clientId),
    selectingClientId: null,
    selectionError: null,
    toggleFavorite: vi.fn(),
    upholsteries: TEST_UPHOLSTERIES,
    upholsteriesByFilter: {
      favorite: TEST_UPHOLSTERIES,
      in_stock: [],
      out_of_stock: [],
    },
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

  afterEach(() => {
    cleanup();
  });

  it("stages selection with card taps and only shows Save for a staged choice", async () => {
    const user = userEvent.setup();

    renderPage();

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

    renderPage();

    expect(
      screen.queryByRole("button", { name: "Save selection" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Birka" }));
    expect(
      screen.getByRole("button", { name: "Save selection" }),
    ).toBeVisible();
  });

  it("saves only from the bottom action and commits alongside the close", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const controller = makeController();
    controller.selectUpholstery = vi.fn(async () => "uph_b_saved");

    useSurfacePropsMock.mockReturnValue({
      currentClientId: null,
      onSelect,
    });
    useUpholsteryPickerControllerMock.mockReturnValue(controller);

    renderPage();

    await user.click(screen.getByRole("button", { name: "Birka" }));
    expect(controller.selectUpholstery).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Save selection" }));

    expect(controller.selectUpholstery).toHaveBeenCalledWith("uph_b");
    // Close first, then commit, so the row animates out of the list beneath
    // while this slide closes.
    expect(requestCloseMock).toHaveBeenCalled();
    expect(requestCloseMock.mock.invocationCallOrder[0]).toBeLessThan(
      onSelect.mock.invocationCallOrder[0]!,
    );
    expect(onSelect).toHaveBeenCalledWith("uph_b_saved");
  });

  it("offers removal when the current selection is cleared and commits null", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const controller = makeController();

    useSurfacePropsMock.mockReturnValue({
      currentClientId: "uph_a",
      onSelect,
    });
    useUpholsteryPickerControllerMock.mockReturnValue(controller);

    renderPage();

    await user.click(screen.getByRole("button", { name: "Alba" }));

    const removeButton = screen.getByRole("button", {
      name: "Remove upholstery",
    });
    expect(removeButton).toBeVisible();

    await user.click(removeButton);

    // Nothing to resolve — a removal needs no upholstery record created.
    expect(controller.selectUpholstery).not.toHaveBeenCalled();
    expect(requestCloseMock).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("does not fire onSelect when closed without saving", async () => {
    const onSelect = vi.fn();
    useSurfacePropsMock.mockReturnValue({
      currentClientId: null,
      onSelect,
    });

    const { unmount } = renderPage();

    unmount();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("scrolls the header with the body and does not render a close footer", () => {
    renderPage();

    expect(screen.getByTestId("upholstery-list-scroll")).toContainElement(
      screen.getByTestId("upholstery-picker-header"),
    );
    expect(
      screen.queryByRole("button", { name: "Close & Back" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("upholstery-picker-bottom-actions"),
    ).not.toBeInTheDocument();
  });
});
