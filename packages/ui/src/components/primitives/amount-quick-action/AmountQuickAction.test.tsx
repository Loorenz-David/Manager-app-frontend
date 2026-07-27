import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, describe, expect, it, vi } from "vitest";

import { KeyboardInsetProvider } from "../../../providers/KeyboardInsetProvider";
import { KeyboardFloatingCard } from "../floating-keyboard-bar";
import { AmountQuickAction } from "./AmountQuickAction";
import type { AmountQuickActionProps } from "./AmountQuickAction";

afterEach(cleanup);

type HarnessProps = Partial<AmountQuickActionProps> & {
  initialValue?: number | null;
};

/**
 * Mirrors how a card owns the bar: value and editing state live above it, and
 * editing docks the whole thing through KeyboardFloatingCard.
 */
function Harness({
  initialValue = 3,
  onAction = vi.fn(),
  onValueChange,
  ...props
}: HarnessProps): React.JSX.Element {
  const [value, setValue] = useState<number | null>(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <LazyMotion features={domAnimation}>
      <KeyboardInsetProvider>
        <KeyboardFloatingCard isFloating={isEditing}>
          {(inputRef) => (
            <AmountQuickAction
              actionLabel="Order"
              inputRef={inputRef}
              isEditing={isEditing}
              label="Order"
              onAction={onAction}
              onEditingChange={setIsEditing}
              onValueChange={(next) => {
                setValue(next);
                onValueChange?.(next);
              }}
              value={value}
              {...props}
            />
          )}
        </KeyboardFloatingCard>
      </KeyboardInsetProvider>
    </LazyMotion>
  );
}

describe("AmountQuickAction", () => {
  it("steps the value up and down, clamping at min", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Harness initialValue={1} onValueChange={onValueChange} step={0.5} />,
    );

    await user.click(screen.getByRole("button", { name: "Increase order" }));
    expect(onValueChange).toHaveBeenLastCalledWith(1.5);

    await user.click(screen.getByRole("button", { name: "Decrease order" }));
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });

  it("disables decrement at the minimum and submits the current value", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(<Harness initialValue={0} onAction={onAction} />);

    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Decrease order" })
        .disabled,
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Order" }));
    expect(onAction).toHaveBeenCalledWith(0);
  });

  it("renders a placeholder and blocks the action when the value is unset", () => {
    render(<Harness initialValue={null} />);

    expect(screen.getByText("——")).toBeDefined();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Order" }).disabled,
    ).toBe(true);
  });

  it("opens a focused numeric field when the value is pressed", async () => {
    const user = userEvent.setup();

    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Edit order" }));

    const input = screen.getAllByRole<HTMLInputElement>("textbox", {
      name: "Order amount",
    })[0]!;
    expect(input.value).toBe("3");
    expect(input.inputMode).toBe("decimal");
    // Focused on mount so the tap raises the on-screen keyboard.
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Order amount",
    );
  });

  it("commits a manually typed amount, accepting the comma separator", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Harness onValueChange={onValueChange} />);

    await user.click(screen.getByRole("button", { name: "Edit order" }));
    const input = screen.getAllByRole("textbox", { name: "Order amount" })[0]!;
    await user.clear(input);
    await user.type(input, "12,5{Enter}");

    expect(onValueChange).toHaveBeenLastCalledWith(12.5);
    // Editing ends, so the plain value is shown again.
    expect(screen.getByRole("button", { name: "Edit order" })).toBeDefined();
  });

  it("hands the just-typed amount to the action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(<Harness onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Edit order" }));
    const input = screen.getAllByRole("textbox", { name: "Order amount" })[0]!;
    await user.clear(input);
    await user.type(input, "7");
    await user.click(screen.getAllByRole("button", { name: "Order" })[0]!);

    expect(onAction).toHaveBeenCalledWith(7);
  });

  it("shows the pending label and locks the controls while saving", () => {
    render(<Harness isPending pendingLabel="Ordering..." />);

    expect(screen.getByText("Ordering...")).toBeDefined();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Increase order" })
        .disabled,
    ).toBe(true);
  });

  it("clamps the stepper and manual entry to max", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Harness
        initialValue={2}
        max={3}
        onValueChange={onValueChange}
        step={1}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Increase order" }));
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    // At the ceiling the stepper stops rather than overshooting it.
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Increase order" })
        .disabled,
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Edit order" }));
    const input = screen.getAllByRole("textbox", { name: "Order amount" })[0]!;
    await user.clear(input);
    await user.type(input, "99{Enter}");

    expect(onValueChange).toHaveBeenLastCalledWith(3);
  });

  it("renders the green tone for receiving", () => {
    render(
      <Harness
        actionLabel="Receive"
        label="Received"
        testId="receive-bar"
        tone="green"
      />,
    );

    expect(screen.getByTestId("receive-bar").className).toContain(
      "bg-[#eaf8ef]",
    );
    expect(screen.getByRole("button", { name: "Receive" }).className).toContain(
      "bg-[#123a22]",
    );
  });

  it("keeps the amount named for assistive tech without drawing a label", () => {
    render(<Harness actionLabel="Receive" label="Received" tone="green" />);

    // The action button already says what the bar does.
    expect(screen.queryByText("Received")).toBeNull();
    expect(screen.getByRole("button", { name: "Edit received" })).toBeDefined();
  });
});
