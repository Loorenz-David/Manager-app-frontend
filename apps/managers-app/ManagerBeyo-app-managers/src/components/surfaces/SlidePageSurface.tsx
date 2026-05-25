import { useState, type ReactNode } from "react";
import { m } from "framer-motion";
import { transitions } from "@/lib/animation";
import { SurfaceHeaderContext } from "@/providers/SurfaceProvider";

type Props = {
  onClose: () => void;
  zIndex: number;
  isTopmost: boolean;
  children: ReactNode;
};

export function SlidePageSurface({
  onClose,
  zIndex,
  isTopmost: _isTopmost,
  children,
}: Props): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [actions, setActions] = useState<ReactNode>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [closeInterceptor, setCloseInterceptorState] = useState<
    (() => void) | null
  >(null);

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
      <m.div
        animate={{ x: 0 }}
        className="fixed inset-0 flex flex-col overflow-hidden bg-background pt-[var(--safe-top)] focus:outline-none transform-gpu [will-change:transform]"
        exit={{ x: "100%" }}
        initial={{ x: "100%" }}
        style={{ zIndex }}
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

        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {children}
        </div>
      </m.div>
    </SurfaceHeaderContext.Provider>
  );
}
