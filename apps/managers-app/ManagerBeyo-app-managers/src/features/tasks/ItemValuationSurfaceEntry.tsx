import { lazy, useContext, useMemo } from "react";

import {
  TYPICAL_STRATEGY_SHEET_SURFACE_ID,
  loadItemValuationSlidePage,
  type TypicalStrategySheetSurfaceProps,
} from "@beyo/item-economics";
import { SurfacePropsContext, useSurfaceStore } from "@beyo/ui";

/**
 * Registers the valuation screen with its surface openers already injected.
 *
 * The alternative — passing `surfaceOpeners` in every `open(ITEM_VALUATION_…)`
 * call — would mean editing five call sites, two of which live inside
 * `@beyo/tasks` and have no access to this app's registry at all. Supplying
 * them here instead means the screen cannot be opened without them, and a new
 * call site added later inherits the openers for free rather than silently
 * shipping a pill that does not open.
 *
 * The package still receives its openers by injection (architecture §13); only
 * the injection point moved from the caller to the registration.
 */
// The page stays behind its own dynamic import — the package deliberately does
// not re-export it eagerly, and the surface stack's Suspense catches this.
const ItemValuationPage = lazy(loadItemValuationSlidePage);

export default function ItemValuationSurfaceEntry(): React.JSX.Element {
  const props = useContext(SurfacePropsContext);
  const open = useSurfaceStore((state) => state.open);

  const value = useMemo(
    () => ({
      ...props,
      surfaceOpeners: {
        openTypicalStrategy: (
          strategyProps: TypicalStrategySheetSurfaceProps,
        ) => open(TYPICAL_STRATEGY_SHEET_SURFACE_ID, strategyProps),
      },
    }),
    [open, props],
  );

  return (
    <SurfacePropsContext.Provider value={value}>
      <ItemValuationPage />
    </SurfacePropsContext.Provider>
  );
}
