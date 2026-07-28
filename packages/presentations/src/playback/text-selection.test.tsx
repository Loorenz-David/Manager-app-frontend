import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlayerTapZones } from "../components/player/PlayerAffordances";
import { findTextElementAtPoint, selectTextAtPoint } from "./text-selection";

afterEach(cleanup);

function textStage(rects: { left: number; top: number; right: number; bottom: number }[]) {
  const root = document.createElement("div");
  for (const [index, rect] of rects.entries()) {
    const node = document.createElement("div");
    node.setAttribute("data-element-type", "text");
    node.textContent = `block ${index}`;
    node.getBoundingClientRect = () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      toJSON: () => ({}),
    }) as DOMRect;
    root.append(node);
  }
  document.body.append(root);
  return root;
}

describe("long-press text selection", () => {
  it("hit-tests rendered rects rather than trusting elementFromPoint", () => {
    // elementFromPoint would return the tap overlay, which covers everything.
    const root = textStage([
      { left: 0, top: 0, right: 100, bottom: 50 },
      { left: 0, top: 60, right: 100, bottom: 110 },
    ]);
    expect(findTextElementAtPoint(root, 50, 25)?.textContent).toBe("block 0");
    expect(findTextElementAtPoint(root, 50, 80)?.textContent).toBe("block 1");
    expect(findTextElementAtPoint(root, 50, 55)).toBeNull();
  });

  it("takes the last match, which is the block painted on top", () => {
    const root = textStage([
      { left: 0, top: 0, right: 100, bottom: 100 },
      { left: 0, top: 0, right: 100, bottom: 100 },
    ]);
    expect(findTextElementAtPoint(root, 50, 50)?.textContent).toBe("block 1");
  });

  it("selects the whole block under the point, and reports a miss", () => {
    const root = textStage([{ left: 0, top: 0, right: 100, bottom: 50 }]);
    expect(selectTextAtPoint(root, 50, 25)).toBe(true);
    expect(window.getSelection()?.toString()).toBe("block 0");
    expect(selectTextAtPoint(root, 500, 500)).toBe(false);
  });
});

describe("tap zone long press", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const zones = (overrides: Partial<React.ComponentProps<typeof PlayerTapZones>> = {}) => {
    const props = {
      onPrev: vi.fn(),
      onNext: vi.fn(),
      onTogglePause: vi.fn(),
      onLongPress: vi.fn(),
      longPressMs: 400,
      ...overrides,
    };
    render(<PlayerTapZones {...props} />);
    return props;
  };

  it("gives the centre half the width and each side a quarter", () => {
    zones();
    expect(screen.getByTestId("presentation-player-tap-pause").className).toContain("w-[50%]");
    expect(screen.getByTestId("presentation-player-tap-prev").className).toContain("w-[25%]");
    expect(screen.getByTestId("presentation-player-tap-next").className).toContain("w-[25%]");
  });

  it("pauses on a quick tap without firing the long press", () => {
    const props = zones();
    const centre = screen.getByTestId("presentation-player-tap-pause");
    fireEvent.pointerDown(centre, { clientX: 10, clientY: 10 });
    act(() => void vi.advanceTimersByTime(100));
    fireEvent.pointerUp(centre);
    fireEvent.click(centre);
    expect(props.onTogglePause).toHaveBeenCalledTimes(1);
    expect(props.onLongPress).not.toHaveBeenCalled();
  });

  it("fires the long press at the point, and suppresses the tap that follows it", () => {
    const props = zones();
    const centre = screen.getByTestId("presentation-player-tap-pause");
    fireEvent.pointerDown(centre, { clientX: 42, clientY: 84 });
    act(() => void vi.advanceTimersByTime(400));
    expect(props.onLongPress).toHaveBeenCalledWith(42, 84);
    fireEvent.pointerUp(centre);
    fireEvent.click(centre);
    expect(props.onTogglePause).not.toHaveBeenCalled();
  });

  it("treats a drag as a drag, not a press", () => {
    const props = zones();
    const centre = screen.getByTestId("presentation-player-tap-pause");
    fireEvent.pointerDown(centre, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(centre, { clientX: 60, clientY: 10 });
    act(() => void vi.advanceTimersByTime(400));
    expect(props.onLongPress).not.toHaveBeenCalled();
  });

  it("stands down so a live selection can be worked with", () => {
    const { container } = render(
      <PlayerTapZones
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onTogglePause={vi.fn()}
        interactive={false}
      />,
    );
    expect(container.firstElementChild?.className).toContain("pointer-events-none");
  });
});
