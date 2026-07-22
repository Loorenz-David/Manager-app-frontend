import type { ConsumerPresentation } from "../types";

export type PresentationSurfaceProps = {
  presentation: ConsumerPresentation;
  navigate: (route: string) => void;
  onProgress: (lastSlideIndex: number) => void | Promise<void>;
  onDismiss: (lastSlideIndex: number) => void | Promise<void>;
  onComplete: (lastSlideIndex: number) => void | Promise<void>;
  onMediaExpired: () => Promise<ConsumerPresentation | null>;
  onClosed: () => void | Promise<void>;
  /** Standalone/testing fallback; registered host surfaces use SurfaceHeaderContext. */
  onRequestClose?: () => void;
};

