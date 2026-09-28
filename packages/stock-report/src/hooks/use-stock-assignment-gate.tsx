import type { TaskCreationCandidate } from "@beyo/task-creation";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

import { useStockMatchPreview } from "../actions/use-stock-match-preview";
import { StockMatchStatusRow } from "../components/sheets/StockMatchStatusRow";
import { stockAssignmentRefusalMessage } from "../lib/stock-assignment-messages";
import { toStockMatchFailureRows } from "../lib/stock-match-failure-rows";
import type { StockMatchFailure } from "../api/stock-report-api";
import {
  preloadStockMatchWarningSurface,
  type StockMatchWarningSurfaceProps,
} from "../surface-ids";

export type StockAssignmentGateOpener = (
  props: StockMatchWarningSurfaceProps,
) => void;

type GateStatus = "idle" | "checking";

type GateStatusStore = {
  getSnapshot: () => GateStatus;
  set: (next: GateStatus) => void;
  subscribe: (listener: () => void) => () => void;
};

function createGateStatusStore(): GateStatusStore {
  let status: GateStatus = "idle";
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => status,
    set: (next) => {
      if (status === next) return;
      status = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Owns the stock-specific preview lifecycle while exposing task-creation's
 * generic candidate gate. Every failed check is a block (owner, 2026-09-28):
 * a category mismatch and a property mismatch both open the locked sheet and
 * refuse the candidate, and the only way out is *Change item*. No override is
 * ever armed, so nothing here outlives a check.
 */
export function useStockAssignmentGate(
  stockNeedId: string,
  openWarning: StockAssignmentGateOpener,
) {
  const preview = useStockMatchPreview(stockNeedId);
  const statusStoreRef = useRef<GateStatusStore | null>(null);
  if (!statusStoreRef.current) statusStoreRef.current = createGateStatusStore();
  const statusStore = statusStoreRef.current;
  const setStatus = statusStore.set;
  const changeItemRef = useRef<(() => void) | undefined>(undefined);

  const clear = useCallback(() => {
    setStatus("idle");
    preview.clear();
  }, [preview, setStatus]);

  const changeItem = useCallback(() => {
    clear();
    changeItemRef.current?.();
  }, [clear]);

  const check = useCallback(
    async (
      candidate: TaskCreationCandidate,
      options?: { onChangeItem?: () => void },
    ): Promise<boolean> => {
      changeItemRef.current = options?.onChangeItem;
      if (!candidate.itemCategoryId) {
        clear();
        return true;
      }

      setStatus("checking");
      const result = await preview.check(candidate);
      setStatus("idle");
      if (result === null) {
        // A stale reply is never permission to create. A later settled field
        // effect or another submit starts the current check.
        return false;
      }
      if (result === undefined) {
        // Network/5xx preview failures are advisory. The create endpoint
        // remains the authoritative validation path.
        return true;
      }

      if (!result.can_proceed) {
        openWarning({
          kind: "blocked",
          reasonText: stockAssignmentRefusalMessage(result.refusal_reason),
          checkedAgainstStoredItem: result.values_source === "stored",
          onChangeItem: changeItem,
        });
        return false;
      }

      if (result.override_required) {
        // The backend still calls this overridable; this client never does.
        openWarning({
          kind: "mismatch",
          failures: toStockMatchFailureRows(result.property_failures),
          checkedAgainstStoredItem: result.values_source === "stored",
          onChangeItem: changeItem,
        });
        return false;
      }

      return true;
    },
    [changeItem, clear, openWarning, preview, setStatus],
  );

  const StatusSlot = useMemo(() => {
    function LiveStatusSlot(): React.JSX.Element | null {
      const status = useSyncExternalStore(
        statusStore.subscribe,
        statusStore.getSnapshot,
        statusStore.getSnapshot,
      );
      return <StockMatchStatusRow state={status} />;
    }
    return LiveStatusSlot;
  }, [statusStore]);

  /**
   * The create call refused the assignment for its properties after the
   * preview let it through (the item changed underneath, or the preview
   * failed and was advisory). Same sheet, same rows, same one way out.
   */
  const reportMismatch = useCallback(
    (failures: readonly StockMatchFailure[]): void => {
      openWarning({
        kind: "mismatch",
        failures: toStockMatchFailureRows(failures),
        onChangeItem: changeItem,
      });
    },
    [changeItem, openWarning],
  );

  return {
    check,
    preload: preloadStockMatchWarningSurface,
    clear,
    isPending: preview.isPending,
    statusSlot: StatusSlot,
    reportMismatch,
  };
}
