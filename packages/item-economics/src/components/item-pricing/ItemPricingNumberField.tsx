import { useController, useFormContext } from "react-hook-form";

import { FieldErrorPill, FieldLabelRow, NumberInput } from "@beyo/ui";

import { ItemPricingTotalRow } from "./ItemPricingTotalRow";

export type ItemPricingNumberFieldProps = {
  name: string;
  /** Shown when the total row is hidden — a wood item is a single piece. */
  label: string;
  /** Shown when the total row is visible, so the label states the unit. */
  perPieceLabel: string;
  placeholder: string;
  testId: string;
  quantity: number;
  /** Seats only: render the quantity × price breakdown beneath the input. */
  showTotal: boolean;
};

/**
 * The shared body of both pricing inputs. The two exported fields differ only
 * in their name, copy and test ids, so the markup lives here once — a drift
 * between the purchase price and the sale price would be a bug, not a variant.
 */
export function ItemPricingNumberField({
  name,
  label,
  perPieceLabel,
  placeholder,
  testId,
  quantity,
  showTotal,
}: ItemPricingNumberFieldProps): React.JSX.Element {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });
  const error = fieldState.error?.message;

  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      <div className="flex flex-col gap-1.5">
        <FieldLabelRow
          htmlFor={testId}
          label={showTotal ? perPieceLabel : label}
          optional
        >
          <FieldErrorPill data-testid={`${testId}-error`} message={error} />
        </FieldLabelRow>
        <NumberInput
          id={testId}
          inputTestId={`${testId}-input`}
          incrementTestId={`${testId}-increment-button`}
          decrementTestId={`${testId}-decrement-button`}
          min={0}
          step={100}
          allowDecimal
          inputMode="decimal"
          placeholder={placeholder}
          unitLabel={showTotal ? "kr / pc" : "kr"}
          invalid={Boolean(error)}
          value={(field.value as number | null | undefined) ?? null}
          onBlur={field.onBlur}
          onValueChange={(nextValue) => field.onChange(nextValue ?? null)}
        />
      </div>
      {showTotal ? (
        <ItemPricingTotalRow
          perPiece={(field.value as number | null | undefined) ?? null}
          quantity={quantity}
          testId={testId}
        />
      ) : null}
    </div>
  );
}
