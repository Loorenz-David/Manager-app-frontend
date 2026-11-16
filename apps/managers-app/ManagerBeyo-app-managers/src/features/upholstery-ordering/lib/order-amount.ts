import Decimal from "decimal.js";

import { normalizeNonNegativeDecimalString } from "@/features/upholstery-inventory/lib/decimal";

export type OrderAmountCheck =
  | { ok: true; value: string; isDecrease: boolean }
  | { ok: false; error: string | null };

/**
 * Client-side mirror of `update_upholstery_order_amount`'s refusals, so Save is only
 * enabled for a value the backend accepts. `error` is null for "nothing to save yet"
 * (empty or unchanged) — no message, just a disabled button.
 */
export function checkOrderAmountDraft(
  draft: string,
  { currentMeters, receivedMeters }: { currentMeters: number; receivedMeters: number },
): OrderAmountCheck {
  if (draft.trim() === "") return { ok: false, error: null };
  const normalized = normalizeNonNegativeDecimalString(draft);
  if (normalized === null) return { ok: false, error: "Enter a valid amount in meters." };

  const value = new Decimal(normalized);
  const current = new Decimal(currentMeters).toDecimalPlaces(3);
  const received = new Decimal(receivedMeters).toDecimalPlaces(3);
  if (value.lte(0)) return { ok: false, error: "The amount must be more than 0 m." };
  if (value.lt(received)) {
    return {
      ok: false,
      error: `Can't be less than the ${received.toFixed(3)} m already received.`,
    };
  }
  if (value.eq(current)) return { ok: false, error: null };
  return { ok: true, value: normalized, isDecrease: value.lt(current) };
}
