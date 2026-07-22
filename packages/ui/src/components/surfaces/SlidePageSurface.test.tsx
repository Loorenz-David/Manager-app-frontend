import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { StrictMode, useContext, useEffect } from "react";

import { SlidePageSurface } from "./SlidePageSurface";
import { SurfaceHeaderContext } from "../../providers/SurfaceProvider";

// Capture what the surface passes into the dismiss gesture so we can invoke the
// close funnel directly, without a synthetic pointer stream.
let capturedOnDismiss: (() => boolean) | null = null;
let capturedEnabled = false;

vi.mock("./use-slide-to-dismiss", () => ({
  useSlideToDismiss: (opts: { enabled: boolean; onDismiss: () => boolean }) => {
    capturedOnDismiss = opts.onDismiss;
    capturedEnabled = opts.enabled;
  },
  readPanelWidth: () => 400,
}));

function InterceptorSetup({ fn }: { fn: () => void }): null {
  const header = useContext(SurfaceHeaderContext);
  useEffect(() => {
    header?.setCloseInterceptor(fn);
  }, [header, fn]);
  return null;
}

function DisableSwipeSetup(): null {
  const header = useContext(SurfaceHeaderContext);
  useEffect(() => {
    header?.setSwipeDismissDisabled(true);
  }, [header]);
  return null;
}

function HideBackdropSetup(): null {
  const header = useContext(SurfaceHeaderContext);
  useEffect(() => {
    header?.setBackdropHidden(true);
  }, [header]);
  return null;
}

function findBackdrop(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(".fixed.inset-0.bg-black");
}

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
});

afterEach(() => {
  cleanup();
  capturedOnDismiss = null;
  capturedEnabled = false;
  vi.restoreAllMocks();
});

describe("SlidePageSurface dismiss funnel", () => {
  it("closes directly when no interceptor is set", () => {
    const onClose = vi.fn();
    render(
      <SlidePageSurface isTopmost onClose={onClose} zIndex={50}>
        <div>content</div>
      </SlidePageSurface>,
    );

    const closing = capturedOnDismiss?.();

    expect(onClose).toHaveBeenCalledOnce();
    expect(closing).toBe(true);
  });

  it("defers to the close interceptor instead of closing", () => {
    const onClose = vi.fn();
    const interceptor = vi.fn();
    render(
      <SlidePageSurface isTopmost onClose={onClose} zIndex={50}>
        <InterceptorSetup fn={interceptor} />
      </SlidePageSurface>,
    );

    const closing = capturedOnDismiss?.();

    expect(interceptor).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(closing).toBe(false);
  });

  it("slides fully in under StrictMode double-mounting (panel must not strand off-screen)", async () => {
    // StrictMode runs mount effects twice (run → cleanup → run). A run-once
    // guard in the enter effect once left the panel stopped at x=width — an
    // invisible full-viewport layer that swallowed every tap in the app.
    const { container } = render(
      <StrictMode>
        <SlidePageSurface isTopmost onClose={vi.fn()} zIndex={50}>
          <div>content</div>
        </SlidePageSurface>
      </StrictMode>,
    );

    const panel = container.querySelector<HTMLElement>('[tabindex="-1"]');
    expect(panel).not.toBeNull();

    await waitFor(() => {
      const transform = panel!.style.transform;
      expect(
        transform === "" ||
          transform === "none" ||
          transform.includes("translateX(0px)"),
      ).toBe(true);
    });
  });

  it("keeps the full-viewport wrapper click-transparent so an off-screen panel cannot block the app", () => {
    const { container } = render(
      <SlidePageSurface isTopmost onClose={vi.fn()} zIndex={50}>
        <div>content</div>
      </SlidePageSurface>,
    );

    const panel = container.querySelector<HTMLElement>('[tabindex="-1"]');
    const wrapper = panel?.parentElement;
    expect(wrapper?.className).toContain("pointer-events-none");
    expect(panel?.className).toContain("pointer-events-auto");
  });

  it("enables the gesture only for the topmost surface", () => {
    const { rerender } = render(
      <SlidePageSurface isTopmost onClose={vi.fn()} zIndex={50}>
        <div>content</div>
      </SlidePageSurface>,
    );
    expect(capturedEnabled).toBe(true);

    rerender(
      <SlidePageSurface isTopmost={false} onClose={vi.fn()} zIndex={50}>
        <div>content</div>
      </SlidePageSurface>,
    );
    expect(capturedEnabled).toBe(false);
  });

  it("disables the gesture when a page opts out via setSwipeDismissDisabled", async () => {
    render(
      <SlidePageSurface isTopmost onClose={vi.fn()} zIndex={50}>
        <DisableSwipeSetup />
      </SlidePageSurface>,
    );

    await waitFor(() => expect(capturedEnabled).toBe(false));
  });

  it("renders the dark backdrop by default", () => {
    const { container } = render(
      <SlidePageSurface isTopmost onClose={vi.fn()} zIndex={50}>
        <div>content</div>
      </SlidePageSurface>,
    );
    expect(findBackdrop(container)).not.toBeNull();
  });

  it("removes the backdrop when a page opts out via setBackdropHidden", async () => {
    const { container } = render(
      <SlidePageSurface isTopmost onClose={vi.fn()} zIndex={50}>
        <HideBackdropSetup />
      </SlidePageSurface>,
    );

    await waitFor(() => expect(findBackdrop(container)).toBeNull());
  });
});
