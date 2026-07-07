import { useEffect } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { FormProvider, useForm } from "react-hook-form";

import { ItemPositionZoneField } from "../components/ItemPositionZoneField";
import type { ItemPositionSheetSurfaceProps } from "../surface-ids";

export function ItemPositionSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { initialPosition = null, initialZone = null, openField, onSave } =
    useSurfaceProps<ItemPositionSheetSurfaceProps>();
  const form = useForm({
    defaultValues: {
      item: {
        item_position: initialPosition ?? "",
        item_zone: initialZone ?? "",
      },
    },
  });

  useEffect(() => {
    header?.setTitle("Edit position");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    form.reset({
      item: {
        item_position: initialPosition ?? "",
        item_zone: initialZone ?? "",
      },
    });
  }, [form, initialPosition, initialZone]);

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-4 p-6">
        <ItemPositionZoneField
          defaultTab={openField ?? "position"}
          disableLookup
        />
        <button
          data-testid="item-position-save-button"
          type="button"
          className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
          disabled={!onSave}
          onClick={() => {
            if (!onSave) {
              return;
            }

            const values = form.getValues();
            const nextPosition = values.item.item_position?.trim() || null;
            const nextZone = values.item.item_zone?.trim() || null;
            const zoneDirty = Boolean(form.formState.dirtyFields.item?.item_zone);

            onSave({
              item_position: nextPosition,
              item_zone: zoneDirty ? nextZone : undefined,
            });
            header?.requestClose();
          }}
        >
          Save position
        </button>
      </div>
    </FormProvider>
  );
}
