import { useContext, useEffect } from 'react';
import { SurfaceHeaderContext } from '@beyo/ui';

/**
 * Suppress the current slide page's dark backdrop (the drag-reveal / close-fade
 * dim) while this hook is mounted (and, when `hidden` is passed, only while it
 * is true). Use on a page that renders its own dark overlay on close, so the
 * two dims don't stack into a flicker.
 *
 * No-op on sheet/modal surfaces, which manage their own backdrops.
 */
export function useHideSlideBackdrop(hidden = true): void {
  const header = useContext(SurfaceHeaderContext);

  useEffect(() => {
    if (!header) return;
    header.setBackdropHidden(hidden);
    return () => header.setBackdropHidden(false);
  }, [header, hidden]);
}
