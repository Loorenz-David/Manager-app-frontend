import { useEffect, useRef, useState, type ReactNode } from "react";
import { m } from "framer-motion";
import { transitions } from "@beyo/lib";
import { SurfaceHeaderContext } from "../../providers/SurfaceProvider";

type Props = {
  onClose: () => void;
  zIndex: number;
  isTopmost: boolean;
  children: ReactNode;
};

export function SlidePageSurface({
  onClose,
  zIndex,
  isTopmost,
  children,
}: Props): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [actions, setActions] = useState<ReactNode>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [closeInterceptor, setCloseInterceptorState] = useState<
    (() => void) | null
  >(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // A surface stacked underneath (e.g. the sheet this slide opened from) can
  // still be a mounted, "open" Vaul drawer that keeps reclaiming DOM focus.
  // Grabbing focus here the moment this slide becomes topmost breaks that
  // hold so taps on focusable content inside the slide (inputs, composers)
  // actually receive focus instead of silently no-oping.
  useEffect(() => {
    if (isTopmost) {
      rootRef.current?.focus({ preventScroll: true });
    }
  }, [isTopmost]);

  const setCloseInterceptor = (fn: (() => void) | null) => {
    setCloseInterceptorState(() => fn);
  };

  const handleClose = () => {
    if (closeInterceptor) {
      closeInterceptor();
      return;
    }

    onClose();
  };

  return (
    <SurfaceHeaderContext.Provider
      value={{
        setTitle,
        setActions,
        requestClose: onClose,
        setHeaderHidden,
        setCloseInterceptor,
      }}
    >
      <div className="fixed inset-0 flex justify-center" style={{ zIndex }}>
        <m.div
          ref={rootRef}
          animate={{ x: 0 }}
          className="flex h-full w-full flex-col overflow-hidden bg-background pt-[var(--safe-top)] focus:outline-none transform-gpu [will-change:transform]"
          exit={{ x: "100%" }}
          initial={{ x: "100%" }}
          style={{ maxWidth: "var(--manager-shell-max-width)" }}
          tabIndex={-1}
          transition={transitions.slide}
        >
          {!headerHidden ? (
            <header className="flex min-h-14 shrink-0 items-center gap-3 px-4 py-3">
              <button
                aria-label="Go back"
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                onClick={handleClose}
                type="button"
              >
                ‹
              </button>
              <h1
                className="flex-1 truncate text-base font-semibold"
                id="surface-slide-title"
              >
                {title}
              </h1>
              {actions ? (
                <div className="flex items-center gap-1">{actions}</div>
              ) : null}
            </header>
          ) : null}

          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </m.div>
      </div>
    </SurfaceHeaderContext.Provider>
  );
}
