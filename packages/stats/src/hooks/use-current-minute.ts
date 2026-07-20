import { useEffect, useState } from "react";

// One shared clock for the whole timeline page (now-line + open-block
// extrapolation) — never one timer per open event.
export function useCurrentMinute(enabled: boolean = true): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);

    return () => window.clearInterval(id);
  }, [enabled]);

  return now;
}
