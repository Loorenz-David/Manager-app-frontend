import { create } from "zustand";

import type { CaseFilterPill } from "../types";

type CasesStoreState = {
  activePillByScope: Record<string, CaseFilterPill>;
  setActivePill: (scope: string, filter: CaseFilterPill) => void;
};

export const useCasesStore = create<CasesStoreState>((set) => ({
  activePillByScope: {},

  setActivePill: (scope, filter) =>
    set((state) => ({
      activePillByScope: { ...state.activePillByScope, [scope]: filter },
    })),
}));

export function buildCasesScope(
  entityType?: string,
  entityClientId?: string,
): string {
  return entityType && entityClientId
    ? `${entityType}:${entityClientId}`
    : "global";
}
