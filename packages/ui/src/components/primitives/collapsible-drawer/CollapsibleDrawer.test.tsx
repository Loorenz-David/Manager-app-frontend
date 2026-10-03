import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CollapsibleDrawer } from "./CollapsibleDrawer";

afterEach(cleanup);

function Example(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <CollapsibleDrawer
      title="Task"
      open={open}
      onOpenChange={setOpen}
      count={2}
      className="text-amber-900"
      triggerClassName="min-h-16"
      countClassName="bg-amber-500 text-black"
      contentClassName="pb-8"
      data-testid="drawer"
    >
      <button type="button">Inner action</button>
    </CollapsibleDrawer>
  );
}

describe("CollapsibleDrawer", () => {
  it("animates a controlled panel, announces its count, and disables closed content", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: /Task/ });
    const drawer = screen.getByTestId("drawer");
    const panel = drawer.querySelector("div[aria-hidden]");
    expect(drawer).toHaveClass("w-full", "border-b", "border-border/50", "bg-transparent", "text-amber-900");
    expect(drawer).not.toHaveClass("rounded-xl", "bg-card");
    expect(trigger).toHaveClass("min-h-16");
    expect(trigger).not.toHaveClass("px-4");
    expect(panel?.firstElementChild?.firstElementChild).toHaveClass("pb-8");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    const pill = screen.getByTestId("drawer-count");
    expect(pill).toHaveTextContent("2");
    expect(pill).toHaveClass("bg-amber-500", "text-black");
    expect(pill.parentElement?.lastElementChild?.tagName.toLowerCase()).toBe("svg");
    expect(panel).toHaveAttribute("inert");
    expect(panel).toHaveClass("grid-rows-[0fr]");
    expect(panel).toHaveClass("motion-reduce:transition-none");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("inert");
    expect(panel).toHaveClass("grid-rows-[1fr]");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("inert");
  });

  it("uses the primary pill colors by default", () => {
    render(<CollapsibleDrawer title="State" open={false} onOpenChange={() => {}} count={1}>Content</CollapsibleDrawer>);
    expect(screen.getByLabelText("1 active filters")).toHaveClass("bg-primary", "text-card");
  });
});
