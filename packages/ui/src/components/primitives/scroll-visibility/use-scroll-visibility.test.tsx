import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useScrollHide } from "./use-scroll-hide";

type HookApi = ReturnType<typeof useScrollHide>;

function setScrollTop(element: HTMLElement, value: number): void {
  // jsdom has no layout, so scrollTop is not writable in a useful way.
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    value,
  });
}

function scrollBy(element: HTMLElement, value: number): void {
  act(() => {
    setScrollTop(element, value);
    element.dispatchEvent(new Event("scroll"));
  });
}

describe("useScrollHide", () => {
  it("binds to the scroll container even when it mounts after the first render", () => {
    let api: HookApi | null = null;

    function Harness({ ready }: { ready: boolean }): React.JSX.Element {
      const hook = useScrollHide();
      api = hook;

      return (
        <div ref={hook.hideProgressContainerRef}>
          {ready ? <div ref={hook.scrollRef} data-testid="scroller" /> : null}
        </div>
      );
    }

    // Mount in the loading branch: the scroll container does not exist yet,
    // which is what a cold data fetch looks like on a real device.
    const { rerender, getByTestId } = render(<Harness ready={false} />);

    expect(api!.scrollRef.current).toBeNull();

    rerender(<Harness ready />);

    const scroller = getByTestId("scroller");
    expect(api!.scrollRef.current).toBe(scroller);

    // initialize() suspends directional updates briefly; clear that window so
    // the assertions do not depend on wall-clock timing.
    act(() => api!.suspend(0));

    scrollBy(scroller, 10);
    expect(api!.isHidden).toBe(false);

    // hideThreshold is 40 in relative mode.
    scrollBy(scroller, 60);
    expect(api!.isHidden).toBe(true);

    // Reversing only re-anchors; the next event travels the show distance
    // (showThreshold is 24) from that anchor.
    scrollBy(scroller, 50);
    scrollBy(scroller, 20);
    expect(api!.isHidden).toBe(false);
  });
});
