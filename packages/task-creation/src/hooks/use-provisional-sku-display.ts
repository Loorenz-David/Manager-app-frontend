import { useState } from "react";

type SubmittedSku = {
  value: string;
  /**
   * True while `value` is only a hint (the seller's override, or the preview
   * shown before save) rather than the SKU the backend actually assigned.
   */
  isProvisional: boolean;
};

/**
 * Tracks the SKU shown during and after a task-creation submit that may
 * auto-assign one from a SKU template. Shared by every form that offers that
 * assist (pre-order, return) so the "seed with override-or-preview, swap to
 * the real item_sku once the response lands" behavior lives in one place.
 */
export function useProvisionalSkuDisplay() {
  const [submittedSku, setSubmittedSku] = useState<SubmittedSku | null>(null);

  /**
   * Call right before submitting. `overrideSku` is whatever the seller typed
   * into the identity field; `preview` is the ghost-text value to fall back
   * to — pass it only when the assist actually applies to this submission,
   * since an unrelated preview (a different task type, or a return_source
   * where identity is still required) would misrepresent what's about to
   * happen.
   */
  function beginSubmission(
    overrideSku: string | undefined,
    preview: string | null,
  ): void {
    const trimmed = overrideSku?.trim();
    setSubmittedSku({ value: trimmed || preview || "", isProvisional: !trimmed });
  }

  /** Call once the create response lands. A falsy sku leaves the display as-is. */
  function resolveFinal(itemSku: string | null | undefined): void {
    if (itemSku) {
      setSubmittedSku({ value: itemSku, isProvisional: false });
    }
  }

  function clear(): void {
    setSubmittedSku(null);
  }

  return { submittedSku, beginSubmission, resolveFinal, clear };
}
