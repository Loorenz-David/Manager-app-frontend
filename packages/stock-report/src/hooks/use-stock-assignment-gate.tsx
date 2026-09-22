import type { TaskCreationCandidate } from "@beyo/task-creation";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useStockMatchPreview } from "../actions/use-stock-match-preview";
import { StockMatchStatusRow } from "../components/sheets/StockMatchStatusRow";
import { stockAssignmentRefusalMessage } from "../lib/stock-assignment-messages";
import type { StockMatchPropertyFailure } from "../components/sheets/StockMatchWarningSheetContent";
import {
  preloadStockMatchWarningSurface,
  type StockMatchWarningSurfaceProps,
} from "../surface-ids";

export type StockAssignmentGateOpener = (
  props: StockMatchWarningSurfaceProps,
) => void;

const FAILURE_EXPLANATION: Record<string, string> = {
  missing_on_item: "The item has no value for this requirement.",
  value_not_accepted: "The item's value is not accepted for this stock need.",
  no_group_for_value: "The item's value could not be matched to a known group.",
  criterion_not_understood:
    "This stock need has an invalid matching criterion.",
};

function toFailures(
  failures: readonly { key: string; reason: string }[],
): StockMatchPropertyFailure[] {
  return failures.map((failure) => ({
    label: failure.key
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    explanation:
      FAILURE_EXPLANATION[failure.reason] ??
      "This value does not match the stock need.",
  }));
}

function signature(candidate: TaskCreationCandidate): string {
  return JSON.stringify(candidate);
}

type GateStatus = "idle" | "checking" | "mismatch-accepted";

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
 * generic candidate gate. A decision is intentionally a promise: submit does
 * not race ahead of the locked sheet, and repeated calls for the same warning
 * join that one pending choice.
 */
export function useStockAssignmentGate(
  stockNeedId: string,
  openWarning: StockAssignmentGateOpener,
) {
  const preview = useStockMatchPreview(stockNeedId);
  const [acceptedOverride, setAcceptedOverride] = useState(false);
  const acceptedOverrideRef = useRef(false);
  const statusStoreRef = useRef<GateStatusStore | null>(null);
  if (!statusStoreRef.current) statusStoreRef.current = createGateStatusStore();
  const statusStore = statusStoreRef.current;
  const setStatus = statusStore.set;
  const acceptedSignatureRef = useRef<string | null>(null);
  const latestCandidateSignatureRef = useRef<string | null>(null);
  const latestWarningRef = useRef<StockMatchWarningSurfaceProps | null>(null);
  const changeItemRef = useRef<(() => void) | undefined>(undefined);
  const pendingDecisionRef = useRef<{
    signature: string;
    promise: Promise<boolean>;
    resolve: (value: boolean) => void;
  } | null>(null);

  const clear = useCallback(() => {
    acceptedSignatureRef.current = null;
    latestWarningRef.current = null;
    pendingDecisionRef.current = null;
    acceptedOverrideRef.current = false;
    setAcceptedOverride(false);
    setStatus("idle");
    preview.clear();
  }, [preview]);

  const reopenWarning = useCallback(() => {
    const warning = latestWarningRef.current;
    if (warning) openWarning(warning);
  }, [openWarning]);

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

      const candidateSignature = signature(candidate);
      latestCandidateSignatureRef.current = candidateSignature;
      if (acceptedSignatureRef.current === candidateSignature) return true;

      // A field changed after accepting a mismatch. The override never leaks
      // to a different item/category/quantity snapshot.
      if (acceptedSignatureRef.current !== null) clear();
      const pending = pendingDecisionRef.current;
      if (pending?.signature === candidateSignature) return pending.promise;

      setStatus("checking");
      const result = await preview.check(candidate);
      if (result === null) {
        setStatus("idle");
        // A stale reply is never permission to create. A later settled field
        // effect or another submit starts the current check.
        return false;
      }
      if (result === undefined) {
        setStatus("idle");
        // Network/5xx preview failures are advisory. The create endpoint
        // remains the authoritative validation path.
        return true;
      }

      if (!result.can_proceed) {
        const warning: StockMatchWarningSurfaceProps = {
          kind: "blocked",
          reasonText: stockAssignmentRefusalMessage(result.refusal_reason),
          checkedAgainstStoredItem: result.values_source === "stored",
          onChangeItem: () => {
            clear();
            changeItemRef.current?.();
          },
        };
        latestWarningRef.current = warning;
        setStatus("idle");
        openWarning(warning);
        return false;
      }

      if (!result.override_required) {
        latestWarningRef.current = null;
        setStatus("idle");
        return true;
      }

      let resolve!: (value: boolean) => void;
      const decision = new Promise<boolean>((nextResolve) => {
        resolve = nextResolve;
      });
      pendingDecisionRef.current = {
        signature: candidateSignature,
        promise: decision,
        resolve,
      };
      const warning: StockMatchWarningSurfaceProps = {
        kind: "warning",
        failures: toFailures(result.property_failures),
        checkedAgainstStoredItem: result.values_source === "stored",
        onChangeItem: () => {
          clear();
          changeItemRef.current?.();
          resolve(false);
        },
        onContinue: () => {
          acceptedSignatureRef.current = candidateSignature;
          pendingDecisionRef.current = null;
          acceptedOverrideRef.current = true;
          setAcceptedOverride(true);
          setStatus("mismatch-accepted");
          resolve(true);
        },
      };
      latestWarningRef.current = warning;
      setStatus("idle");
      openWarning(warning);
      return decision;
    },
    [clear, openWarning, preview],
  );

  const reopenWarningRef = useRef(reopenWarning);
  reopenWarningRef.current = reopenWarning;
  const StatusSlot = useMemo(() => {
    function LiveStatusSlot(): React.JSX.Element | null {
      const status = useSyncExternalStore(
        statusStore.subscribe,
        statusStore.getSnapshot,
        statusStore.getSnapshot,
      );
      return (
        <StockMatchStatusRow
          state={status}
          onPress={() => reopenWarningRef.current()}
        />
      );
    }
    return LiveStatusSlot;
  }, [statusStore]);

  const requestOverride = useCallback(
    (
      failures: readonly { key: string; reason: string }[],
    ): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const warning: StockMatchWarningSurfaceProps = {
          kind: "warning",
          failures: toFailures(failures),
          onChangeItem: () => {
            clear();
            changeItemRef.current?.();
            resolve(false);
          },
          onContinue: () => {
            acceptedSignatureRef.current = latestCandidateSignatureRef.current;
            acceptedOverrideRef.current = true;
            setAcceptedOverride(true);
            setStatus("mismatch-accepted");
            resolve(true);
          },
        };
        latestWarningRef.current = warning;
        openWarning(warning);
      });
    },
    [clear, openWarning],
  );

  return {
    check,
    preload: preloadStockMatchWarningSurface,
    acceptedOverride,
    clear,
    isPending: preview.isPending,
    statusSlot: StatusSlot,
    requestOverride,
    getAcceptedOverride: () => acceptedOverrideRef.current,
  };
}
