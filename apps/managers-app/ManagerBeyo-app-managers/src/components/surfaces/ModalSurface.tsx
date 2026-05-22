import { useEffect, useState, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { transitions } from '@/lib/animation';
import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';

type Props = {
  onClose: () => void;
  zIndex: number;
  isTopmost: boolean;
  children: ReactNode;
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 8 },
} as const;

export function ModalSurface({
  onClose,
  zIndex,
  isTopmost: _isTopmost,
  children,
}: Props): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [actions, setActions] = useState<ReactNode>(null);
  const [headerHidden, setHeaderHidden] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <SurfaceHeaderContext.Provider value={{ setTitle, setActions, requestClose: onClose, setHeaderHidden }}>
      <div className="fixed inset-0" style={{ zIndex }}>
        <m.button
          animate="visible"
          aria-label="Close modal"
          className="absolute inset-0 bg-black/45 [will-change:opacity]"
          exit="exit"
          initial="hidden"
          onClick={onClose}
          style={{ zIndex }}
          transition={transitions.base}
          type="button"
          variants={backdropVariants}
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <m.div
            animate="visible"
            aria-labelledby="surface-modal-title"
            aria-modal="true"
            className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-background shadow-2xl transform-gpu [will-change:transform,opacity]"
            exit="exit"
            initial="hidden"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            style={{ zIndex: zIndex + 1 }}
            transition={transitions.surface}
            variants={panelVariants}
          >
            {!headerHidden ? (
              <header className="flex min-h-14 items-center justify-between border-b px-5 py-4">
                <h2 className="truncate text-base font-semibold" id="surface-modal-title">
                  {title}
                </h2>
                <div className="flex items-center gap-2">
                  {actions}
                  <button
                    aria-label="Close modal"
                    className="rounded-full p-2 hover:bg-muted"
                    onClick={onClose}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </header>
            ) : null}
            <div className="max-h-[80dvh] overflow-y-auto p-5 [scrollbar-gutter:stable]">
              {children}
            </div>
          </m.div>
        </div>
      </div>
    </SurfaceHeaderContext.Provider>
  );
}
