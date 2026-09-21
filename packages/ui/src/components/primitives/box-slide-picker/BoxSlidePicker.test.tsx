import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BoxSlidePicker } from "./BoxSlidePicker";
import type { BoxSlidePickerOption } from "./types";

afterEach(cleanup);

const OPTIONS: BoxSlidePickerOption<"unset" | "high">[] = [
  { value: "unset", label: "Unset", testId: "opt-unset", quiet: true },
  { value: "high", label: "High", testId: "opt-high" },
];

function renderPicker(value: "unset" | "high") {
  const onValueChange = vi.fn();

  render(
    <BoxSlidePicker
      dataTestId="picker"
      onValueChange={onValueChange}
      options={OPTIONS}
      value={value}
    />,
  );

  return onValueChange;
}

describe("BoxSlidePicker quiet option", () => {
  it("hides the active fill while a quiet option is the selected one", () => {
    renderPicker("unset");

    expect(screen.getByTestId("picker-indicator")).toHaveAttribute(
      "data-quiet",
      "",
    );
  });

  it("still announces the quiet option as checked", () => {
    renderPicker("unset");

    expect(screen.getByTestId("opt-unset")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("paints a quiet selected option with the unselected text treatment", () => {
    renderPicker("unset");

    expect(screen.getByTestId("opt-unset")).toHaveClass("text-muted-foreground");
    expect(screen.getByTestId("opt-unset")).not.toHaveClass("text-foreground");
  });

  it("shows the fill again for an ordinary selected option", () => {
    renderPicker("high");

    const indicator = screen.getByTestId("picker-indicator");
    expect(indicator).not.toHaveAttribute("data-quiet");
    expect(screen.getByTestId("opt-high")).toHaveClass("text-foreground");
  });

  it("reports a selection change", async () => {
    const onValueChange = renderPicker("unset");

    await userEvent.click(screen.getByTestId("opt-high"));

    expect(onValueChange).toHaveBeenCalledWith("high");
  });
});
