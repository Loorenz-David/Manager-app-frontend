import {
  RotateCcw as RotateCcwIcon,
  Store as StoreIcon,
  Undo as UndoIcon,
} from "lucide-react";
import { useController, useFormContext } from "react-hook-form";

import { BoxPicker } from "@beyo/ui";

type ReturnSourceValue = "after_purchase" | "before_purchase" | "store_return";

const OPTIONS = [
  {
    value: "after_purchase",
    label: "After purchase",
    description: "The item is returned after being purchased.",
    icon: UndoIcon,
    testId: "task-return-source-after-purchase-option",
  },
  {
    value: "before_purchase",
    label: "Before purchase",
    description: "The item is returned before the purchase is completed.",
    icon: RotateCcwIcon,
    testId: "task-return-source-before-purchase-option",
  },
  {
    value: "store_return",
    label: "Store return",
    description: "The item is returned internally from the store.",
    icon: StoreIcon,
    testId: "task-return-source-store-return-option",
  },
];

export function TaskReturnSourceField(): React.JSX.Element {
  const { control } = useFormContext();
  const { field, fieldState } = useController({
    name: "return_source",
    control,
  });
  const selectedValue = (field.value ?? null) as ReturnSourceValue | null;
  const visibleOptions =
    selectedValue === null
      ? OPTIONS
      : OPTIONS.filter((option) => option.value === selectedValue);

  const handleValueChange = (nextValue: string) => {
    if (nextValue === selectedValue) {
      field.onChange(null);
      return;
    }

    field.onChange(nextValue);
  };

  return (
    <div
      className="flex flex-col gap-1.5"
      data-testid="task-return-source-field"
    >
      <label className="text-sm font-medium text-muted-foreground">
        Return source
      </label>
      <BoxPicker
        mode="single"
        value={selectedValue}
        options={visibleOptions}
        onValueChange={handleValueChange}
        layout="stack"
        visualVariant="horizontalDescription"
        showIcon
        data-testid="task-return-source-picker"
      />
      {fieldState.error?.message ? (
        <p
          className="text-xs text-destructive"
          data-testid="task-return-source-error"
          role="alert"
        >
          {fieldState.error.message}
        </p>
      ) : null}
    </div>
  );
}
