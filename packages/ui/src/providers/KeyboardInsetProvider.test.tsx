import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  KeyboardInsetProvider,
  useKeyboardInset,
} from "./KeyboardInsetProvider";

function Probe(): React.JSX.Element {
  const { isKeyboardOpen } = useKeyboardInset();
  return <output data-testid="keyboard-open">{String(isKeyboardOpen)}</output>;
}

describe("KeyboardInsetProvider", () => {
  const originalVisualViewport = Object.getOwnPropertyDescriptor(
    window,
    "visualViewport",
  );
  const originalInnerHeight = Object.getOwnPropertyDescriptor(
    window,
    "innerHeight",
  );

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    if (originalVisualViewport) {
      Object.defineProperty(window, "visualViewport", originalVisualViewport);
    } else {
      // @ts-expect-error jsdom does not expose visualViewport by default
      delete window.visualViewport;
    }
    if (originalInnerHeight) {
      Object.defineProperty(window, "innerHeight", originalInnerHeight);
    }
  });

  it("keeps the keyboard open when visual viewport panning changes offsetTop", () => {
    const listeners = new Map<string, () => void>();
    const visualViewport = {
      height: 425,
      offsetTop: 0,
      pageTop: 0,
      addEventListener: (type: string, listener: () => void) => {
        listeners.set(type, listener);
      },
      removeEventListener: (type: string) => {
        listeners.delete(type);
      },
    } as unknown as VisualViewport;

    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: visualViewport,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 708,
    });
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    );

    render(
      <KeyboardInsetProvider>
        <Probe />
      </KeyboardInsetProvider>,
    );

    expect(screen.getByTestId("keyboard-open").textContent).toBe("true");

    act(() => {
      visualViewport.offsetTop = 283;
      listeners.get("scroll")?.();
    });

    expect(screen.getByTestId("keyboard-open").textContent).toBe("true");
    expect(document.documentElement.style.getPropertyValue("--keyboard-inset")).toBe(
      "283px",
    );
  });
});
