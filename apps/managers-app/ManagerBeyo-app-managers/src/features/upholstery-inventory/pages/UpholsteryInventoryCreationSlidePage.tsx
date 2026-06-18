import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import { ApiRequestError } from "@/lib/api-client";
import {
  ContentCard,
  FieldLabelRow,
  SwitchCheckbox,
  TextInput,
} from "@/components/primitives";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

import { useCreateInventory } from "../actions/use-create-inventory";
import { useUpdateInventory } from "../actions/use-update-inventory";
import { normalizeNonNegativeDecimalString } from "../lib/decimal";
import {
  INVENTORY_CREATION_SLIDE_ID,
  type InventoryCreationSurfaceProps,
} from "../surfaces";
import {
  CreateInventoryFormSchema,
  type CreateInventoryFormValues,
} from "../types";

function defaultCreateValues(): CreateInventoryFormValues {
  return {
    name: "",
    code: "",
    image_url: null,
    current_stored_amount_meters: null,
    low_stock_threshold_meters: null,
    favorite: false,
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function isEditInventorySurfaceProps(
  props: Partial<InventoryCreationSurfaceProps>,
): props is InventoryCreationSurfaceProps {
  return (
    props.mode === "edit" &&
    Boolean(props.upholsteryId) &&
    Boolean(props.inventoryId) &&
    Boolean(props.prefill)
  );
}

export function UpholsteryInventoryCreationSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<InventoryCreationSurfaceProps>();
  const editProps = isEditInventorySurfaceProps(props) ? props : null;
  const isEditMode = Boolean(editProps);
  const createInventory = useCreateInventory();
  const updateInventory = useUpdateInventory();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(true);

  useEffect(() => {
    header?.setTitle(isEditMode ? "Edit inventory" : "New inventory");
    header?.setActions(null);
  }, [header, isEditMode]);

  const form = useForm<CreateInventoryFormValues>({
    resolver: zodResolver(CreateInventoryFormSchema),
    defaultValues:
      editProps
        ? {
            name: editProps.prefill.name,
            code: editProps.prefill.code,
            image_url: editProps.prefill.image_url,
            current_stored_amount_meters: null,
            low_stock_threshold_meters:
              editProps.prefill.low_stock_threshold_meters,
            favorite: editProps.prefill.favorite,
          }
        : defaultCreateValues(),
  });

  const imageUrl = useWatch({ control: form.control, name: "image_url" });

  useEffect(() => {
    setIsImagePreviewVisible(true);
  }, [imageUrl]);

  function handleSubmit(values: CreateInventoryFormValues): void {
    setSubmitError(null);

    if (editProps) {
      const normalizedName = values.name.trim();
      const normalizedCode = normalizeOptionalText(values.code);
      const normalizedImageUrl = normalizeOptionalText(values.image_url);
      const isUnchanged =
        normalizedName === editProps.prefill.name &&
        normalizedCode === normalizeOptionalText(editProps.prefill.code) &&
        normalizedImageUrl ===
          normalizeOptionalText(editProps.prefill.image_url) &&
        values.favorite === editProps.prefill.favorite &&
        (normalizeNonNegativeDecimalString(
          values.low_stock_threshold_meters ?? "",
        ) ?? null) ===
          (normalizeNonNegativeDecimalString(
            editProps.prefill.low_stock_threshold_meters ?? "",
          ) ?? null);

      if (isUnchanged) {
        useSurfaceStore.getState().close(INVENTORY_CREATION_SLIDE_ID);
        return;
      }

      updateInventory.mutate(
        {
          upholsteryId: editProps.upholsteryId,
          inventoryId: editProps.inventoryId,
          values,
          original: editProps.prefill,
        },
        {
          onSuccess: () => {
            useSurfaceStore.getState().close(INVENTORY_CREATION_SLIDE_ID);
          },
          onError: (error) => {
            setSubmitError(
              error instanceof ApiRequestError
                ? error.message
                : "Could not save changes. Please try again.",
            );
          },
        },
      );
      return;
    }

    const payload = {
      name: values.name.trim(),
      code: normalizeOptionalText(values.code),
      image_url: normalizeOptionalText(values.image_url),
      current_stored_amount_meters:
        normalizeNonNegativeDecimalString(
          values.current_stored_amount_meters ?? "",
        ) ?? null,
      low_stock_threshold_meters: values.low_stock_threshold_meters
        ? (normalizeNonNegativeDecimalString(values.low_stock_threshold_meters) ??
          null)
        : null,
      favorite: values.favorite,
    };

    createInventory.mutate(payload, {
      onSuccess: () => {
        useSurfaceStore.getState().close(INVENTORY_CREATION_SLIDE_ID);
      },
      onError: (error) => {
        setSubmitError(
          error instanceof ApiRequestError
            ? error.message
            : "Could not create inventory. Please try again.",
        );
      },
    });
  }

  const isPending = isEditMode
    ? updateInventory.isPending
    : createInventory.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-none">
        <form
          className="flex flex-col gap-4 px-4 pb-[calc(var(--safe-bottom,0)+8rem)] pt-4"
          noValidate
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <ContentCard>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <FieldLabelRow htmlFor="inventory-name" label="Name" />
                  <TextInput
                    ref={field.ref}
                    id="inventory-name"
                    invalid={Boolean(fieldState.error)}
                    value={field.value}
                    wrapperClassName="bg-card"
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                  {fieldState.error ? (
                    <p className="text-sm text-destructive">
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <FieldLabelRow
                    htmlFor="inventory-code"
                    label="Code"
                    optional
                  />
                  <TextInput
                    ref={field.ref}
                    id="inventory-code"
                    invalid={Boolean(fieldState.error)}
                    value={field.value}
                    wrapperClassName="bg-card"
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                  {fieldState.error ? (
                    <p className="text-sm text-destructive">
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </div>
              )}
            />
          </ContentCard>

          <ContentCard>
            <Controller
              control={form.control}
              name="image_url"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <FieldLabelRow
                    htmlFor="inventory-image-url"
                    label="Image URL"
                    optional
                  />
                  <TextInput
                    ref={field.ref}
                    id="inventory-image-url"
                    invalid={Boolean(fieldState.error)}
                    value={field.value ?? ""}
                    wrapperClassName="bg-card"
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                  />
                  {fieldState.error ? (
                    <p className="text-sm text-destructive">
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </div>
              )}
            />

            {imageUrl && isImagePreviewVisible ? (
              <img
                alt=""
                className="mt-1 h-44 w-full rounded-xl object-cover"
                src={imageUrl}
                onError={() => setIsImagePreviewVisible(false)}
              />
            ) : null}
          </ContentCard>

          {!isEditMode ? (
            <ContentCard>
              <Controller
                control={form.control}
                name="current_stored_amount_meters"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <FieldLabelRow
                      htmlFor="inventory-stored-amount"
                      label="Stored amount"
                      optional
                    />
                    <TextInput
                      ref={field.ref}
                      id="inventory-stored-amount"
                      inputMode="decimal"
                      invalid={Boolean(fieldState.error)}
                      placeholder="0.000"
                      value={field.value ?? ""}
                      wrapperClassName="bg-card"
                      onBlur={field.onBlur}
                      onChange={(event) =>
                        field.onChange(event.target.value || null)
                      }
                    />
                    {fieldState.error ? (
                      <p className="text-sm text-destructive">
                        {fieldState.error.message}
                      </p>
                    ) : null}
                  </div>
                )}
              />
            </ContentCard>
          ) : null}

          <ContentCard>
            <Controller
              control={form.control}
              name="low_stock_threshold_meters"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <FieldLabelRow
                    htmlFor="inventory-low-stock-threshold"
                    label="Low stock threshold"
                    optional
                  />
                  <TextInput
                    ref={field.ref}
                    id="inventory-low-stock-threshold"
                    inputMode="decimal"
                    invalid={Boolean(fieldState.error)}
                    placeholder="0.000"
                    value={field.value ?? ""}
                    wrapperClassName="bg-card"
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                  />
                  {fieldState.error ? (
                    <p className="text-sm text-destructive">
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </div>
              )}
            />
          </ContentCard>

          <ContentCard>
            <div className="flex items-center justify-between gap-4">
              <FieldLabelRow label="Favorite" optional />
              <Controller
                control={form.control}
                name="favorite"
                render={({ field }) => (
                  <SwitchCheckbox
                    checked={field.value}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                )}
              />
            </div>
          </ContentCard>

          {submitError ? (
            <p className="px-1 text-sm text-destructive">{submitError}</p>
          ) : null}
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]">
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-2xl border border-between-border bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm"
            type="button"
            onClick={() => header?.requestClose()}
          >
            Close & Back
          </button>
          <button
            className="flex-1 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm disabled:opacity-50"
            disabled={isPending}
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
          >
            {isEditMode ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
