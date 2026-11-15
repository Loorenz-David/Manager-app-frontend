import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Timeline, TimelineItem } from "./Timeline";

afterEach(cleanup);

describe("Timeline", () => {
  it("renders a button item that fires onClick and a div item without one", () => {
    const onClick = vi.fn();

    render(
      <Timeline data-testid="timeline">
        <TimelineItem data-testid="first" emphasis onClick={onClick}>
          First
        </TimelineItem>
        <TimelineItem data-testid="second" isLast>
          Second
        </TimelineItem>
      </Timeline>,
    );

    const first = screen.getByTestId("first");
    const second = screen.getByTestId("second");

    expect(first.tagName).toBe("BUTTON");
    expect(first.getAttribute("type")).toBe("button");
    expect(second.tagName).toBe("DIV");

    fireEvent.click(first);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("emphasises the dot and stops the rail line on the last item", () => {
    render(
      <Timeline>
        <TimelineItem data-testid="first" emphasis>
          First
        </TimelineItem>
        <TimelineItem data-testid="last" isLast>
          Last
        </TimelineItem>
      </Timeline>,
    );

    const firstDot = screen
      .getByTestId("first")
      .querySelector("[data-timeline-dot]");
    const lastDot = screen
      .getByTestId("last")
      .querySelector("[data-timeline-dot]");

    expect(firstDot?.className).toContain("bg-primary");
    expect(lastDot?.className).not.toContain("bg-primary");

    const firstRail = screen
      .getByTestId("first")
      .querySelector("[data-timeline-rail]");
    const lastRail = screen
      .getByTestId("last")
      .querySelector("[data-timeline-rail]");

    // Dot plus line vs dot only.
    expect(firstRail?.children).toHaveLength(2);
    expect(lastRail?.children).toHaveLength(1);
  });

  it("renders nested items as siblings with an indented dot", () => {
    render(
      <Timeline>
        <TimelineItem data-testid="parent" onClick={() => undefined}>
          Parent
        </TimelineItem>
        <TimelineItem data-testid="child" nested onClick={() => undefined}>
          Child
        </TimelineItem>
      </Timeline>,
    );

    const parent = screen.getByTestId("parent");
    const child = screen.getByTestId("child");

    expect(parent.contains(child)).toBe(false);
    expect(child.hasAttribute("data-nested")).toBe(true);
    // The nested rail carries the line only; the dot sits beside the content.
    expect(
      child.querySelector("[data-timeline-rail] [data-timeline-dot]"),
    ).toBeNull();
    expect(child.querySelector("[data-timeline-dot]")).not.toBeNull();
  });

  it("honours an explicit as", () => {
    render(
      <>
        <TimelineItem as="div" data-testid="plain" onClick={() => undefined}>
          Plain
        </TimelineItem>
        <TimelineItem as="button" data-testid="pressable">
          Pressable
        </TimelineItem>
      </>,
    );

    expect(screen.getByTestId("plain").tagName).toBe("DIV");
    expect(screen.getByTestId("pressable").tagName).toBe("BUTTON");
  });
});
