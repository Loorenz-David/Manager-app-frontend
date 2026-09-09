import { BoxSlidePicker, type BoxSlidePickerOptionType } from "@beyo/ui";

import type { ProductionTimeUnit } from "../../lib/production-time-view-model";

const UNIT_OPTIONS: readonly BoxSlidePickerOptionType<ProductionTimeUnit>[] = [
  {
    value: "total",
    label: "Order",
    ariaLabel: "Show times for the whole order",
    testId: "production-time-unit-total",
  },
  {
    value: "piece",
    label: "Per piece",
    ariaLabel: "Show times for one piece",
    testId: "production-time-unit-piece",
  },
];

export type ProductionTimeUnitToggleProps = {
  value: ProductionTimeUnit;
  onChange: (value: ProductionTimeUnit) => void;
};

/**
 * States, for the whole card at once, which unit its durations are in.
 *
 * Rendered only when the order is more than one piece — at quantity 1 the two
 * readings are the same numbers, and a control that changes nothing is worse
 * than no control at all. It is also why no figure on the card carries a "pc"
 * marker any more: this is the single place the unit is named, so a per-piece
 * figure can never turn up unannounced beside a whole-order one.
 */
export function ProductionTimeUnitToggle({
  value,
  onChange,
}: ProductionTimeUnitToggleProps): React.JSX.Element {
  return (
    <BoxSlidePicker
      ariaLabel="Show production times for the whole order or per piece"
      dataTestId="production-time-unit-toggle"
      distribution="content"
      options={UNIT_OPTIONS}
      size="sm"
      value={value}
      onValueChange={onChange}
    />
  );
}
