import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StepCategoryFilterSheetPage } from "./StepCategoryFilterSheetPage";

const mocks = vi.hoisted(() => ({
  props: vi.fn(),
  requestCloseMany: vi.fn(),
  onSave: vi.fn(),
  sectionQuery: vi.fn(),
  categoriesQuery: vi.fn(),
  setTitle: vi.fn(),
  setActions: vi.fn(),
}));

vi.mock("@beyo/hooks", () => ({
  useSurface: () => ({ requestCloseMany: mocks.requestCloseMany }),
  useSurfaceHeader: () => ({ setTitle: mocks.setTitle, setActions: mocks.setActions }),
  useSurfaceProps: () => mocks.props(),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.sectionQuery }));
vi.mock("@beyo/item-categories", () => ({
  useAllItemCategoryPickerOptionsQuery: mocks.categoriesQuery,
  ItemCategoryOptionsPicker: ({ categories, value, onValueChange }: {
    categories: Array<{ client_id: string; name: string }>;
    value: string[];
    onValueChange: (ids: string[]) => void;
  }) => <div>{categories.map((category) => (
    <button key={category.client_id} type="button" onClick={() => onValueChange(
      value.includes(category.client_id)
        ? value.filter((id) => id !== category.client_id)
        : [...value, category.client_id],
    )}>{category.name}</button>
  ))}</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.onSave.mockResolvedValue(undefined);
  mocks.props.mockReturnValue({
    workingSectionId: "section-1",
    selectedCategoryIds: ["wood-1"],
    onSave: mocks.onSave,
  });
  mocks.sectionQuery.mockReturnValue({
    data: { item_categories: [
      { client_id: "linked-wood", major_category: "wood" },
      { client_id: "linked-seat", major_category: "seat" },
    ] },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.categoriesQuery.mockReturnValue({
    data: [
      { client_id: "wood-1", name: "Wood one", major_category: "wood" },
      { client_id: "seat-1", name: "Seat one", major_category: "seat" },
      { client_id: "other-1", name: "Other one", major_category: "other" },
    ],
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });
});
afterEach(cleanup);

describe("StepCategoryFilterSheetPage", () => {
  it("stages categories from all linked major groups and saves before closing both sheets", async () => {
    const user = userEvent.setup();
    render(<StepCategoryFilterSheetPage />);
    expect(screen.getByRole("button", { name: "Wood one" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seat one" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Other one" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Seat one" }));
    expect(mocks.onSave).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(mocks.onSave).toHaveBeenCalledWith(["wood-1", "seat-1"]);
    await waitFor(() => expect(mocks.requestCloseMany).toHaveBeenCalledOnce());
    expect(mocks.requestCloseMany).toHaveBeenCalledWith([
      "task-step-category-filter-sheet", "task-step-state-filter-sheet",
    ]);
  });

  it("leaves the applied categories untouched when dismissed", async () => {
    const user = userEvent.setup();
    const view = render(<StepCategoryFilterSheetPage />);
    await user.click(screen.getByRole("button", { name: "Seat one" }));
    view.unmount();
    expect(mocks.onSave).not.toHaveBeenCalled();
    expect(mocks.requestCloseMany).not.toHaveBeenCalled();
  });

  it("clears the filter when the saved selection is empty", async () => {
    const user = userEvent.setup();
    render(<StepCategoryFilterSheetPage />);
    await user.click(screen.getByRole("button", { name: "Wood one" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(mocks.onSave).toHaveBeenCalledWith([]);
  });

  it("explains an unlinked section and allows clearing its previous selection", async () => {
    mocks.sectionQuery.mockReturnValue({
      data: { item_categories: [] },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();
    render(<StepCategoryFilterSheetPage />);
    expect(screen.getByText(/No item categories are linked/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(mocks.onSave).toHaveBeenCalledWith([]);
  });

  it("offers retry after a failed request", async () => {
    const refetch = vi.fn();
    mocks.categoriesQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch,
    });
    const user = userEvent.setup();
    render(<StepCategoryFilterSheetPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load categories.");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("shows progress and waits for the list to be ready before animated close", async () => {
    let finishSave: (() => void) | undefined;
    mocks.onSave.mockReturnValue(new Promise<void>((resolve) => { finishSave = resolve; }));
    const user = userEvent.setup();
    render(<StepCategoryFilterSheetPage />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(mocks.requestCloseMany).not.toHaveBeenCalled();
    finishSave?.();
    await waitFor(() => expect(mocks.requestCloseMany).toHaveBeenCalledOnce());
  });

  it("keeps the picker open and allows retry when applying fails", async () => {
    mocks.onSave.mockRejectedValueOnce(new Error("Network unavailable"));
    const user = userEvent.setup();
    render(<StepCategoryFilterSheetPage />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not apply the category filter.");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(mocks.requestCloseMany).not.toHaveBeenCalled();
  });
});
