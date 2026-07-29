import { useEffect, useRef, useState, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { transitions } from '@beyo/lib';
import { SurfaceHeaderContext } from '../../providers/SurfaceProvider';

type Props = {
  onClose: () => void;
  zIndex: number;
  isTopmost: boolean;
  showBackdrop?: boolean;
  children: ReactNode;
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

/**
 * Enter: fade in while sliding up into place.
 * Exit: fade out while sliding down — revealing whatever sits beneath
 * (in the kiosk, the always-mounted keypad page).
 */
const panelVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 28 },
} as const;

export function RiseSurface({
  onClose,
  zIndex,
  isTopmost,
  showBackdrop = true,
  children,
}: Props): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  // The shell renders no header chrome, but pages announcing themselves via
  // SurfaceHeaderContext.setTitle feed the dialog's accessible name.
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!isTopmost) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTopmost, onClose]);

  // Same rationale as ModalSurface/SlidePageSurface: a covered surface
  // underneath can keep reclaiming DOM focus, so the new topmost surface must
  // explicitly grab it back on mount.
  useEffect(() => {
    if (isTopmost) {
      panelRef.current?.focus({ preventScroll: true });
    }
  }, [isTopmost]);

  return (
    <SurfaceHeaderContext.Provider
      // Rise pages are full-bleed — the shell renders no header chrome.
      // setTitle feeds only the dialog's aria-label; setActions is a no-op.
      value={{
        setTitle,
        setActions: () => {},
        requestClose: onClose,
        setHeaderHidden: () => {},
        setCloseInterceptor: () => {},
        setSwipeDismissDisabled: () => {},
        setBackdropHidden: () => {},
      }}
    >
      <div className="fixed inset-0" data-testid="rise-surface" style={{ zIndex }}>
        {showBackdrop ? (
          <m.div
            animate="visible"
            aria-hidden="true"
            className="absolute inset-0 bg-black/35 [will-change:opacity]"
            exit="exit"
            initial="hidden"
            style={{ zIndex }}
            transition={transitions.base}
            variants={backdropVariants}
          />
        ) : null}
        <m.div
          ref={panelRef}
          animate="visible"
          aria-label={title || 'Screen'}
          aria-modal="true"
          className="absolute inset-0 flex flex-col overflow-hidden transform-gpu [will-change:transform,opacity] focus:outline-none"
          exit="exit"
          initial="hidden"
          role="dialog"
          style={{ zIndex: zIndex + 1 }}
          tabIndex={-1}
          transition={transitions.surface}
          variants={panelVariants}
        >
          {children}
        </m.div>
      </div>
    </SurfaceHeaderContext.Provider>
  );
}
