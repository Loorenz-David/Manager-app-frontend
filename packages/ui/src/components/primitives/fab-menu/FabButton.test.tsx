import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FabButton } from "./FabButton";

afterEach(cleanup);

describe("FabButton", () => {
  it("performs its action on the first tap, with nothing to expand", async () => {
    const onPress = vi.fn();
    render(
      <LazyMotion features={domAnimation}>
        <FabButton
          dataTestId="fab"
          icon={null}
          label="Done"
          onPress={onPress}
        />
      </LazyMotion>,
    );

    await userEvent.click(screen.getByTestId("fab"));

    expect(onPress).toHaveBeenCalledTimes(1);
    // No menu: the button never announces an expanded state.
    expect(screen.getByTestId("fab")).not.toHaveAttribute("aria-expanded");
  });

  it("is named for screen readers even though it is icon-only", () => {
    render(
      <LazyMotion features={domAnimation}>
        <FabButton icon={null} label="Done reorganising" onPress={vi.fn()} />
      </LazyMotion>,
    );

    expect(
      screen.getByRole("button", { name: "Done reorganising" }),
    ).toBeInTheDocument();
  });

  it("does not fire while disabled", async () => {
    const onPress = vi.fn();
    render(
      <LazyMotion features={domAnimation}>
        <FabButton
          dataTestId="fab"
          disabled
          icon={null}
          label="Done"
          onPress={onPress}
        />
      </LazyMotion>,
    );

    await userEvent.click(screen.getByTestId("fab"));

    expect(onPress).not.toHaveBeenCalled();
  });
});
