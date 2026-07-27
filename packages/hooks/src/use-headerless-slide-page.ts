import { useEffect } from 'react';

import { useBreakpoint } from './BreakpointProvider';
import { useSurfaceHeader } from './use-surface-header';

/**
 * Hides the slide surface's own header so the page can render its content
 * full-bleed — but only where the surface's slide-to-close gesture is
 * available.
 *
 * `useSlideToDismiss` binds touch listeners only (desktop was always meant to
 * fall back to the header's back arrow), so on desktop the header stays
 * visible: these pages no longer carry a Close & Back button, and without it
 * a headerless desktop page would have no visible way to close.
 */
export function useHeaderlessSlidePage(): void {
  const header = useSurfaceHeader();
  const { isDesktop } = useBreakpoint();

  useEffect(() => {
    header?.setHeaderHidden(!isDesktop);

    return () => header?.setHeaderHidden(false);
  }, [header, isDesktop]);
}
