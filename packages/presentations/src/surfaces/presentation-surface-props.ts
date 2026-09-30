import type { RequestActivity } from "@beyo/api-client";

import type { ConsumerPresentation } from "../types";

export type PresentationSurfaceProps = {
  presentation: ConsumerPresentation;
  navigate: (route: string) => void;
  /** `activity` is `background` when auto-advance, not a tap, moved the deck. */
  onProgress: (lastSlideIndex: number, activity?: RequestActivity) => void | Promise<void>;
  onDismiss: (lastSlideIndex: number) => void | Promise<void>;
  onComplete: (lastSlideIndex: number, activity?: RequestActivity) => void | Promise<void>;
  onMediaExpired: () => Promise<ConsumerPresentation | null>;
  onClosed: () => void | Promise<void>;
  /** Standalone/testing fallback; registered host surfaces use SurfaceHeaderContext. */
  onRequestClose?: () => void;
};

