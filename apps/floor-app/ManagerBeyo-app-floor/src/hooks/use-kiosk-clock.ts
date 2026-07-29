import { useEffect, useMemo, useState } from "react";

type KioskClock = {
  time: string;
  date: string;
};

function formatClock(now: Date, timeZone: string): KioskClock {
  return {
    time: new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(now),
    date: new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone,
    }).format(now),
  };
}

export function useKioskClock(timeZone: string): KioskClock {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(intervalId);
  }, []);

  return useMemo(() => formatClock(now, timeZone), [now, timeZone]);
}
