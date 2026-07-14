import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../providers/KeyboardInsetProvider", () => ({
  useKeyboardInset: () => ({ isKeyboardOpen: false }),
}));

import { TagSelectInput } from "./TagSelectInput";
import type { SearchableSelectResult } from "../option-list";

const options = [
  { value: "apple", displayValue: "Apple" },
  { value: "apricot", displayValue: "Apricot" },
  { value: "banana", displayValue: "Banana" },
] as const;

function renderInput(
  onValueChange: (value: SearchableSelectResult<string>[]) => void,
  props: Partial<React.ComponentProps<typeof TagSelectInput>> = {},
) {
  return render(
    <TagSelectInput
      {...props}
      options={options}
      value={[]}
      onValueChange={onValueChange}
    />,
  );
}

describe("TagSelectInput", () => {
  afterEach(() => cleanup());

  it("filters options and adds a selected option as a tag", () => {
    const onValueChange = vi.fn();
    renderInput(onValueChange);

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ap" } });

    expect(screen.getByRole("option", { name: "Apple" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Banana" })).toBeNull();

    fireEvent.click(screen.getByRole("option", { name: "Apple" }));

    expect(onValueChange).toHaveBeenLastCalledWith([
      { type: "option", option: options[0] },
    ]);
  });

  it("does not show an option that is already a tag", () => {
    render(
      <TagSelectInput
        options={options}
        value={[{ type: "option", option: options[0] }]}
        onValueChange={vi.fn()}
      />,
    );

    fireEvent.focus(screen.getByRole("combobox"));

    expect(screen.queryByRole("option", { name: "Apple" })).toBeNull();
    expect(screen.getByRole("option", { name: "Apricot" })).toBeTruthy();
  });

  it("removes the last tag with Backspace when the query is empty", () => {
    const onValueChange = vi.fn();
    render(
      <TagSelectInput
        options={options}
        value={[
          { type: "option", option: options[0] },
          { type: "option", option: options[1] },
        ]}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Backspace" });

    expect(onValueChange).toHaveBeenLastCalledWith([
      { type: "option", option: options[0] },
    ]);
  });

  it("removes the clicked tag rather than only the last tag", () => {
    const onValueChange = vi.fn();
    render(
      <TagSelectInput
        data-testid="tags"
        options={options}
        value={[
          { type: "option", option: options[0] },
          { type: "option", option: options[1] },
        ]}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Apple" }));

    expect(onValueChange).toHaveBeenLastCalledWith([
      { type: "option", option: options[1] },
    ]);
  });

  it("commits freeform text on Enter when selection is not forced", () => {
    const onValueChange = vi.fn();
    renderInput(onValueChange);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: " Walnut " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onValueChange).toHaveBeenLastCalledWith([
      { type: "text", text: "Walnut" },
    ]);
  });

  it("does not commit freeform text when selection is forced", () => {
    const onValueChange = vi.fn();
    renderInput(onValueChange, { forceSelection: true });

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Walnut" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("selects the highlighted option with ArrowDown and Enter", () => {
    const onValueChange = vi.fn();
    renderInput(onValueChange);

    const input = screen.getByRole("combobox");
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onValueChange).toHaveBeenLastCalledWith([
      { type: "option", option: options[0] },
    ]);
  });
});
