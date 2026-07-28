import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCommittedPaneId } from "./use-committed-pane-id";
import type { SlideStackDragType } from "./slide-stack.types";

let commit: (type: SlideStackDragType) => void = () => {};

function Probe({
  activeId,
  paneIds,
}: {
  activeId: string;
  paneIds: string[];
}): React.JSX.Element {
  const { paneId, onCommit } = useCommittedPaneId({ activeId, paneIds });
  commit = onCommit;
  return <span data-testid="pane-id">{paneId}</span>;
}

function paneId(): string {
  return screen.getByTestId("pane-id").textContent ?? "";
}

afterEach(cleanup);

describe("useCommittedPaneId", () => {
  const IDS = ["one", "two", "three"];

  it("previews the neighbouring pane on commit, in both directions", () => {
    const { rerender } = render(<Probe activeId="two" paneIds={IDS} />);
    expect(paneId()).toBe("two");

    act(() => commit("forward"));
    expect(paneId()).toBe("three");

    // The navigation lands: the real id takes over (identical value, no flip).
    rerender(<Probe activeId="three" paneIds={IDS} />);
    expect(paneId()).toBe("three");

    act(() => commit("back"));
    expect(paneId()).toBe("two");
  });

  it("stays put at the ends of the stack", () => {
    render(<Probe activeId="one" paneIds={IDS} />);

    act(() => commit("back"));
    expect(paneId()).toBe("one");
  });

  it("expires the preview when the navigation never lands", () => {
    vi.useFakeTimers();
    try {
      render(<Probe activeId="two" paneIds={IDS} />);
      act(() => commit("forward"));
      expect(paneId()).toBe("three");

      act(() => vi.advanceTimersByTime(600));
      expect(paneId()).toBe("two");
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops a preview whose pane disappeared from the stack", () => {
    const { rerender } = render(<Probe activeId="two" paneIds={IDS} />);
    act(() => commit("forward"));
    expect(paneId()).toBe("three");

    rerender(<Probe activeId="two" paneIds={["one", "two"]} />);
    expect(paneId()).toBe("two");
  });
});
