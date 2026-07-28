import { SurfaceHeaderContext, type SurfaceHeaderValue } from "@beyo/ui";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { consumerPresentationFixture, makeConsumerSlide } from "../test/fixtures";
import {
  preloadPresentationFullScreenSurface,
  preloadPresentationModalSurface,
  preloadPresentationSlidePageSurface,
} from "../surface-ids";
import type { PresentationSurfaceProps } from "./presentation-surface-props";
import { PresentationFullScreenSurface } from "./PresentationFullScreenSurface";
import { PresentationModalSurface } from "./PresentationModalSurface";
import { PresentationSlidePageSurface } from "./PresentationSlidePageSurface";

const baseProps = (overrides: Partial<PresentationSurfaceProps> = {}): PresentationSurfaceProps => ({
  presentation: consumerPresentationFixture,
  navigate: vi.fn(),
  onProgress: vi.fn(),
  onDismiss: vi.fn(),
  onComplete: vi.fn(),
  onMediaExpired: async () => null,
  onClosed: vi.fn(),
  onRequestClose: vi.fn(),
  ...overrides,
});

function ContextHarness({
  children,
  controller,
}: {
  children: React.ReactNode;
  controller: {
    setSwipeDismissDisabled: ReturnType<typeof vi.fn>;
    setCloseInterceptor: ReturnType<typeof vi.fn>;
    requestClose: ReturnType<typeof vi.fn>;
  };
}) {
  const [, setTitle] = useState("");
  const [, setActions] = useState<React.ReactNode>(null);
  const [, setHeaderHidden] = useState(false);
  const [, setBackdropHidden] = useState(false);
  const value = useMemo<SurfaceHeaderValue>(() => ({
    setTitle,
    setActions,
    requestClose: controller.requestClose,
    setHeaderHidden,
    setCloseInterceptor: controller.setCloseInterceptor,
    setSwipeDismissDisabled: controller.setSwipeDismissDisabled,
    setBackdropHidden,
  }), [controller]);
  return <SurfaceHeaderContext.Provider value={value}>{children}</SurfaceHeaderContext.Provider>;
}

describe("presentation surface dismiss matrix", () => {
  it("maps lazy loaders to the named context-consuming entries", async () => {
    const [modal, fullScreen, slidePage] = await Promise.all([
      preloadPresentationModalSurface(),
      preloadPresentationFullScreenSurface(),
      preloadPresentationSlidePageSurface(),
    ]);

    expect(modal.default.name).toBe("PresentationModalSurfaceEntry");
    expect(fullScreen.default.name).toBe("PresentationFullScreenSurfaceEntry");
    expect(slidePage.default.name).toBe("PresentationSlidePageSurfaceEntry");
  });

  it("uses X for modal and Skip for full screen when dismissible", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(690);
    const modal = render(<PresentationModalSurface {...baseProps()} />);
    expect(screen.getByTestId("presentation-player-modal-frame")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss announcement" })).toHaveTextContent("");
    modal.unmount();
    render(<PresentationFullScreenSurface {...baseProps()} />);
    expect(screen.getByTestId("presentation-player-full-screen-frame")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss announcement" })).toHaveTextContent("Skip");
  });

  it("locks a non-dismissible slide page until the deck has looped once", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(690);
    const controller = {
      setSwipeDismissDisabled: vi.fn(),
      setCloseInterceptor: vi.fn(),
      requestClose: vi.fn(),
    };
    const view = render(
      <ContextHarness controller={controller}>
        <PresentationSlidePageSurface {...baseProps({
          presentation: { ...consumerPresentationFixture, is_dismissible: false },
        })} />
      </ContextHarness>,
    );
    // No exit at all before the first loop: swipe locked, no chrome, no footer.
    expect(controller.setSwipeDismissDisabled).toHaveBeenCalledWith(true);
    expect(screen.queryByTestId("presentation-player-acknowledge-footer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("presentation-player-dismiss-button")).not.toBeInTheDocument();
    view.unmount();
    expect(controller.setSwipeDismissDisabled).toHaveBeenLastCalledWith(false);
  });

  it("reveals the close footer and re-enables swipe once the first loop completes", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(690);
    const controller = {
      setSwipeDismissDisabled: vi.fn(),
      setCloseInterceptor: vi.fn(),
      requestClose: vi.fn(),
    };
    const onComplete = vi.fn();
    const onDismiss = vi.fn();
    render(
      <ContextHarness controller={controller}>
        <PresentationSlidePageSurface {...baseProps({
          onComplete,
          onDismiss,
          presentation: {
            ...consumerPresentationFixture,
            is_dismissible: false,
            slides: [
              makeConsumerSlide("timed", 40, 1),
              makeConsumerSlide("timed", 40, 2),
            ],
          },
        })} />
      </ContextHarness>,
    );

    const footer = await screen.findByTestId("presentation-player-acknowledge-footer", {}, {
      timeout: 2_000,
    });
    expect(footer).toHaveTextContent("Close");
    // `completed` is recorded by the loop itself — and it must not have closed the surface.
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(controller.requestClose).not.toHaveBeenCalled();
    await waitFor(() => expect(controller.setSwipeDismissDisabled).toHaveBeenLastCalledWith(false));

    // The unlocked exits are plain closes: `dismissed` after `completed` would 409.
    act(() => {
      screen.getByTestId("presentation-player-acknowledge-button").click();
    });
    await waitFor(() => expect(controller.requestClose).toHaveBeenCalled());
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("intercepts slide-page gesture close to record dismissed before closing", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(690);
    const onDismiss = vi.fn().mockResolvedValue(undefined);
    const controller = {
      setSwipeDismissDisabled: vi.fn(),
      setCloseInterceptor: vi.fn(),
      requestClose: vi.fn(),
    };
    render(
      <ContextHarness controller={controller}>
        <PresentationSlidePageSurface {...baseProps({ onDismiss })} />
      </ContextHarness>,
    );
    const interceptor = controller.setCloseInterceptor.mock.calls.find(
      ([value]) => typeof value === "function",
    )?.[0] as (() => void) | undefined;
    expect(interceptor).toBeTypeOf("function");
    act(() => interceptor?.());
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith(0));
    await waitFor(() => expect(controller.requestClose).toHaveBeenCalled());
  });
});
