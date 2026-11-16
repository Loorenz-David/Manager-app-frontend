import { useEffect, useState } from "react";

import { BackendImage, FloatingKeyboardBar } from "@beyo/ui";

import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { ApiRequestError } from "@/lib/api-client";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

import { useUpdateUpholsteryOrderAmount } from "../actions/use-update-upholstery-order-amount";
import { checkOrderAmountDraft } from "../lib/order-amount";
import {
  UPHOLSTERY_ORDER_AMOUNT_SHEET_ID,
  type OrderAmountSurfaceProps,
} from "../surfaces";

export function OrderAmountSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { order } = useSurfaceProps<OrderAmountSurfaceProps>();
  const [draft, setDraft] = useState(
    order ? order.orderAmountMeters.toFixed(3) : "",
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const updateAmount = useUpdateUpholsteryOrderAmount();

  useEffect(() => {
    header?.setTitle("Change ordered amount");
    header?.setActions(null);
  }, [header]);

  const check = order
    ? checkOrderAmountDraft(draft, {
        currentMeters: order.orderAmountMeters,
        receivedMeters: order.receivedAmountMeters,
      })
    : ({ ok: false, error: null } as const);
  const message = serverError ?? (check.ok ? null : check.error);

  function handleSave(): void {
    if (!order || !check.ok) return;
    updateAmount.mutate(
      { client_id: order.orderId, order_amount_meters: check.value },
      {
        onSuccess: () => {
          useSurfaceStore.getState().close(UPHOLSTERY_ORDER_AMOUNT_SHEET_ID);
        },
        onError: (error) => {
          // 4xx bodies are the backend's own refusal ("can't be less than the
          // 2.000 m already received"); anything else stays generic.
          const isRefusal =
            error instanceof ApiRequestError &&
            error.status >= 400 &&
            error.status < 500 &&
            Boolean(error.message);
          setServerError(
            isRefusal ? error.message : "Could not save. Please try again.",
          );
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <BackendImage
          className="size-10 shrink-0 rounded-full object-cover"
          fallback={<div className="size-10 shrink-0 rounded-full bg-muted" />}
          src={order?.imageUrl}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {order?.name ?? "Upholstery order"}
          </p>
          <p className="text-xs text-muted-foreground">
            {order
              ? `${order.orderAmountLabel} ordered · ${order.receivedAmountLabel} received`
              : "—"}
          </p>
        </div>
      </div>

      {check.ok && check.isDecrease ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="upholstery-order-amount-decrease-hint"
        >
          Items this order no longer covers go back to needing ordering.
        </p>
      ) : null}

      <FloatingKeyboardBar
        renderControls={({ inputRef, preventFocusSteal }) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Ordered amount
            </label>
            <div className="flex items-center rounded-2xl border border-border bg-card px-4 py-3">
              <input
                ref={inputRef}
                className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-foreground outline-none"
                data-testid="upholstery-order-amount-input"
                inputMode="decimal"
                placeholder="0.000"
                value={draft}
                onChange={(event) => {
                  setServerError(null);
                  setDraft(event.target.value);
                }}
              />
              <span className="ml-3 shrink-0 text-sm text-muted-foreground">
                m
              </span>
            </div>
            {message ? <p className="text-sm text-destructive">{message}</p> : null}
            <button
              className="mt-1 rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
              data-testid="upholstery-order-amount-save"
              disabled={updateAmount.isPending || !check.ok}
              type="button"
              onMouseDown={preventFocusSteal}
              onClick={handleSave}
            >
              Save amount
            </button>
          </div>
        )}
      />
    </div>
  );
}
