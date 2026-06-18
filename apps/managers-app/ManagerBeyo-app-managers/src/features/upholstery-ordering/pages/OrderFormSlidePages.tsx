import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import Decimal from "decimal.js";
import { FloatingKeyboardBar } from "@beyo/ui";
import { generateClientId } from "@beyo/lib";

import { useSurface } from "@/hooks/use-surface";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";

import { useCreateUpholsteryOrder } from "../actions/use-create-upholstery-order";
import { useReceiveUpholsteryOrder } from "../actions/use-receive-upholstery-order";
import {
  UPHOLSTERY_CREATE_ORDER_SLIDE_ID,
  UPHOLSTERY_SHORTAGE_DETAIL_SLIDE_ID,
  type CreateOrderSurfaceProps,
  type ReceiveOrderSurfaceProps,
} from "../surfaces";

// Configure half-up rounding globally for this module's Decimal instances.
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

const DECIMAL_PLACES = 3;

/**
 * Parses raw user input into a Decimal.
 * Returns null when the string is empty or not a finite number.
 */
function parseInput(value: string): Decimal | null {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  try {
    const d = new Decimal(normalized);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}

/**
 * Rounds a Decimal to DECIMAL_PLACES using half-up and returns it
 * as a fixed-decimal string (e.g. "1.250").
 */
function normalizeDecimal(d: Decimal): string {
  return d
    .toDecimalPlaces(DECIMAL_PLACES, Decimal.ROUND_HALF_UP)
    .toFixed(DECIMAL_PLACES);
}

/**
 * Formats a Decimal for display with up to DECIMAL_PLACES decimals and no
 * trailing zero padding, using "." as the decimal separator.
 */
function formatDecimalForDisplay(d: Decimal): string {
  return d
    .toDecimalPlaces(DECIMAL_PLACES, Decimal.ROUND_HALF_UP)
    .toFixed(DECIMAL_PLACES)
    .replace(/\.?0+$/, "");
}

/**
 * Converts a raw number (from props / backend) to a Decimal safely.
 */
function toDecimal(value: number | null | undefined): Decimal {
  return new Decimal(Number.isFinite(value) ? (value ?? 0) : 0);
}

export function getPositiveAmountError(value: string): string | null {
  const parsed = parseInput(value);
  if (!parsed) {
    return "Enter a quantity greater than 0.";
  }

  const normalized = new Decimal(normalizeDecimal(parsed));
  if (normalized.lte(0)) {
    return "Enter a quantity greater than 0.";
  }

  return null;
}

export function getReceivableAmountError(
  value: string,
  remainingReceivableMeters: number,
): string | null {
  const positiveAmountError = getPositiveAmountError(value);
  if (positiveAmountError) {
    return positiveAmountError;
  }

  const parsed = parseInput(value);
  const remaining = normalizeDecimal(toDecimal(remainingReceivableMeters));
  const displayRemaining = formatDecimalForDisplay(toDecimal(remainingReceivableMeters));

  if (parsed && new Decimal(normalizeDecimal(parsed)).gt(new Decimal(remaining))) {
    return `Maximum receivable is ${displayRemaining} m.`;
  }

  return null;
}

function AmountInput({
  title,
  subtitle,
  amount,
  error,
  isPending,
  submitLabel,
  onBack,
  onAmountChange,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  amount: string;
  error: string | null;
  isPending: boolean;
  submitLabel: string;
  onBack: () => void;
  onAmountChange: (value: string) => void;
  onSubmit: () => void;
}): React.JSX.Element {
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          aria-label="Back"
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          type="button"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-md font-semibold text-foreground">
            {title}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 pt-8">
        <FloatingKeyboardBar
          renderControls={({ inputRef, preventFocusSteal }) => (
            <div className="flex flex-col gap-3">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="order-amount"
              >
                Quantity (m)
              </label>
              <input
                ref={inputRef}
                className="rounded-2xl bg-card px-4 py-4 text-2xl font-semibold text-foreground outline-none ring-1 ring-border focus:ring-primary"
                data-testid="upholstery-ordering-amount-input"
                id="order-amount"
                inputMode="decimal"
                min="0.001"
                step="0.001"
                type="text"
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <button
                className="w-full rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
                data-testid="upholstery-ordering-submit-button"
                disabled={isPending}
                type="button"
                onClick={onSubmit}
                onMouseDown={preventFocusSteal}
              >
                {isPending ? "Saving..." : submitLabel}
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}

export function CreateOrderSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const props = useSurfaceProps<CreateOrderSurfaceProps>();
  const createOrder = useCreateUpholsteryOrder();
  const defaultAmount = toDecimal(props.defaultAmountMeters);
  const [amount, setAmount] = useState(() =>
    defaultAmount.isZero() ? "" : formatDecimalForDisplay(defaultAmount),
  );
  const [error, setError] = useState<string | null>(null);
  const clientId = useMemo(() => generateClientId("UpholsteryOrder"), []);

  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(): void {
    const validationError = getPositiveAmountError(amount);
    if (validationError) {
      setError(validationError);
      return;
    }
    const parsed = parseInput(amount);
    if (!parsed) return;
    const normalized = normalizeDecimal(parsed);
    if (!props.upholsteryId) {
      setError("Missing upholstery.");
      return;
    }
    setError(null);
    createOrder.mutate(
      {
        client_id: clientId,
        upholstery_id: props.upholsteryId,
        order_amount_meters: Number(normalized),
        priority_item_upholstery_ids: props.priorityItemUpholsteryIds ?? [],
      },
      {
        onSuccess: () => {
          surface.closeMany([
            UPHOLSTERY_CREATE_ORDER_SLIDE_ID,
            UPHOLSTERY_SHORTAGE_DETAIL_SLIDE_ID,
          ]);
        },
        onError: (mutationError) => {
          setError(
            mutationError instanceof Error
              ? mutationError.message
              : "Could not create order.",
          );
        },
      },
    );
  }

  return (
    <AmountInput
      amount={amount}
      error={error}
      isPending={createOrder.isPending}
      submitLabel="Create order"
      subtitle={`${props.upholsteryName ?? "Upholstery"} • ${formatDecimalForDisplay(defaultAmount)} m`}
      title="Create upholstery order"
      onBack={surface.closeTop}
      onAmountChange={setAmount}
      onSubmit={submit}
    />
  );
}

export function ReceiveOrderSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const props = useSurfaceProps<ReceiveOrderSurfaceProps>();
  const receiveOrder = useReceiveUpholsteryOrder();
  const defaultAmount = toDecimal(props.defaultAmountMeters);
  const remaining = toDecimal(props.remainingReceivableMeters);
  const displayRemaining = formatDecimalForDisplay(remaining);
  const [amount, setAmount] = useState(() =>
    defaultAmount.isZero() ? "" : formatDecimalForDisplay(defaultAmount),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(): void {
    const validationError = getReceivableAmountError(
      amount,
      props.remainingReceivableMeters ?? 0,
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    const parsed = parseInput(amount);
    if (!parsed) return;
    const normalized = normalizeDecimal(parsed);
    if (!props.orderId) {
      setError("Missing order.");
      return;
    }
    setError(null);
    receiveOrder.mutate(
      {
        client_id: props.orderId,
        received_amount_meters: Number(normalized),
        priority_item_upholstery_ids: props.priorityItemUpholsteryIds ?? [],
      },
      {
        onSuccess: () => surface.closeTop(),
        onError: (mutationError) => {
          setError(
            mutationError instanceof Error
              ? mutationError.message
              : "Could not receive order.",
          );
        },
      },
    );
  }

  return (
    <AmountInput
      amount={amount}
      error={error}
      isPending={receiveOrder.isPending}
      submitLabel="Register received"
      subtitle={`${props.upholsteryName ?? "Upholstery"} • ${displayRemaining} m remaining`}
      title="Receive upholstery order"
      onBack={surface.closeTop}
      onAmountChange={setAmount}
      onSubmit={submit}
    />
  );
}
