import { useEffect, useEffectEvent, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { AuthRole, useRole } from "@beyo/auth";
import {
  CustomerAddressFieldGroup,
  CustomerDisplayNameField,
  CustomerEmailField,
  CustomerPhoneField,
  CustomerTypeField,
} from "@beyo/customers";
import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
import { usePreloadSurface, useStagedForm, useSurface } from "@beyo/hooks";
import { ItemCategorySelectionField } from "@beyo/item-categories";
import {
  ContentCard,
  StagedForm,
  StagedFormStep,
  usePrefetchOnCondition,
} from "@beyo/ui";
import {
  ItemIdentityField,
  ItemPositionZoneField,
  ItemQuantityField,
  type ItemLookupResult,
} from "@beyo/items";
import {
  CameraPrewarm,
  SCANNER_SESSION_ID,
  SCANNER_SLIDE_SURFACE_ID,
  type ScanFormat,
  type ScannerSlideSurfaceProps,
} from "@beyo/scanner";
import {
  // TaskDeliveryDateField,
  TaskFulfillmentMethodField,
  TaskReadyByDateField,
  useCreateTask,
} from "@beyo/tasks";
import { TaskNoteComposer, TaskNoteImagesSection } from "@beyo/task-notes";
import {
  ItemUpholsteryAmountField,
  ItemUpholsteryField,
  preloadUpholsteryPickerSurface,
} from "@beyo/upholstery";
import {
  WorkingSectionPickerField,
  preloadWorkingSectionWorkerPickerSurface,
} from "@beyo/working-sections";
import {
  Controller,
  FormProvider,
  useForm,
  useWatch,
  type Control,
  type FieldPath,
} from "react-hook-form";

import {
  createLookupResultSignature,
  findCachedItemCategoryOption,
  selectPurchaseApiLookupResult,
} from "../lib/item-lookup-prefill";
import { useLookupItemImages } from "../hooks/use-lookup-item-images";
import { useShopifyCustomerLookupPrefill } from "../hooks/use-shopify-customer-lookup-prefill";
import { normalizeReturnFormPayload } from "../lib/normalize-task-form-payload";
import { buildPreOrderFormDefaultValues } from "../lib/pre-order-form-default-values";
import { prefetchTaskCreationFormData } from "../lib/prefetch-task-creation-form-data";
import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";
import { ShopifyCustomerStatusPill } from "./ShopifyCustomerStatusPill";
import { TaskCreationAssignmentFooter } from "./TaskCreationAssignmentFooter";
import { TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX } from "./TaskCreationAssignmentFooter";
import { TaskCreationStagedFormHeader } from "./TaskCreationStagedFormHeader";
import { PreOrderFormSchema, type PreOrderFormValues } from "../types";
import {
  // CALENDAR_RANGE_PICKER_SURFACE_ID,
  CALENDAR_SINGLE_PICKER_SURFACE_ID,
  TASK_CREATION_PRE_ORDER_SURFACE_ID,
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
  preloadItemCategoryPickerSurface,
  preloadPhoneCountryPickerSurface,
  preloadScannerSlideSurface,
} from "../surfaces";

const PRE_ORDER_STEP_FIELDS_MAP: Record<
  string,
  FieldPath<PreOrderFormValues>[]
> = {
  task: [
    "item.article_number",
    "item.sku",
    "item.designer",
    "item.quantity",
    "item.item_position",
    "item.item_zone",
    "item.item_currency",
    "item.item_category_id",
    "item.major_category",
    "item_upholstery.upholstery_client_id",
    "item_upholstery.upholstery_amount_meters",
  ],
  customer: [
    "customer",
    "fulfillment_method",
    "scheduled_start_at",
    "scheduled_end_at",
  ],
  assignment: ["working_section_assignments"],
  details: ["item_issues", "note_content", "ready_by_at"],
};

function UpholsteryField({
  control,
}: {
  control: Control<PreOrderFormValues>;
}): React.JSX.Element {
  return (
    <Controller
      name="item_upholstery.upholstery_client_id"
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-1.5">
          <ItemUpholsteryField value={field.value} onChange={field.onChange} />
        </div>
      )}
    />
  );
}

export function PreOrderFormContent(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigateToRef = useRef<(stepId: string) => void>(() => {});
  const lastAppliedLookupSignatureRef = useRef<string | null>(null);
  const [positionErrorRevealNonce, setPositionErrorRevealNonce] = useState(0);
  const { hasRole } = useRole();
  const isSeller = hasRole(AuthRole.Seller);

  usePreloadSurface(preloadCalendarRangePickerSurface);
  usePreloadSurface(preloadCalendarSinglePickerSurface);
  usePreloadSurface(preloadItemCategoryPickerSurface);
  usePreloadSurface(preloadScannerSlideSurface);
  usePreloadSurface(preloadPhoneCountryPickerSurface);
  usePreloadSurface(preloadWorkingSectionWorkerPickerSurface);
  usePreloadSurface(preloadUpholsteryPickerSurface);
  usePrefetchOnCondition(true, () => prefetchTaskCreationFormData(queryClient));

  const {
    taskClientId,
    itemClientId,
    customerClientId,
    noteClientId,
    currentUserClientId,
    callbacks,
    initialItemSku,
  } = useTaskCreationFormContext();
  const createTask = useCreateTask();
  const applyLookupImages = useLookupItemImages(itemClientId);
  const surface = useSurface();
  const form = useForm<PreOrderFormValues>({
    resolver: zodResolver(PreOrderFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: buildPreOrderFormDefaultValues(initialItemSku),
  });
  const majorCategory = useWatch({
    control: form.control,
    name: "item.major_category",
  });
  const { errors } = form.formState;
  const itemQuantity = useWatch({
    control: form.control,
    name: "item.quantity",
  });
  const itemArticleNumber = useWatch({
    control: form.control,
    name: "item.article_number",
  });
  const itemSku = useWatch({
    control: form.control,
    name: "item.sku",
  });
  const {
    status: shopifyCustomerLookupStatus,
    retry: retryShopifyCustomerLookup,
  } = useShopifyCustomerLookupPrefill({
    form,
    articleNumber: itemArticleNumber,
    sku: itemSku,
    enabled: true,
  });
  const handleLookupResult = useEffectEvent((items: ItemLookupResult[]) => {
    const selectedItem = selectPurchaseApiLookupResult(items);

    if (!selectedItem) {
      return false;
    }

    const signature = createLookupResultSignature(selectedItem);
    if (signature && signature === lastAppliedLookupSignatureRef.current) {
      return false;
    }

    const matchedCategory = findCachedItemCategoryOption(
      queryClient,
      selectedItem.item_category_id,
    );

    form.setValue(
      "item.item_category_id",
      selectedItem.item_category_id ?? undefined,
      {
        shouldDirty: true,
      },
    );
    form.setValue("item.article_number", selectedItem.article_number, {
      shouldDirty: true,
    });
    form.setValue("item.major_category", matchedCategory?.major_category, {
      shouldDirty: true,
    });
    form.setValue("item.quantity", selectedItem.quantity, {
      shouldDirty: true,
    });

    applyLookupImages(selectedItem.images);

    lastAppliedLookupSignatureRef.current = signature;
    return true;
  });

  function handleOpenScanner(tab: "article_number" | "sku"): void {
    const scanFormat: ScanFormat = tab === "article_number" ? "barcode" : "qr";

    surface.open(SCANNER_SLIDE_SURFACE_ID, {
      sessionId: SCANNER_SESSION_ID,
      scanFormat,
      onScan: (value: string) => {
        form.setValue(
          tab === "article_number" ? "item.article_number" : "item.sku",
          value,
          { shouldDirty: true },
        );
        surface.close(SCANNER_SLIDE_SURFACE_ID);
      },
    } satisfies ScannerSlideSurfaceProps);
  }

  const steps = [
    { id: "task", title: "Task" },
    { id: "customer", title: "Customer" },
    ...(!isSeller
      ? ([{ id: "assignment", title: "Assignment" }] as const)
      : []),
    { id: "details", title: "Details" },
  ];

  const staged = useStagedForm({
    steps,
    mode: "free",
    onBeforeAdvance: async (currentStepId, _nextStepId, setStatus) => {
      if (currentStepId === "details") {
        const allValid = await form.trigger();

        if (!allValid) {
          setPositionErrorRevealNonce((current) => current + 1);
          const { errors } = form.formState;
          let firstErrorStep: string | null = null;

          if (errors.item ?? errors.item_upholstery) {
            setStatus("task", "error");
            firstErrorStep ??= "task";
          }
          if (
            errors.customer ??
            errors.fulfillment_method ??
            errors.scheduled_start_at ??
            errors.scheduled_end_at
          ) {
            setStatus("customer", "error");
            firstErrorStep ??= "customer";
          }
          if (!isSeller && errors.working_section_assignments) {
            setStatus("assignment", "error");
            firstErrorStep ??= "assignment";
          }
          if (errors.item_issues ?? errors.note_content ?? errors.ready_by_at) {
            setStatus("details", "error");
          }

          if (firstErrorStep) {
            navigateToRef.current(firstErrorStep);
          }
        }

        return allValid;
      }

      const stepValid = await form.trigger(
        PRE_ORDER_STEP_FIELDS_MAP[currentStepId] ?? [],
      );

      if (!stepValid) {
        setPositionErrorRevealNonce((current) => current + 1);
      }

      return stepValid;
    },
    onSubmit: () =>
      form.handleSubmit(async (values) => {
        const payload = normalizeReturnFormPayload(
          values,
          {
            taskClientId,
            itemClientId,
            customerClientId,
            noteClientId,
            currentUserClientId,
          },
          "pre_order",
        );

        const result = await createTask.mutateAsync(payload);
        callbacks.onTaskCreated?.({
          result,
          hadUpholstery: Boolean(payload.item_upholstery),
        });
        form.reset(buildPreOrderFormDefaultValues(initialItemSku));
        surface.close(TASK_CREATION_PRE_ORDER_SURFACE_ID);
      })(),
  });

  navigateToRef.current = staged.navigateTo;

  useEffect(() => {
    const stepErrorMap = {
      task: Boolean(errors.item ?? errors.item_upholstery),
      customer: Boolean(
        errors.customer ??
        errors.fulfillment_method ??
        errors.scheduled_start_at ??
        errors.scheduled_end_at,
      ),
      assignment: Boolean(!isSeller && errors.working_section_assignments),
      details: Boolean(
        errors.item_issues ?? errors.note_content ?? errors.ready_by_at,
      ),
    } as const;

    for (const step of staged.steps) {
      const hasError = stepErrorMap[step.id as keyof typeof stepErrorMap];
      const currentStatus = staged.stepStatusMap[step.id];

      if (hasError) {
        if (currentStatus !== "error") {
          staged.setStepStatus(step.id, "error");
        }
        continue;
      }

      if (currentStatus !== "error") {
        continue;
      }

      const stepIndex = staged.steps.findIndex(
        (candidateStep) => candidateStep.id === step.id,
      );
      staged.setStepStatus(
        step.id,
        stepIndex < staged.activeStepIndex ? "completed" : "pending",
      );
    }
  }, [errors, staged]);

  return (
    <FormProvider {...form}>
      <form
        className="flex h-full flex-col "
        data-testid="pre-order-form"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <StagedForm
          activeStepId={staged.activeStepId}
          data-testid="pre-order-staged-form"
          direction={staged.direction}
          enableKeyboardAccessory
          header={<TaskCreationStagedFormHeader title="Pre-Order" />}
          footer={
            <TaskCreationAssignmentFooter
              activeStepId={staged.activeStepId}
              majorCategory={majorCategory}
            />
          }
          footerEdgeOffset={TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX}
          isAdvancing={staged.isAdvancing}
          isFirstStep={staged.isFirstStep}
          isLastStep={staged.isLastStep}
          navigationMode={staged.navigationMode}
          canAdvance={staged.validateAdvance}
          onAdvance={staged.advance}
          onBack={staged.back}
          onNavigate={staged.navigateTo}
          showNavigation={false}
          stepStatusMap={staged.stepStatusMap}
          steps={staged.steps}
        >
          <StagedFormStep id="task" className="px-0">
            <div className="flex flex-col gap-4">
              <ContentCard>
                <CameraPrewarm delayMs={200} sessionId={SCANNER_SESSION_ID} />
                <ItemIdentityField
                  defaultTab="sku"
                  onLookupResult={handleLookupResult}
                  onOpenScanner={handleOpenScanner}
                />
                <ItemPositionZoneField
                  articleNumber={itemArticleNumber}
                  defaultTab="position"
                  positionErrorRevealNonce={positionErrorRevealNonce}
                  sku={itemSku}
                />
              </ContentCard>
              <ContentCard>
                <ItemCategorySelectionField />
              </ContentCard>
              {majorCategory === "seat" ? (
                <ContentCard>
                  <ItemQuantityField />
                  <UpholsteryField control={form.control} />
                  <ItemUpholsteryAmountField quantity={itemQuantity ?? 0} />
                </ContentCard>
              ) : null}
            </div>
          </StagedFormStep>

          <StagedFormStep id="customer" className="px-0">
            <div className="flex flex-col gap-4">
              <ShopifyCustomerStatusPill
                onRetry={retryShopifyCustomerLookup}
                status={shopifyCustomerLookupStatus}
              />
              <ContentCard>
                <CustomerDisplayNameField />
                <CustomerTypeField />
                <CustomerEmailField />
                <CustomerPhoneField />
              </ContentCard>
              <ContentCard>
                <CustomerAddressFieldGroup />
              </ContentCard>
              <ContentCard>
                <TaskFulfillmentMethodField />
                {/* <TaskDeliveryDateField
                  onOpenCalendarRangePicker={(props) =>
                    surface.open(CALENDAR_RANGE_PICKER_SURFACE_ID, props)
                  }
                /> */}
              </ContentCard>
            </div>
          </StagedFormStep>

          {!isSeller ? (
            <StagedFormStep id="assignment" className="px-0">
              <div className="flex flex-col gap-4">
                <ContentCard>
                  <WorkingSectionPickerField
                    majorCategory={majorCategory}
                    showShortcutBar={false}
                  />
                </ContentCard>
              </div>
            </StagedFormStep>
          ) : null}

          <StagedFormStep id="details" className="px-0">
            <EntityImagesProvider
              entityClientId={noteClientId}
              captureFlow="camera-to-editor"
              deleteMode="hard-delete"
              entityType="note"
            >
              <div className="flex flex-col gap-4">
                <ContentCard data-testid="pre-order-form-images-section">
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="pre-order-form-images-grid"
                    />
                  </EntityImagesProvider>
                </ContentCard>
                <ContentCard>
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="pre-order-form-note-composer"
                      />
                    )}
                  />
                  <TaskNoteImagesSection />
                  <TaskReadyByDateField
                    onOpenCalendarSinglePicker={(props) =>
                      surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props)
                    }
                  />
                </ContentCard>
              </div>
            </EntityImagesProvider>
          </StagedFormStep>
        </StagedForm>
      </form>
    </FormProvider>
  );
}
