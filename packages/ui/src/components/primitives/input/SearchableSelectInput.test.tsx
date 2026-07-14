import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const keyboardState = vi.hoisted(() => ({ isOpen: false }));

vi.mock("../../../providers/KeyboardInsetProvider", () => ({
  useKeyboardInset: () => ({ isKeyboardOpen: keyboardState.isOpen }),
}));

import {
  SearchableSelectInput,
} from "./SearchableSelectInput";
import type { SearchableSelectResult } from "../option-list";

const options = [
  { value: "apple", displayValue: "Apple" },
  { value: "apricot", displayValue: "Apricot" },
  { value: "banana", displayValue: "Banana" },
] as const;

function renderInput(
  onValueChange: (value: SearchableSelectResult<string> | null) => void,
  props: Partial<React.ComponentProps<typeof SearchableSelectInput>> = {},
) {
  return render(
    <SearchableSelectInput
      {...props}
      options={options}
      value={null}
      onValueChange={onValueChange}
    />,
  );
}

describe("SearchableSelectInput", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    keyboardState.isOpen = false;
    vi.restoreAllMocks();
  });

  it("filters locally and commits a pointer selection", () => {
    const onValueChange = vi.fn();
    renderInput(onValueChange);

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ap" } });

    expect(screen.getByRole("option", { name: "Apple" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Banana" })).toBeNull();

    fireEvent.click(screen.getByRole("option", { name: "Apple" }));

    expect(onValueChange).toHaveBeenLastCalledWith({
      type: "option",
      option: options[0],
    });
  });

  it("supports keyboard navigation and selection", () => {
    const onValueChange = vi.fn();
    renderInput(onValueChange);

    const input = screen.getByRole("combobox");
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onValueChange).toHaveBeenLastCalledWith({
      type: "option",
      option: options[0],
    });
  });

  it("invalidates edits and re-notifies the prior value on force-selection blur", async () => {
    const committed = { type: "option", option: options[0] } as const;
    const onValueChange = vi.fn();
    render(
      <SearchableSelectInput
        options={options}
        value={committed}
        onValueChange={onValueChange}
        forceSelection
      />,
    );

    const input = screen.getByRole("combobox");
    input.focus();
    fireEvent.change(input, { target: { value: "unknown" } });

    expect(onValueChange).toHaveBeenLastCalledWith(null);
    input.blur();

    await waitFor(() => {
      expect(onValueChange).toHaveBeenLastCalledWith(committed);
    });
  });

  it("does not duplicate listbox or option ids when the panel is mounted", async () => {
    const view = render(
      <SearchableSelectInput
        id="searchable-select-test"
        options={options}
        value={null}
        onValueChange={vi.fn()}
      />,
    );

    screen.getByRole("combobox").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <SearchableSelectInput
        id="searchable-select-test"
        options={options}
        value={null}
        onValueChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        document.querySelectorAll("#searchable-select-test-listbox"),
      ).toHaveLength(1);
    });

    expect(
      document.querySelectorAll(
        "#searchable-select-test-listbox-option-apple",
      ),
    ).toHaveLength(1);
    expect(screen.getAllByRole("option")).toHaveLength(options.length);
  });

  it("contains overscroll within the floating options list", async () => {
    const view = renderInput(vi.fn());

    screen.getByRole("combobox").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <SearchableSelectInput
        options={options}
        value={null}
        onValueChange={vi.fn()}
      />,
    );

    const listbox = await screen.findByRole("listbox");

    expect(listbox.parentElement?.className).toContain("overscroll-y-contain");
  });

  it("prevents form submission for an unmatched force-selection Enter", () => {
    const onSubmit = vi.fn();
    const onValueChange = vi.fn();

    render(
      <form onSubmit={onSubmit}>
        <SearchableSelectInput
          id="force-selection-test"
          options={options}
          value={null}
          onValueChange={onValueChange}
          forceSelection
        />
      </form>,
    );

    const input = screen.getByRole("combobox");
    input.focus();
    fireEvent.change(input, { target: { value: "not-a-wood" } });
    onValueChange.mockClear();

    const enterEvent = createEvent.keyDown(input, { key: "Enter" });
    fireEvent(input, enterEvent);

    expect(enterEvent.defaultPrevented).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("treats a panel dismissal without blur as a force-selection blur", async () => {
    const committed = { type: "option", option: options[0] } as const;
    const onValueChange = vi.fn();
    const view = render(
      <SearchableSelectInput
        options={options}
        value={committed}
        onValueChange={onValueChange}
        forceSelection
      />,
    );

    screen.getByRole("combobox").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <SearchableSelectInput
        options={options}
        value={committed}
        onValueChange={onValueChange}
        forceSelection
      />,
    );

    const floatingInput = await screen.findByRole("combobox");
    fireEvent.change(floatingInput, { target: { value: "Unknown" } });
    expect(onValueChange).toHaveBeenLastCalledWith(null);

    keyboardState.isOpen = false;
    view.rerender(
      <SearchableSelectInput
        options={options}
        value={committed}
        onValueChange={onValueChange}
        forceSelection
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(onValueChange).toHaveBeenLastCalledWith(committed);
    });
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("commits free text when a non-force-selection panel is dismissed", async () => {
    const onValueChange = vi.fn();
    const view = renderInput(onValueChange);

    screen.getByRole("combobox").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <SearchableSelectInput
        options={options}
        value={null}
        onValueChange={onValueChange}
      />,
    );

    const floatingInput = await screen.findByRole("combobox");
    fireEvent.change(floatingInput, { target: { value: "Walnut" } });

    keyboardState.isOpen = false;
    view.rerender(
      <SearchableSelectInput
        options={options}
        value={null}
        onValueChange={onValueChange}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(onValueChange).toHaveBeenLastCalledWith({
        type: "text",
        text: "Walnut",
      });
    });
  });

  it("does not notify twice when selection closes the panel before dismissal", async () => {
    const onValueChange = vi.fn();
    const view = renderInput(onValueChange);

    screen.getByRole("combobox").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <SearchableSelectInput
        options={options}
        value={null}
        onValueChange={onValueChange}
      />,
    );

    await screen.findByRole("combobox");
    fireEvent.click(screen.getByRole("option", { name: "Apple" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);

    keyboardState.isOpen = false;
    view.rerender(
      <SearchableSelectInput
        options={options}
        value={null}
        onValueChange={onValueChange}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("does not notify twice when Escape closes the panel before dismissal", async () => {
    const committed = { type: "option", option: options[0] } as const;
    const onValueChange = vi.fn();
    const view = render(
      <SearchableSelectInput
        options={options}
        value={committed}
        onValueChange={onValueChange}
      />,
    );

    screen.getByRole("combobox").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <SearchableSelectInput
        options={options}
        value={committed}
        onValueChange={onValueChange}
      />,
    );

    const floatingInput = await screen.findByRole("combobox");
    fireEvent.keyDown(floatingInput, { key: "Escape" });
    expect(onValueChange).not.toHaveBeenCalled();

    keyboardState.isOpen = false;
    view.rerender(
      <SearchableSelectInput
        options={options}
        value={committed}
        onValueChange={onValueChange}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
