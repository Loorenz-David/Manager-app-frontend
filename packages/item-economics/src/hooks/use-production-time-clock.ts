import { useEffect, useState } from "react";

/** One shared 30-second clock for every active row in the widget. */
export function useProductionTimeClock(enabled: boolean): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);

    return () => window.clearInterval(id);
  }, [enabled]);

  return nowMs;
}
