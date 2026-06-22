import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "framer-motion";
import { transitions } from "@beyo/lib";
import { useCelebrationSound } from "../hooks/use-celebration-sound";
import {
  selectConfig,
  selectDismiss,
  useCelebrationStore,
} from "../store/celebration.store";
import { AnimationRenderer } from "./AnimationRenderer";
import { MessageLayer } from "./MessageLayer";

const OVERLAY_Z_INDEX = 9999;

function CelebrationOverlayInner(): React.JSX.Element {
  const config = useCelebrationStore(selectConfig);
  const dismiss = useCelebrationStore(selectDismiss);
  const { play } = useCelebrationSound();

  useEffect(() => {
    if (!config) {
      return;
    }

    if (config.soundUrl) {
      play(config.soundUrl);
    }

    const timer = window.setTimeout(dismiss, config.duration ?? 5000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [config, dismiss, play]);

  return (
    <AnimatePresence>
      {config ? (
        <m.button
          key="celebration-overlay"
          animate={{ opacity: 1 }}
          aria-label="Dismiss celebration"
          data-testid="celebration-overlay"
          className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-6"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={dismiss}
          style={{ zIndex: OVERLAY_Z_INDEX, backgroundColor: "rgba(0,0,0,0.82)" }}
          transition={transitions.base}
          type="button"
        >
          <AnimationRenderer variant={config.variant} />
          {config.message ? <MessageLayer message={config.message} /> : null}
        </m.button>
      ) : null}
    </AnimatePresence>
  );
}

export function CelebrationOverlay(): React.JSX.Element | null {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(<CelebrationOverlayInner />, document.body);
}
