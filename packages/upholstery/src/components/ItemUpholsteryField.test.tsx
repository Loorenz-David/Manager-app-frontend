import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { upholsteryKeys } from "../api/upholstery-keys";

const openMock = vi.fn();
const useUpholsteryPickerOptionQueryMock = vi.fn();

vi.mock("@beyo/ui", async () => {
  const actual = await vi.importActual<typeof import("@beyo/ui")>("@beyo/ui");

  return {
    ...actual,
    useSurfaceStore: {
      ...actual.useSurfaceStore,
      getState: () => ({ open: openMock }),
    },
  };
});

vi.mock("../api/use-upholstery-picker-option", () => ({
  useUpholsteryPickerOptionQuery: (...args: unknown[]) =>
    useUpholsteryPickerOptionQueryMock(...args),
}));

import { ItemUpholsteryField } from "./ItemUpholsteryField";

const STORE_OPTION = {
  client_id: "uph_linen_natural",
  name: "Natural Linen",
  code: "LN-001",
  image_url: "https://example.com/linen.jpg",
  favorite: false,
  list_order: 1,
  current_stored_amount_meters: "12.5",
  inventory_condition: "available" as const,
  upholstery_category: null,
  origin: "database" as const,
};

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithQueryClient(
  ui: React.ReactElement,
  {
    pickerOptions = [STORE_OPTION],
  }: { pickerOptions?: (typeof STORE_OPTION)[] } = {},
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(upholsteryKeys.pickerList(), {
    upholsteries: pickerOptions,
    has_more: false,
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ItemUpholsteryField", () => {
  beforeEach(() => {
    openMock.mockClear();
    useUpholsteryPickerOptionQueryMock.mockReturnValue({
      data: null,
      isPending: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the empty state with placeholder text and chevron icon", () => {
    renderWithQueryClient(
      <ItemUpholsteryField value={null} onChange={vi.fn()} />,
    );

    expect(screen.getByText("Select upholstery")).toBeVisible();
    expect(screen.getByRole("button")).toBeVisible();
    expect(screen.getByRole("button").querySelector("svg")).toBeTruthy();
  });

  it("renders the selected upholstery image, name, and code from the store", () => {
    renderWithQueryClient(
      <ItemUpholsteryField value="uph_linen_natural" onChange={vi.fn()} />,
    );

    expect(screen.getByAltText("Natural Linen")).toHaveClass("rounded-full");
    expect(screen.getByText("Natural Linen")).toBeVisible();
    expect(screen.getByText("LN-001")).toBeVisible();
  });

  it("renders the fetched upholstery when the store is empty", () => {
    useUpholsteryPickerOptionQueryMock.mockReturnValue({
      data: {
        ...STORE_OPTION,
        client_id: "uph_fetched",
        name: "Fetched Velvet",
        code: "FV-009",
      },
      isPending: false,
    });

    renderWithQueryClient(
      <ItemUpholsteryField value="uph_fetched" onChange={vi.fn()} />,
      { pickerOptions: [] },
    );

    expect(screen.getByText("Fetched Velvet")).toBeVisible();
    expect(screen.getByText("FV-009")).toBeVisible();
  });

  it("shows a loading label while the edit-mode fallback fetch is pending", () => {
    useUpholsteryPickerOptionQueryMock.mockReturnValue({
      data: null,
      isPending: true,
    });

    renderWithQueryClient(
      <ItemUpholsteryField value="missing-upholstery-id" onChange={vi.fn()} />,
      { pickerOptions: [] },
    );

    expect(screen.getByText("Loading upholstery...")).toBeVisible();
  });

  it("renders the fallback id text when no matching upholstery exists", () => {
    renderWithQueryClient(
      <ItemUpholsteryField value="missing-upholstery-id" onChange={vi.fn()} />,
      { pickerOptions: [] },
    );

    expect(screen.getByText("missing-upholstery-id")).toBeVisible();
  });

  it("renders the requirement state as a corner badge", () => {
    renderWithQueryClient(
      <ItemUpholsteryField
        value="uph_linen_natural"
        onChange={vi.fn()}
        requirementState="needs_ordering"
      />,
    );

    expect(screen.getByText("needs ordering")).toBeVisible();
  });

  it("opens the upholstery picker surface with the current selection and callbacks", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    renderWithQueryClient(
      <ItemUpholsteryField value="uph_linen_natural" onChange={handleChange} />,
    );

    await user.click(screen.getByRole("button"));

    expect(openMock).toHaveBeenCalledWith("upholstery-picker", {
      currentClientId: "uph_linen_natural",
      onSelect: handleChange,
    });
  });
});
