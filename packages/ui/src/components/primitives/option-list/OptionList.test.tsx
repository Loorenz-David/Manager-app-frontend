import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OptionList } from "./OptionList";

const options = [
  { value: "one", displayValue: "One" },
  { value: "two", displayValue: "Two", disabled: true },
] as const;

describe("OptionList", () => {
  afterEach(cleanup);

  it("renders accessible selected and disabled option states", () => {
    render(
      <OptionList
        options={options}
        activeValue="one"
        selectedValue="one"
        onSelect={vi.fn()}
        onActiveChange={vi.fn()}
        listboxId="options"
        getOptionId={(value) => `option-${value}`}
      />,
    );

    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "One" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("option", { name: "Two" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("does not select disabled options or mutate the supplied array", () => {
    const onSelect = vi.fn();
    const originalOptions = [...options];

    render(
      <OptionList
        options={options}
        activeValue={null}
        selectedValue={null}
        onSelect={onSelect}
        onActiveChange={vi.fn()}
        listboxId="options"
        getOptionId={(value) => `option-${value}`}
      />,
    );

    fireEvent.click(screen.getByRole("option", { name: "Two" }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(options).toEqual(originalOptions);
  });

  it("renders the empty state", () => {
    render(
      <OptionList
        options={[]}
        activeValue={null}
        selectedValue={null}
        onSelect={vi.fn()}
        onActiveChange={vi.fn()}
        listboxId="options"
        getOptionId={(value) => `option-${value}`}
        emptyMessage="Nothing matches"
      />,
    );

    expect(screen.getByText("Nothing matches")).toBeTruthy();
  });
});
