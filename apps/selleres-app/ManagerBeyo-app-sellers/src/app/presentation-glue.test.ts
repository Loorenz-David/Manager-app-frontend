import {
  PRESENTATION_FULL_SCREEN_SURFACE_ID,
  PRESENTATION_MODAL_SURFACE_ID,
  PRESENTATION_SLIDE_PAGE_SURFACE_ID,
  type PresentationSurfaceProps,
} from "@beyo/presentations";
import { describe, expect, it, vi } from "vitest";

import {
  createSellerPresentationSurfaceOpeners,
  isSellerPresentationHome,
  SELLER_PRESENTATION_APP_KEY,
} from "@/app/presentation-glue";

describe("seller presentation glue", () => {
  it("uses the seller app key and only gates auto-show on the exact home path", () => {
    expect(SELLER_PRESENTATION_APP_KEY).toBe("seller");
    expect(isSellerPresentationHome("/")).toBe(true);
    expect(isSellerPresentationHome("/tasks")).toBe(false);
    expect(isSellerPresentationHome("//")).toBe(false);
  });

  it("maps every presentation opener to the seller surface store", () => {
    const open = vi.fn();
    const close = vi.fn();
    const props = {} as PresentationSurfaceProps;
    const openers = createSellerPresentationSurfaceOpeners(open, close);

    openers.openPresentationModal?.(props);
    openers.openPresentationFullScreen?.(props);
    openers.openPresentationSlidePage?.(props);

    expect(open.mock.calls.map(([id]) => id)).toEqual([
      PRESENTATION_MODAL_SURFACE_ID,
      PRESENTATION_FULL_SCREEN_SURFACE_ID,
      PRESENTATION_SLIDE_PAGE_SURFACE_ID,
    ]);

    for (const [id, openedProps] of open.mock.calls) {
      expect(openedProps).toMatchObject(props);
      openedProps.onRequestClose();
      expect(close).toHaveBeenLastCalledWith(id);
    }
  });
});
