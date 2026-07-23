import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AlignmentPicker } from "./AlignmentPicker";
import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { SliderFieldRow } from "./SliderFieldRow";

afterEach(cleanup);

describe("text styling primitives", () => {
  it("selects alignment through an accessible segmented picker", () => {
    const onChange = vi.fn();
    render(<AlignmentPicker value="left" onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "Align right" }));
    expect(onChange).toHaveBeenCalledWith("right");
  });

  it("supports presets, valid hex values, and an explicit no-color choice", () => {
    const onChange = vi.fn();
    render(
      <ColorSwatchPicker
        value="#FFFFFF"
        onChange={onChange}
        allowNone
        ariaLabel="Background"
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "No color" }));
    expect(onChange).toHaveBeenCalledWith(undefined);
    fireEvent.change(screen.getByLabelText("Background hex value"), {
      target: { value: "#123abc" },
    });
    expect(onChange).toHaveBeenLastCalledWith("#123ABC");
  });

  it("reports numeric slider changes without domain-specific behavior", () => {
    const onChange = vi.fn();
    render(
      <SliderFieldRow
        label="Radius"
        value={8}
        min={0}
        max={48}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Radius"), { target: { value: "20" } });
    expect(onChange).toHaveBeenCalledWith(20);
  });
});
