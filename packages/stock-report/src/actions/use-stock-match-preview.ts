import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  previewStockAssignment,
  type StockMatchPreview,
  type StockMatchPreviewInput,
} from "../api/stock-report-api";

/** Non-cached action: a preview is advisory and latest-request-wins. */
export function useStockMatchPreview(stockNeedId: string) {
  const token = useRef(0);
  const [latest, setLatest] = useState<StockMatchPreview | null>(null);
  const mutation = useMutation({
    mutationFn: (input: StockMatchPreviewInput) =>
      previewStockAssignment(stockNeedId, input),
  });
  async function check(
    input: StockMatchPreviewInput,
  ): Promise<StockMatchPreview | null | undefined> {
    const requestToken = ++token.current;
    try {
      const result = await mutation.mutateAsync(input);
      if (requestToken !== token.current) return null;
      setLatest(result);
      return result;
    } catch {
      // A transport failure is advisory; create-time validation remains
      // complete. `undefined` is deliberately distinct from a stale `null`.
      if (requestToken === token.current) setLatest(null);
      return undefined;
    }
  }
  return {
    check,
    isPending: mutation.isPending,
    latest,
    clear: () => {
      token.current += 1;
      setLatest(null);
    },
  };
}
