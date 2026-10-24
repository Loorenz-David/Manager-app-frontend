import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskFilterSheetPage } from "./TaskFilterSheetPage";

const mocks = vi.hoisted(() => ({ props: vi.fn(), onChange: vi.fn() }));
vi.mock("@beyo/hooks", () => ({ useSurfaceProps: () => mocks.props() }));
vi.mock("../components/filter-fields/ItemPositionFilterField", () => ({
  ItemPositionFilterField: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange(" 3 ")}>Set wagon</button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.props.mockReturnValue({
    selectedTaskType: "all",
    selectedItemPosition: "",
    groupByUpholstery: false,
    onChange: mocks.onChange,
  });
});
afterEach(cleanup);

describe("TaskFilterSheetPage", () => {
  it("uses exclusive drawers and applies task and other filters immediately", async () => {
    const user = userEvent.setup();
    render(<TaskFilterSheetPage />);
    expect(screen.getByTestId("task-filter-sheet")).not.toHaveClass("px-4");
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Task" })).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "Task" }));
    expect(screen.getByTestId("task-filter-task-card")).toHaveClass("w-full", "px-4");
    expect(screen.getByTestId("task-filter-type-return").querySelector("svg")).toBeInTheDocument();
    await user.click(screen.getByTestId("task-filter-type-return"));
    expect(mocks.onChange).toHaveBeenLastCalledWith({ taskType: "return" });
    expect(screen.getByTestId("task-filter-task-drawer-count")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Other" }));
    expect(screen.getByRole("button", { name: /^Task/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("task-filter-other-card")).toHaveClass("w-full", "px-4");
    await user.click(screen.getByRole("button", { name: "Set wagon" }));
    expect(mocks.onChange).toHaveBeenLastCalledWith({ itemPosition: "3" });
    await user.click(screen.getByTestId("task-filter-group-upholstery"));
    expect(mocks.onChange).toHaveBeenLastCalledWith({ groupByUpholstery: true });
    expect(screen.getByTestId("task-filter-other-drawer-count")).toHaveTextContent("2");
    // Sellers and workers never get the deleted toggle.
    expect(screen.queryByTestId("task-filter-show-deleted")).not.toBeInTheDocument();
  });

  it("offers Show deleted, with its icon, when the app allows it", async () => {
    mocks.props.mockReturnValue({
      selectedTaskType: "all",
      selectedItemPosition: "",
      groupByUpholstery: false,
      canShowDeleted: true,
      showDeleted: false,
      onChange: mocks.onChange,
    });
    const user = userEvent.setup();
    render(<TaskFilterSheetPage />);

    await user.click(screen.getByRole("button", { name: "Other" }));
    const toggle = screen.getByTestId("task-filter-show-deleted");
    expect(toggle.querySelector("svg")).toBeInTheDocument();

    await user.click(toggle);
    expect(mocks.onChange).toHaveBeenLastCalledWith({ showDeleted: true });
    expect(screen.getByTestId("task-filter-other-drawer-count")).toHaveTextContent("1");

    await user.click(toggle);
    expect(mocks.onChange).toHaveBeenLastCalledWith({ showDeleted: false });
  });
});
