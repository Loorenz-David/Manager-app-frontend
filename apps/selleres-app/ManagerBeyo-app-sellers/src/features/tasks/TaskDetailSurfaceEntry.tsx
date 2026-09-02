import { lazy, useContext, useMemo } from "react";

import {
  TYPICAL_STRATEGY_SHEET_SURFACE_ID,
  type TypicalStrategySheetSurfaceProps,
} from "@beyo/item-economics";
import { loadTaskDetailSlidePage } from "@beyo/tasks";
import { SurfacePropsContext, useSurfaceStore } from "@beyo/ui";

/**
 * Registers the task detail with its surface openers already injected.
 *
 * Passing `surfaceOpeners` per call site did not hold: the task detail is
 * opened from thirteen places, and six of them live inside `@beyo/tasks` and
 * `@beyo/stats`, which have no access to this app's registry at all. Those six
 * opened a detail whose production-time card had no opener, so its strategy
 * pill rendered without a tap target.
 *
 * Supplying the openers here instead means the screen cannot be opened without
 * them, whoever opens it, and a call site added later inherits them for free.
 * The package still receives its openers by injection (architecture §13); only
 * the injection point moved from the caller to the registration.
 */
const TaskDetailPage = lazy(loadTaskDetailSlidePage);

export default function TaskDetailSurfaceEntry(): React.JSX.Element {
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
      <TaskDetailPage />
    </SurfacePropsContext.Provider>
  );
}
