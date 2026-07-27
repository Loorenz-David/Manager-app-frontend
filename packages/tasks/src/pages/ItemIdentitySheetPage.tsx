import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { ItemIdentityField } from "@beyo/items";
import { useSurfaceStore } from "@beyo/ui";

import { useUpdateItem } from "../actions/use-update-item";
import { useGetTaskQuery } from "../api/use-get-task-query";
import {
  ITEM_IDENTITY_SHEET_SURFACE_ID,
  type ItemIdentitySurfaceProps,
} from "../surface-ids";

type ItemIdentityFormValues = {
  item: {
    article_number: string;
    sku: string;
  };
};

function toFieldValue(value: string | null | undefined): string {
  return value ?? "";
}

function toPatchValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function ItemIdentitySheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, itemId, prefill } =
    useSurfaceProps<ItemIdentitySurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateItem = useUpdateItem(taskId ?? "");
  const item = taskQuery.data?.item ?? null;

  const form = useForm<ItemIdentityFormValues>({
    defaultValues: {
      item: {
        article_number: prefill?.article_number ?? "",
        sku: prefill?.sku ?? "",
      },
    },
  });

  useEffect(() => {
    header?.setTitle("Article number & SKU");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (!item || prefill) return;
    form.reset({
      item: {
        article_number: toFieldValue(item.article_number),
        sku: toFieldValue(item.sku),
      },
    });
    // Seed the form from the item once it loads; keyed on the item identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.client_id]);

  const articleNumber = useWatch({
    control: form.control,
    name: "item.article_number",
  });
  const sku = useWatch({ control: form.control, name: "item.sku" });

  const nextArticleNumber = toPatchValue(articleNumber ?? "");
  const nextSku = toPatchValue(sku ?? "");
  const hasChanges =
    Boolean(item) &&
    (nextArticleNumber !== (item?.article_number ?? null) ||
      nextSku !== (item?.sku ?? null));

  function handleSubmit(values: ItemIdentityFormValues): void {
    if (!item || !itemId) return;

    const articleNumberValue = toPatchValue(values.item.article_number);
    const skuValue = toPatchValue(values.item.sku);

    // Only send what actually changed — the backend applies fields via
    // model_fields_set, so an omitted key leaves the column untouched.
    const changes: { article_number?: string | null; sku?: string | null } = {};
    if (articleNumberValue !== (item.article_number ?? null)) {
      changes.article_number = articleNumberValue;
    }
    if (skuValue !== (item.sku ?? null)) {
      changes.sku = skuValue;
    }
    if (Object.keys(changes).length === 0) {
      header?.requestClose();
      return;
    }

    header?.requestClose();
    updateItem.mutate(
      { id: itemId, ...changes },
      {
        onError: () => {
          useSurfaceStore.getState().open(ITEM_IDENTITY_SHEET_SURFACE_ID, {
            taskId: taskId ?? "",
            itemId,
            prefill: {
              article_number: values.item.article_number,
              sku: values.item.sku,
            },
          } satisfies ItemIdentitySurfaceProps);
        },
      },
    );
  }

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-10 p-6"
        data-testid="item-identity-sheet-page"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <ItemIdentityField disableLookup />
        <button
          type="submit"
          className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
          data-testid="item-identity-save-button"
          disabled={updateItem.isPending || !item || !itemId || !hasChanges}
        >
          Save
        </button>
      </form>
    </FormProvider>
  );
}
