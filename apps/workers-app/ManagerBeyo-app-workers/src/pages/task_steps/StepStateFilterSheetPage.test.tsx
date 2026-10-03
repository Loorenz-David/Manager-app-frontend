import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StepStateFilterSheetPage } from "./StepStateFilterSheetPage";

const mocks = vi.hoisted(() => ({
  props: vi.fn(),
  open: vi.fn(),
  onChange: vi.fn(),
  setTitle: vi.fn(),
  setActions: vi.fn(),
}));

vi.mock("@beyo/hooks", () => ({
  useSurface: () => ({ open: mocks.open }),
  useSurfaceHeader: () => ({ setTitle: mocks.setTitle, setActions: mocks.setActions }),
  useSurfaceProps: () => mocks.props(),
}));
vi.mock("@beyo/tasks", () => ({
  ItemPositionFilterField: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange("W-1")}>Set wagon</button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.props.mockReturnValue({
    workingSectionId: "section-1",
    selectedStates: ["pending", "working", "paused", "ended_shift"],
    selectedReadinessStatuses: ["ready"],
    selectedTaskTypes: [],
    selectedCategoryIds: [],
    selectedItemPosition: "",
    selectedGroupByUpholstery: false,
    onChange: mocks.onChange,
  });
});
afterEach(cleanup);

describe("StepStateFilterSheetPage", () => {
  it("applies each interaction immediately and opens the staged category picker", async () => {
    const user = userEvent.setup();
    render(<StepStateFilterSheetPage />);
    expect(screen.getByTestId("step-state-filter-sheet")).not.toHaveClass("px-4");
    for (const card of ["step-filter-state-card", "step-filter-task-card", "step-filter-other-card"]) {
      expect(screen.getByTestId(card)).toHaveClass("w-full", "px-4");
    }
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
    expect(mocks.setTitle).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^State/ })).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: /^State/ }));
    await user.click(screen.getByTestId("filter-option-completed"));
    expect(mocks.onChange).toHaveBeenCalledWith({ states: ["completed"] });
    expect(screen.getByTestId("step-filter-state-drawer-count")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Task" }));
    expect(screen.getByRole("button", { name: /^State/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /^Task/ })).toHaveAttribute("aria-expanded", "true");
    for (const type of ["return", "pre-order", "internal"]) {
      const option = screen.getByTestId(`filter-task-type-${type}`);
      expect(option.querySelector("svg")).toBeInTheDocument();
      expect(option.firstElementChild).toHaveClass("flex-row");
    }
    await user.click(screen.getByTestId("filter-task-type-return"));
    await user.click(screen.getByTestId("filter-task-type-internal"));
    expect(mocks.onChange).toHaveBeenLastCalledWith({ taskTypes: ["return", "internal"] });
    await user.click(screen.getByTestId("step-category-filter-trigger"));
    const openedProps = mocks.open.mock.calls.at(-1)?.[1] as { onSave: (ids: string[]) => void };
    act(() => openedProps.onSave(["category-1", "category-2"]));
    expect(mocks.onChange).toHaveBeenLastCalledWith({ categoryIds: ["category-1", "category-2"] });
    expect(screen.getByTestId("step-filter-task-drawer-count")).toHaveTextContent("4");
    expect(screen.getByTestId("step-category-filter-trigger")).toHaveClass("bg-card");

    await user.click(screen.getByRole("button", { name: "Other" }));
    expect(screen.getByRole("button", { name: /^Task/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /^Other/ })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Set wagon" }));
    expect(mocks.onChange).toHaveBeenLastCalledWith({ itemPosition: "W-1" });
    await user.click(screen.getByTestId("step-filter-group-upholstery"));
    expect(mocks.onChange).toHaveBeenLastCalledWith({ groupByUpholstery: true });
    expect(screen.getByTestId("step-filter-other-drawer-count")).toHaveTextContent("2");
  });
});
