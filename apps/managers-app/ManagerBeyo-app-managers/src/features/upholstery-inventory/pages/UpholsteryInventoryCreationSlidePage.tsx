import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import {
  ContentCard,
  FieldLabelRow,
  StagedForm,
  StagedFormStep,
  SwitchCheckbox,
  TextInput,
} from "@/components/primitives";
import { UpholsteryCategoryPickerField } from "@/features/upholstery-category";
import { useUpholsteryPickerOptionQuery } from "@/features/upholstery/api/use-upholstery-picker-option";
import { useStagedForm } from "@/hooks/use-staged-form";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { ApiRequestError } from "@/lib/api-client";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

import { useCreateInventory } from "../actions/use-create-inventory";
import { useUpdateInventory } from "../actions/use-update-inventory";
import { normalizeNonNegativeDecimalString } from "../lib/decimal";
import {
  INVENTORY_CREATION_SLIDE_ID,
  isEditInventorySurfaceProps,
  isPrefillInventorySurfaceProps,
  type InventoryCreationPrefillData,
  type InventoryCreationSurfaceProps,
} from "../surfaces";
import {
  CreateInventoryFormSchema,
  type CreateInventoryFormValues,
} from "../types";

function defaultCreateValues(
  prefill?: InventoryCreationPrefillData,
): CreateInventoryFormValues {
  return {
    upholstery_category_id: null,
    name: prefill?.name ?? "",
    code: prefill?.code ?? "",
    image_url: prefill?.imageUrl ?? null,
    current_stored_amount_meters: null,
    low_stock_threshold_meters: null,
    favorite: false,
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

type FooterProps = {
  activeStepId: string;
  isPending: boolean;
  onClose: () => void;
  onBack: () => void;
  onContinue: () => void;
  onSubmit: () => void;
  submitLabel: string;
};

function InventoryCreationFooter({
  activeStepId,
  isPending,
  onClose,
  onBack,
  onContinue,
  onSubmit,
  submitLabel,
}: FooterProps): React.JSX.Element {
  const isCategoryStep = activeStepId === "category";

  return (
    <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
      <div className="flex gap-3 px-4 pb-4 pt-3">
        <button
          className="flex-1 rounded-2xl border border-between-border bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm"
          type="button"
          onClick={isCategoryStep ? onClose : onBack}
        >
          {isCategoryStep ? "Close & Back" : "Back"}
        </button>
        <button
          className="flex-1 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm disabled:opacity-50"
          disabled={isPending}
          type="button"
          onClick={isCategoryStep ? onContinue : onSubmit}
        >
          {isCategoryStep ? "Continue" : submitLabel}
        </button>
      </div>
      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
    </div>
  );
}

export function UpholsteryInventoryCreationSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<InventoryCreationSurfaceProps>();
  const editProps = isEditInventorySurfaceProps(props) ? props : null;
  const prefillProps = isPrefillInventorySurfaceProps(props) ? props : null;
  const isEditMode = Boolean(editProps);
  const isPrefillMode = Boolean(prefillProps);
  const createInventory = useCreateInventory();
  const updateInventory = useUpdateInventory();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(true);
  const editCategoryPrefillApplied = useRef(false);
  const upholsteryQuery = useUpholsteryPickerOptionQuery(
    editProps?.upholsteryId ?? null,
  );

  useEffect(() => {
    header?.setTitle(isEditMode ? "Edit inventory" : "New inventory");
    header?.setActions(null);
  }, [header, isEditMode]);

  const form = useForm<CreateInventoryFormValues>({
    resolver: zodResolver(CreateInventoryFormSchema),
    defaultValues:
      editProps
        ? {
            upholstery_category_id: editProps.prefill.upholstery_category_id,
            name: editProps.prefill.name,
            code: editProps.prefill.code,
            image_url: editProps.prefill.image_url,
            current_stored_amount_meters: null,
            low_stock_threshold_meters:
              editProps.prefill.low_stock_threshold_meters,
            favorite: editProps.prefill.favorite,
          }
        : defaultCreateValues(prefillProps?.prefill),
  });
  const selectedCategoryId = useWatch({
    control: form.control,
    name: "upholstery_category_id",
  });
  const imageUrl = useWatch({ control: form.control, name: "image_url" });

  const staged = useStagedForm({
    steps: [
      { id: "category", title: "Category" },
      { id: "details", title: "Details" },
    ],
    mode: "free",
  });

  useEffect(() => {
    setIsImagePreviewVisible(true);
  }, [imageUrl]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (isEditMode || isPrefillMode) {
      staged.setStepStatus("category", "completed");
      staged.navigateTo("details");
    }
  }, []);

  useEffect(() => {
    if (!isEditMode || editCategoryPrefillApplied.current || !upholsteryQuery.data) {
      return;
    }

    editCategoryPrefillApplied.current = true;
    form.setValue(
      "upholstery_category_id",
      upholsteryQuery.data.upholstery_category?.id ?? null,
      { shouldDirty: false },
    );
  }, [form, isEditMode, upholsteryQuery.data]);

  function handleCategoryChange(
    categoryId: string | null,
    category: {
      image_url: string | null;
    } | null,
  ): void {
    form.setValue("upholstery_category_id", categoryId, { shouldDirty: true });

    if (category) {
      const currentImageUrl = normalizeOptionalText(form.getValues("image_url"));
      const shouldAutoFillImage =
        !isEditMode || currentImageUrl === null || currentImageUrl === "";

      if (shouldAutoFillImage) {
        form.setValue("image_url", category.image_url, { shouldDirty: true });
      }
      staged.setStepStatus("category", "completed");
      staged.navigateTo("details");
    }
  }

  function handleSubmit(values: CreateInventoryFormValues): void {
    setSubmitError(null);

    if (editProps) {
      const normalizedName = values.name.trim();
      const normalizedCode = normalizeOptionalText(values.code);
      const normalizedImageUrl = normalizeOptionalText(values.image_url);
      const originalCategoryId =
        upholsteryQuery.data?.upholstery_category?.id ??
        editProps.prefill.upholstery_category_id;
      const isUnchanged =
        values.upholstery_category_id === originalCategoryId &&
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
          original: {
            ...editProps.prefill,
            upholstery_category_id: originalCategoryId,
          },
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

    createInventory.mutate(
      {
        client_id: prefillProps?.prefill.upholsteryClientId ?? null,
        upholstery_category_id: values.upholstery_category_id,
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
      },
      {
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
      },
    );
  }

  const isPending = isEditMode
    ? updateInventory.isPending || upholsteryQuery.isPending
    : createInventory.isPending;

  return (
    <form
      className="flex h-full flex-col bg-background"
      noValidate
      onSubmit={(event) => event.preventDefault()}
    >
      <StagedForm
        activeStepId={staged.activeStepId}
        direction={staged.direction}
        footer={
          <InventoryCreationFooter
            activeStepId={staged.activeStepId}
            isPending={isPending}
            onBack={staged.back}
            onClose={() => header?.requestClose()}
            onContinue={() => {
              staged.setStepStatus("category", "completed");
              staged.navigateTo("details");
            }}
            onSubmit={form.handleSubmit(handleSubmit)}
            submitLabel={isEditMode ? "Save" : "Create"}
          />
        }
        isAdvancing={staged.isAdvancing}
        isFirstStep={staged.isFirstStep}
        isLastStep={staged.isLastStep}
        navigationMode={staged.navigationMode}
        showNavigation={false}
        stepStatusMap={staged.stepStatusMap}
        steps={staged.steps}
        onAdvance={staged.advance}
        onBack={staged.back}
        onNavigate={staged.navigateTo}
      >
        <StagedFormStep id="category" className="px-0">
          <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
            <UpholsteryCategoryPickerField
              prefillCategoryId={
                isEditMode
                  ? upholsteryQuery.data?.upholstery_category?.id ??
                    editProps?.prefill.upholstery_category_id
                  : null
              }
              value={selectedCategoryId}
              onChange={handleCategoryChange}
            />
          </div>
        </StagedFormStep>

        <StagedFormStep id="details" className="px-0">
          <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
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
          </div>
        </StagedFormStep>
      </StagedForm>
    </form>
  );
}
