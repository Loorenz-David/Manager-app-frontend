import { useRef, useState, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { Drawer } from 'vaul';
import { transitions } from '@/lib/animation';
import { cn } from '@/lib/utils';
import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';

type Props = {
  onClose: () => void;
  zIndex: number;
  isTopmost: boolean;
  children: ReactNode;
};

export function BottomSheetSurface({
  onClose,
  zIndex,
  isTopmost,
  children,
}: Props): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(true);
  const [title, setTitle] = useState('');
  const [actions, setActions] = useState<ReactNode>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  function handleClose(): void {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    setIsOpen(false);
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose();
      closeTimeoutRef.current = null;
    }, 350);
  }

  return (
    <SurfaceHeaderContext.Provider
      value={{ setTitle, setActions, requestClose: handleClose }}
    >
      <Drawer.Root
        direction="bottom"
        handleOnly
        modal={false}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          }
        }}
        open={isOpen}
      >
        <Drawer.Portal>
          <m.button
            animate={
              isOpen && isTopmost
                ? { opacity: 1 }
                : { opacity: 0 }
            }
            aria-label="Close sheet"
            className={cn(
              'fixed inset-0 bg-black/30 backdrop-blur-[2px]',
              isOpen && isTopmost ? 'pointer-events-auto' : 'pointer-events-none',
            )}
            initial={{ opacity: 0 }}
            onClick={handleClose}
            style={{ zIndex }}
            transition={transitions.surface}
            type="button"
          />
          <Drawer.Content
            className={cn(
              'fixed inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl',
              'flex flex-col bg-background shadow-xl focus:outline-none',
            )}
            style={{ zIndex: zIndex + 1 }}
          >
            <Drawer.Title className="sr-only">{title || 'Sheet'}</Drawer.Title>
            <Drawer.Description className="sr-only">
              {title ? `${title} sheet content` : 'Sheet content'}
            </Drawer.Description>

            <div className="relative flex-shrink-0">
              <Drawer.Handle className="absolute inset-0 z-0 !m-0 !h-full !w-full !rounded-none !bg-transparent !opacity-100" />

              <div className="pointer-events-none relative z-10 flex h-9 items-start justify-center pt-3">
                <div
                  aria-hidden="true"
                  className="h-1.5 w-10 rounded-full bg-muted-foreground/30"
                />
              </div>

              {title || actions ? (
                <header className="relative z-10 flex items-center justify-between px-6 py-3">
                  <div className="pointer-events-none truncate text-base font-semibold">
                    {title}
                  </div>
                  {actions ? (
                    <div className="pointer-events-auto relative z-20 flex items-center gap-2">
                      {actions}
                    </div>
                  ) : null}
                </header>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto pb-[var(--safe-bottom)] [scrollbar-gutter:stable]">
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </SurfaceHeaderContext.Provider>
  );
}
