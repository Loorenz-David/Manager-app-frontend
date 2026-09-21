import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FabMenu, fabMenuActionOffset } from "./FabMenu";
import type { FabMenuAction } from "./fab-menu.types";

afterEach(cleanup);

function renderMenu(actions: FabMenuAction[]): void {
  render(
    <LazyMotion features={domAnimation}>
      <FabMenu actions={actions} dataTestId="test-fab" />
    </LazyMotion>,
  );
}

describe("fabMenuActionOffset", () => {
  it("reproduces the three-action arc of the existing task-creation FAB", () => {
    expect(fabMenuActionOffset(0, 3)).toEqual({ x: -72, y: 0 });
    expect(fabMenuActionOffset(1, 3)).toEqual({ x: -51, y: -51 });
    expect(fabMenuActionOffset(2, 3)).toEqual({ x: 0, y: -72 });
  });

  it("places a lone action straight up rather than on a diagonal", () => {
    expect(fabMenuActionOffset(0, 1)).toEqual({ x: 0, y: -72 });
  });
});

describe("FabMenu", () => {
  it("keeps the actions unreachable until the trigger is pressed", async () => {
    const onPress = vi.fn();
    renderMenu([
      { id: "reorganise", label: "Reorganise", icon: null, onPress },
    ]);

    const action = screen.getByTestId("test-fab-action-reorganise");
    expect(action).toHaveClass("pointer-events-none");
    expect(screen.getByTestId("test-fab")).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    await userEvent.click(screen.getByTestId("test-fab"));

    expect(action).not.toHaveClass("pointer-events-none");
    expect(screen.getByTestId("test-fab")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("fires the action and closes the menu", async () => {
    const onPress = vi.fn();
    renderMenu([
      { id: "reorganise", label: "Reorganise", icon: null, onPress },
    ]);

    await userEvent.click(screen.getByTestId("test-fab"));
    await userEvent.click(screen.getByLabelText("Reorganise"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("test-fab")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("reports open state changes to the caller", async () => {
    const onOpenChange = vi.fn();
    render(
      <LazyMotion features={domAnimation}>
        <FabMenu
          actions={[
            { id: "a", label: "A", icon: null, onPress: vi.fn() },
          ]}
          dataTestId="test-fab"
          onOpenChange={onOpenChange}
        />
      </LazyMotion>,
    );

    await userEvent.click(screen.getByTestId("test-fab"));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await userEvent.click(screen.getByTestId("test-fab"));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
