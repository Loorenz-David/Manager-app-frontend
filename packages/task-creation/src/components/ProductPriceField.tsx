import type { RefObject } from "react";

import { useController, useFormContext, useWatch } from "react-hook-form";

import {
  FieldErrorPill,
  FieldLabelRow,
  FloatingKeyboardBar,
  NumberInput,
  useKeyboardAccessoryPriority,
} from "@beyo/ui";

import {
  formatPreOrderPieces,
  formatPreOrderPrice,
  resolvePreOrderQuantity,
  resolvePreOrderTotalPrice,
} from "../lib/pre-order-price";
import type { PreOrderFormValues } from "../types";

type ProductPriceControlsProps = {
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  isFloating: boolean;
  quantity: number;
  unitPrice: number | null;
  onBlur: () => void;
  onChange: (value: number | null) => void;
};

/**
 * The input and the total live in one block on purpose: `FloatingKeyboardBar`
 * mirrors whatever this renders into the tray above the keyboard, so the
 * running total stays in front of the user while they type the piece price.
 */
function ProductPriceControls({
  error,
  inputRef,
  isFloating,
  quantity,
  unitPrice,
  onBlur,
  onChange,
}: ProductPriceControlsProps): React.JSX.Element {
  // The staged form's Next/Done accessory shares this tray's anchor, so it
  // stands down while the price is docked instead of stacking on top of it.
  useKeyboardAccessoryPriority(isFloating);

  // Both copies sit in the DOM while the tray is up, and ids may not collide.
  // The inline copy keeps the plain ids, so selectors elsewhere keep resolving
  // to the copy that is in the page when the keyboard is closed.
  const idSuffix = isFloating ? "-floating" : "";
  const fieldId = `pre-order-product-price${idSuffix}`;
  const totalPrice = resolvePreOrderTotalPrice(unitPrice, quantity);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <FieldLabelRow htmlFor={fieldId} label="Price per piece (kr)">
          <FieldErrorPill
            data-testid={`pre-order-product-price${idSuffix}-error`}
            message={error}
          />
        </FieldLabelRow>
        <NumberInput
          ref={inputRef}
          id={fieldId}
          inputTestId={`pre-order-product-price${idSuffix}-input`}
          incrementTestId={`pre-order-product-price${idSuffix}-increment-button`}
          decrementTestId={`pre-order-product-price${idSuffix}-decrement-button`}
          min={0}
          step={500}
          allowDecimal
          inputMode="decimal"
          placeholder="e.g. 5200"
          unitLabel="kr / pc"
          invalid={Boolean(error)}
          value={unitPrice}
          onBlur={onBlur}
          onValueChange={(nextValue) => onChange(nextValue ?? null)}
        />
      </div>
      <div
        className="flex items-end justify-between gap-3 border-t border-[var(--color-between-border)] pt-3"
        data-testid={`pre-order-product-price${idSuffix}-total`}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total
          </span>
          <span
            className="truncate text-sm text-muted-foreground"
            data-testid={`pre-order-product-price${idSuffix}-breakdown`}
          >
            {formatPreOrderPieces(quantity)}
            {unitPrice == null ? "" : ` × ${formatPreOrderPrice(unitPrice)}`}
          </span>
        </div>
        <span className="shrink-0 text-2xl font-bold tabular-nums text-foreground">
          {totalPrice == null ? "—" : formatPreOrderPrice(totalPrice)}
        </span>
      </div>
    </div>
  );
}

export function ProductPriceField(): React.JSX.Element {
  const { control } = useFormContext<PreOrderFormValues>();
  const { field, fieldState } = useController({
    name: "product_unit_price",
    control,
  });
  const itemQuantity = useWatch({ control, name: "item.quantity" });
  const quantity = resolvePreOrderQuantity(itemQuantity);
  const error = fieldState.error?.message;

  return (
    <FloatingKeyboardBar
      // The tray's default breathing room leaves the total sitting almost on
      // the keys, so this one rides higher. Deliberately a flat gap and not the
      // shared `--safe-bottom` term: the tray is anchored to the top edge of
      // the keyboard, which already covers the home indicator, so adding that
      // inset would only make the gap 34px wider on iPhones than everywhere
      // else. One number, same air on every device.
      className="pb-10"
      // The total is the point of docking, so the step must not be scrollable
      // out from under it while the price is being typed.
      lockScroll
      renderControls={({ inputRef, isFloating }) => (
        <ProductPriceControls
          error={error}
          inputRef={inputRef}
          isFloating={isFloating}
          quantity={quantity}
          unitPrice={field.value ?? null}
          onBlur={field.onBlur}
          onChange={field.onChange}
        />
      )}
    />
  );
}
