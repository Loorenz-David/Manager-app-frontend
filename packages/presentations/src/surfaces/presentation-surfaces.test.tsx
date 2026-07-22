import { SurfaceHeaderContext, type SurfaceHeaderValue } from "@beyo/ui";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { consumerPresentationFixture } from "../test/fixtures";
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

  it("disables slide-page swipe and shows acknowledge when non-dismissible", () => {
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
    expect(controller.setSwipeDismissDisabled).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("presentation-player-acknowledge-footer")).toBeInTheDocument();
    expect(screen.queryByTestId("presentation-player-dismiss-button")).not.toBeInTheDocument();
    view.unmount();
    expect(controller.setSwipeDismissDisabled).toHaveBeenLastCalledWith(false);
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

