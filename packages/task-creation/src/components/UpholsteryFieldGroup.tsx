import { useController, useFormContext } from "react-hook-form";

import { ItemUpholsteryAmountField, ItemUpholsteryField } from "@beyo/upholstery";

type UpholsteryFieldGroupProps = {
  quantity?: number | null;
};

/**
 * The upholstery block shared by all three task-creation forms: the picker
 * field with its None option, plus the amount field that only makes sense once
 * the item can actually have upholstery.
 *
 * Reads the form through context rather than a typed `control` prop — the three
 * forms have different value types but identical field paths here, which is the
 * same trade `ItemUpholsteryAmountField` already makes.
 */
export function UpholsteryFieldGroup({
  quantity = 0,
}: UpholsteryFieldGroupProps): React.JSX.Element {
  const { control, setValue } = useFormContext();
  const { field: upholsteryField } = useController({
    name: "item_upholstery.upholstery_client_id",
    control,
  });
  const { field: canHaveUpholsteryField } = useController({
    name: "item.can_have_upholstery",
    control,
  });

  const canHaveUpholstery = canHaveUpholsteryField.value as
    | boolean
    | null
    | undefined;
  const isNone = canHaveUpholstery === false;

  function clearAmount(): void {
    setValue("item_upholstery.upholstery_amount_meters", null, {
      shouldDirty: true,
    });
  }

  function handleChange(nextClientId: string | null): void {
    upholsteryField.onChange(nextClientId);

    if (nextClientId === null) {
      clearAmount();
    }
  }

  function handleCanHaveUpholsteryChange(next: boolean | null): void {
    // `undefined` keeps the key out of the create payload entirely, which is
    // what "never recorded" means to the backend.
    canHaveUpholsteryField.onChange(next ?? undefined);

    if (next === false) {
      upholsteryField.onChange(null);
      clearAmount();
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <ItemUpholsteryField
          canHaveUpholstery={canHaveUpholstery ?? null}
          onCanHaveUpholsteryChange={handleCanHaveUpholsteryChange}
          onChange={handleChange}
          value={upholsteryField.value as string | null | undefined}
        />
      </div>
      {isNone ? null : <ItemUpholsteryAmountField quantity={quantity ?? 0} />}
    </>
  );
}
