import { useEffect, useRef } from "react";

export function usePrefetchOnCondition(
  condition: boolean,
  prefetch: () => Promise<unknown>,
): void {
  const hasRun = useRef(false);
  const stablePrefetch = useRef(prefetch);
  // Always keep ref current so the effect reads the latest closure,
  // not the stale one captured on first render before data was available.
  stablePrefetch.current = prefetch;

  useEffect(() => {
    if (condition && !hasRun.current) {
      hasRun.current = true;
      void stablePrefetch.current();
    }
  }, [condition]);
}
