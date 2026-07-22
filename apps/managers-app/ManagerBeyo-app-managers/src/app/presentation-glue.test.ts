import {
  PRESENTATION_FULL_SCREEN_SURFACE_ID,
  PRESENTATION_MODAL_SURFACE_ID,
  PRESENTATION_SLIDE_PAGE_SURFACE_ID,
  type PresentationSurfaceProps,
} from "@beyo/presentations";
import { describe, expect, it, vi } from "vitest";

import {
  createManagerPresentationSurfaceOpeners,
  isManagerPresentationHome,
  MANAGER_PRESENTATION_APP_KEY,
} from "@/app/presentation-glue";

describe("manager presentation glue", () => {
  it("uses the manager app key and only gates auto-show on the exact home path", () => {
    expect(MANAGER_PRESENTATION_APP_KEY).toBe("manager");
    expect(isManagerPresentationHome("/")).toBe(true);
    expect(isManagerPresentationHome("/tasks")).toBe(false);
    expect(isManagerPresentationHome("//")).toBe(false);
  });

  it("maps every presentation opener to the manager surface store", () => {
    const open = vi.fn();
    const close = vi.fn();
    const props = {} as PresentationSurfaceProps;
    const openers = createManagerPresentationSurfaceOpeners(open, close);

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
