import { useCallback, useState } from "react";
import { useStockMatchPreview } from "../actions/use-stock-match-preview";
import type { StockMatchPreviewInput } from "../api/stock-report-api";

export type StockAssignmentGateOpener = (view: { kind: "blocked" | "warning"; reasonText?: string; onChangeItem: () => void; onContinue?: () => void }) => void;

export function useStockAssignmentGate(stockNeedId: string, openWarning: StockAssignmentGateOpener) {
  const preview = useStockMatchPreview(stockNeedId);
  const [acceptedOverride, setAcceptedOverride] = useState(false);
  const check = useCallback(async (input: StockMatchPreviewInput): Promise<boolean> => {
    setAcceptedOverride(false);
    const result = await preview.check(input);
    if (!result) return true;
    if (result.can_proceed === false) {
      openWarning({ kind: "blocked", reasonText: result.refusal_reason ?? "This item cannot be added to this stock need.", onChangeItem: () => preview.clear() });
      return false;
    }
    if (result.override_required) {
      openWarning({ kind: "warning", onChangeItem: () => preview.clear(), onContinue: () => setAcceptedOverride(true) });
      return false;
    }
    return true;
  }, [openWarning, preview]);
  return { check, preload: async () => undefined, acceptedOverride, clear: () => { setAcceptedOverride(false); preview.clear(); }, isPending: preview.isPending };
}
