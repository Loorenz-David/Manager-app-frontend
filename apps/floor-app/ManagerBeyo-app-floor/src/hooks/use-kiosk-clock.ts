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
    const syncClock = () => setNow(new Date());
    const intervalId = window.setInterval(() => setNow(new Date()), 1_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncClock();
    };

    window.addEventListener('focus', syncClock);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncClock);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return useMemo(() => formatClock(now, timeZone), [now, timeZone]);
}
