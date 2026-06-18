import { useCallback, useState } from "react";

import { DEFAULT_MORE_TAB, MORE_TABS, type MoreTabPath } from "@/lib/routes";

const STORAGE_KEY = "beyo-more-tab-last-selected";

function readStoredMoreTab(): MoreTabPath {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (MORE_TABS as readonly string[]).includes(stored)) {
      return stored as MoreTabPath;
    }
  } catch {}

  return DEFAULT_MORE_TAB;
}

export function useMoreTabLastSelected(): {
  lastSelected: MoreTabPath;
  selectMoreTab: (path: MoreTabPath) => void;
} {
  const [lastSelected, setLastSelected] = useState<MoreTabPath>(readStoredMoreTab);

  const selectMoreTab = useCallback((path: MoreTabPath): void => {
    try {
      localStorage.setItem(STORAGE_KEY, path);
    } catch {}

    setLastSelected(path);
  }, []);

  return { lastSelected, selectMoreTab };
}
