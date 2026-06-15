import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { DISABLED_BASE } from "../shared";
import { SearchBar } from "./SearchBar";

describe("SearchBar", () => {
  it("emits controlled string changes through onChange", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    function ControlledHarness(): React.JSX.Element {
      const [value, setValue] = useState("");

      return (
        <SearchBar
          data-testid="sb"
          value={value}
          onChange={(nextValue) => {
            setValue(nextValue);
            handleChange(nextValue);
          }}
          onFilterPress={vi.fn()}
          onSortPress={vi.fn()}
        />
      );
    }

    render(<ControlledHarness />);

    await user.type(screen.getByTestId("sb-input"), "desk");

    expect(handleChange).toHaveBeenNthCalledWith(1, "d");
    expect(handleChange).toHaveBeenNthCalledWith(4, "desk");
    expect(screen.getByTestId("sb-input")).toHaveValue("desk");
  });

  it("calls onSortPress when the sort button is clicked", async () => {
    const user = userEvent.setup();
    const handleSortPress = vi.fn();

    render(
      <SearchBar
        value=""
        onChange={vi.fn()}
        onFilterPress={vi.fn()}
        onSortPress={handleSortPress}
      />,
    );

    await user.click(screen.getByLabelText("Sort"));

    expect(handleSortPress).toHaveBeenCalledTimes(1);
  });

  it("calls onFilterPress when the filter button is clicked", async () => {
    const user = userEvent.setup();
    const handleFilterPress = vi.fn();

    render(
      <SearchBar
        value=""
        onChange={vi.fn()}
        onFilterPress={handleFilterPress}
        onSortPress={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Filter"));

    expect(handleFilterPress).toHaveBeenCalledTimes(1);
  });

  it("renders the active filter badge and active styling when filters are applied", () => {
    render(
      <SearchBar
        activeFilterCount={3}
        value=""
        onChange={vi.fn()}
        onFilterPress={vi.fn()}
        onSortPress={vi.fn()}
      />,
    );

    expect(screen.getByText("3")).toBeVisible();
    expect(screen.getByLabelText("Filter")).toHaveClass("text-primary");
  });

  it("hides the filter badge and keeps inactive styling when the count is zero or unset", () => {
    const { rerender } = render(
      <SearchBar
        value=""
        onChange={vi.fn()}
        onFilterPress={vi.fn()}
        onSortPress={vi.fn()}
      />,
    );

    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Filter")).not.toHaveClass("text-primary");

    rerender(
      <SearchBar
        activeFilterCount={0}
        value=""
        onChange={vi.fn()}
        onFilterPress={vi.fn()}
        onSortPress={vi.fn()}
      />,
    );

    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Filter")).not.toHaveClass("text-primary");
  });

  it("disables the input and both action buttons when disabled", () => {
    render(
      <SearchBar
        data-testid="sb"
        disabled
        value=""
        onChange={vi.fn()}
        onFilterPress={vi.fn()}
        onSortPress={vi.fn()}
      />,
    );

    expect(screen.getByTestId("sb")).toHaveClass(DISABLED_BASE);
    expect(screen.getByRole("searchbox")).toBeDisabled();
    expect(screen.getByLabelText("Sort")).toBeDisabled();
    expect(screen.getByLabelText("Filter")).toBeDisabled();
  });

  it("forwards the input ref, scopes test ids, and swaps action buttons for a loading spinner", () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <SearchBar
        data-testid="sb"
        isLoading
        ref={ref}
        value="alpha"
        onChange={vi.fn()}
        onFilterPress={vi.fn()}
        onSortPress={vi.fn()}
      />,
    );

    expect(ref.current).toBe(screen.getByTestId("sb-input"));
    expect(screen.getByTestId("sb")).toBeInTheDocument();
    expect(screen.getByTestId("sb-input")).toHaveValue("alpha");
    expect(screen.getByTestId("sb-input")).toBeEnabled();
    expect(screen.queryByTestId("sb-sort")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sb-filter")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sort")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Filter")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("hides sort and filter actions when handlers are omitted", () => {
    render(<SearchBar data-testid="sb" value="" onChange={vi.fn()} />);

    expect(screen.queryByTestId("sb-sort")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sb-filter")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sort")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Filter")).not.toBeInTheDocument();
  });
});
