import { useContext, useEffect } from 'react';
import { SurfaceHeaderContext } from '@beyo/ui';

/**
 * Disable the slide-to-close swipe gesture for the current slide page while
 * this hook is mounted (and, when `disabled` is passed, only while it is true).
 * Use on pages whose own left/right swipe interaction would collide with the
 * dismiss gesture. To exempt only a region rather than the whole page, mark
 * that element with `data-slide-dismiss-ignore` instead.
 *
 * No-op on sheet/modal surfaces, which have no swipe dismissal.
 */
export function useDisableSlideDismiss(disabled = true): void {
  const header = useContext(SurfaceHeaderContext);

  useEffect(() => {
    if (!header) return;
    header.setSwipeDismissDisabled(disabled);
    return () => header.setSwipeDismissDisabled(false);
  }, [header, disabled]);
}
