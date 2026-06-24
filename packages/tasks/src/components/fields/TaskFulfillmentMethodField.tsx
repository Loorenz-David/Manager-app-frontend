import { Store as StoreIcon, Truck as TruckIcon } from "lucide-react";
import { useController, useFormContext } from "react-hook-form";

import { BoxPicker } from "@beyo/ui";

type FulfillmentMethodValue = "pickup_at_store" | "delivery";

const OPTIONS = [
  {
    value: "pickup_at_store",
    label: "Pickup at store",
    icon: StoreIcon,
    testId: "task-fulfillment-method-pickup-at-store-option",
  },
  {
    value: "delivery",
    label: "Delivery",
    icon: TruckIcon,
    testId: "task-fulfillment-method-delivery-option",
  },
];

export function TaskFulfillmentMethodField(): React.JSX.Element {
  const { control } = useFormContext();
  const { field, fieldState } = useController({
    name: "fulfillment_method",
    control,
  });

  return (
    <div className="flex flex-col gap-1.5" data-testid="task-fulfillment-method-field">
      <label className="text-sm font-medium text-muted-foreground">Fulfillment method</label>
      <BoxPicker
        mode="single"
        value={field.value ?? null}
        options={OPTIONS}
        onValueChange={(value) => field.onChange(value as FulfillmentMethodValue)}
        layout="grid"
        visualVariant="default"
        columns={2}
        data-testid="task-fulfillment-method-picker"
      />
      {fieldState.error?.message ? (
        <p
          className="text-xs text-destructive"
          data-testid="task-fulfillment-method-error"
          role="alert"
        >
          {fieldState.error.message}
        </p>
      ) : null}
    </div>
  );
}
