import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { TypicalStrategySheetContent } from "../components/typical-strategy";
import type { TypicalStrategySheetSurfaceProps } from "../surface-ids";

/**
 * The strategy disclosure, opened from either surface's pill.
 *
 * It takes the built view model rather than a task id: both hosts have already
 * parsed the resolution they are showing, and re-fetching here would risk
 * describing a *different* snapshot from the number the reader just tapped.
 */
export function TypicalStrategySheetPage(): React.JSX.Element | null {
  const header = useSurfaceHeader();
  const { strategy } = useSurfaceProps<TypicalStrategySheetSurfaceProps>();
  const title = strategy?.sheetTitle;

  useEffect(() => {
    if (title === undefined) {
      return;
    }
    header?.setTitle(title);
    header?.setActions(null);
  }, [header, title]);

  // Opened without props — a deep link or a stale history entry. An empty sheet
  // is the honest answer; inventing a strategy to describe is not.
  if (strategy === undefined) {
    return null;
  }

  return <TypicalStrategySheetContent strategy={strategy} />;
}
