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
import {
  EntityImagesProvider,
  ImagePreviewGrid,
  useEntityImagesQuery,
} from "@beyo/images";
import { usePreloadSurface, useStagedForm, useSurface } from "@beyo/hooks";
import { ItemCategorySelectionField } from "@beyo/item-categories";
import { useSocket } from "@beyo/realtime";
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
import { preloadUpholsteryPickerSurface } from "@beyo/upholstery";
import {
  WorkingSectionPickerField,
  preloadWorkingSectionWorkerPickerSurface,
} from "@beyo/working-sections";
import {
  Controller,
  FormProvider,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";

import {
  createLookupResultSignature,
  findCachedItemCategoryOption,
  selectPurchaseApiLookupResult,
} from "../lib/item-lookup-prefill";
import { useLookupItemImages } from "../hooks/use-lookup-item-images";
import { useProvisionalSkuDisplay } from "../hooks/use-provisional-sku-display";
import { useShopifyCustomerLookupPrefill } from "../hooks/use-shopify-customer-lookup-prefill";
import {
  buildShopifyPreorderSection,
  normalizeReturnFormPayload,
} from "../lib/normalize-task-form-payload";
import { buildPreOrderFormDefaultValues } from "../lib/pre-order-form-default-values";
import { prefetchTaskCreationFormData } from "../lib/prefetch-task-creation-form-data";
import { selectPreorderProductImage } from "../lib/select-preorder-product-image";
import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";
import { PreOrderShopifySection } from "./PreOrderShopifySection";
import { ProductPriceField } from "./ProductPriceField";
import { ShopifyCustomerStatusPill } from "./ShopifyCustomerStatusPill";
import { SkuTemplatePreviewHint } from "./SkuTemplatePreviewHint";
import { TaskCreationAssignmentFooter } from "./TaskCreationAssignmentFooter";
import { TaskCreationStagedFormHeader } from "./TaskCreationStagedFormHeader";
import { UpholsteryFieldGroup } from "./UpholsteryFieldGroup";
import {
  TaskCreationSubmitOverlay,
  type TaskCreationSubmitOverlayPhase,
} from "./TaskCreationSubmitOverlay";
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
  preloadShopifyShopPickerSheetSurface,
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
    "item.can_have_upholstery",
    "item_upholstery.upholstery_client_id",
    "item_upholstery.upholstery_amount_meters",
    "product_unit_price",
    "shopIntegrationIds",
    "inventoryQuantities",
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

export function PreOrderFormContent(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigateToRef = useRef<(stepId: string) => void>(() => {});
  const lastAppliedLookupSignatureRef = useRef<string | null>(null);
  const [positionErrorRevealNonce, setPositionErrorRevealNonce] = useState(0);
  const [submitOverlayPhase, setSubmitOverlayPhase] =
    useState<TaskCreationSubmitOverlayPhase | null>(null);
  const { submittedSku, beginSubmission, resolveFinal, clear: clearSubmittedSku } =
    useProvisionalSkuDisplay();
  const [missingItemSkuWarning, setMissingItemSkuWarning] = useState(false);
  const [shopifyOrderErrorMessage, setShopifyOrderErrorMessage] = useState<
    string | null
  >(null);
  const socket = useSocket();
  const { hasRole } = useRole();
  const isSeller = hasRole(AuthRole.Seller);

  usePreloadSurface(preloadCalendarRangePickerSurface);
  usePreloadSurface(preloadCalendarSinglePickerSurface);
  usePreloadSurface(preloadItemCategoryPickerSurface);
  usePreloadSurface(preloadScannerSlideSurface);
  usePreloadSurface(preloadPhoneCountryPickerSurface);
  usePreloadSurface(preloadWorkingSectionWorkerPickerSurface);
  usePreloadSurface(preloadUpholsteryPickerSurface);
  usePreloadSurface(preloadShopifyShopPickerSheetSurface);
  usePrefetchOnCondition(true, () => prefetchTaskCreationFormData(queryClient));

  const {
    taskClientId,
    itemClientId,
    customerClientId,
    noteClientId,
    currentUserClientId,
    callbacks,
    skuPreview,
    hasSkuTemplate,
  } = useTaskCreationFormContext();
  const createTask = useCreateTask();
  const applyLookupImages = useLookupItemImages(itemClientId);
  // Same query key the Details step's image grid uses, so this shares its cache
  // rather than issuing a second request. Only confirmed (server-side) images
  // appear here, which is exactly what `image_id` may reference.
  const itemImagesQuery = useEntityImagesQuery({
    entity_type: "item",
    entity_client_id: itemClientId,
  });
  const productImage = selectPreorderProductImage(itemImagesQuery.data);
  const surface = useSurface();
  const form = useForm<PreOrderFormValues>({
    resolver: zodResolver(PreOrderFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: buildPreOrderFormDefaultValues(hasSkuTemplate),
  });

  // The template lookup usually resolves after mount, so the flag the schema
  // validates against is kept in sync rather than only seeded. Without a
  // template the item still needs a manually entered article number or SKU.
  useEffect(() => {
    form.setValue("has_sku_template", hasSkuTemplate);
  }, [form, hasSkuTemplate]);
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
    ...(!isSeller
      ? ([{ id: "assignment", title: "Assignment" }] as const)
      : []),
    { id: "details", title: "Details" },
    { id: "customer", title: "Customer" },
  ];

  const staged = useStagedForm({
    steps,
    mode: "free",
    onBeforeAdvance: async (currentStepId, _nextStepId, setStatus) => {
      if (currentStepId === "customer") {
        const allValid = await form.trigger();

        if (!allValid) {
          setPositionErrorRevealNonce((current) => current + 1);
          const { errors } = form.formState;
          let firstErrorStep: string | null = null;

          if (
            errors.item ??
            errors.item_upholstery ??
            errors.product_unit_price ??
            errors.shopIntegrationIds ??
            errors.inventoryQuantities
          ) {
            setStatus("task", "error");
            firstErrorStep ??= "task";
          }
          if (!isSeller && errors.working_section_assignments) {
            setStatus("assignment", "error");
            firstErrorStep ??= "assignment";
          }
          if (errors.item_issues ?? errors.note_content ?? errors.ready_by_at) {
            setStatus("details", "error");
            firstErrorStep ??= "details";
          }
          if (
            errors.customer ??
            errors.fulfillment_method ??
            errors.scheduled_start_at ??
            errors.scheduled_end_at
          ) {
            setStatus("customer", "error");
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
        const shopifyPreorderSection = buildShopifyPreorderSection(values, {
          imageClientId: productImage.imageClientId,
        });
        const payload: Record<string, unknown> = {
          ...normalizeReturnFormPayload(
            values,
            {
              taskClientId,
              itemClientId,
              customerClientId,
              noteClientId,
              currentUserClientId,
            },
            "pre_order",
            { forceItemInclusion: hasSkuTemplate },
          ),
          ...(shopifyPreorderSection
            ? { shopify_preorder: shopifyPreorderSection }
            : {}),
        };

        // The overlay goes up before the request so the socket listener is
        // mounted before the backend can possibly emit the processed event.
        // Until the response lands the SKU shown is the seller's override, or
        // the preview — which a concurrent submit can still take.
        beginSubmission(values.item.sku?.trim(), skuPreview);
        setMissingItemSkuWarning(false);
        setSubmitOverlayPhase("creating");

        try {
          const result = await createTask.mutateAsync(payload);

          // The assigned SKU is final and permanent the moment this returns,
          // and it is the only place the value can be read.
          if (result.item_sku) {
            resolveFinal(result.item_sku);
          } else if (payload.shopify_preorder) {
            // An existing item matched by article number can carry no SKU at
            // all, and the queued Shopify product then inherits that gap.
            setMissingItemSkuWarning(true);
          }

          callbacks.onTaskCreated?.({
            result,
            hadUpholstery: Boolean(payload.item_upholstery),
          });
        } catch {
          // useCreateTask already notifies; drop the overlay so the form
          // stays editable — the task was not created.
          setSubmitOverlayPhase(null);
          clearSubmittedSku();
        }
      })(),
  });

  navigateToRef.current = staged.navigateTo;

  useEffect(() => {
    const stepErrorMap = {
      task: Boolean(
        errors.item ??
        errors.item_upholstery ??
        errors.product_unit_price ??
        errors.shopIntegrationIds ??
        errors.inventoryQuantities,
      ),
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

  const handlePreorderProcessed = useEffectEvent(
    (payload: {
      task_id: string;
      status: "succeeded" | "failed";
      error_message: string | null;
    }) => {
      if (payload.task_id !== taskClientId) {
        return;
      }

      setShopifyOrderErrorMessage(payload.error_message ?? null);
      setSubmitOverlayPhase(
        payload.status === "succeeded" ? "succeeded" : "failed",
      );
    },
  );
  const isAwaitingShopifyOrder = submitOverlayPhase === "creating";

  useEffect(() => {
    if (!isAwaitingShopifyOrder) {
      return;
    }

    // No event after this long means the order is still in flight (backend
    // retries are automatic) — release the user instead of blocking forever.
    // Armed even without a socket so a dropped connection can't trap the user.
    const fallbackTimer = setTimeout(
      () => setSubmitOverlayPhase("still_processing"),
      30_000,
    );

    if (!socket) {
      return () => clearTimeout(fallbackTimer);
    }

    const handleProcessed = (payload: {
      task_id: string;
      status: "succeeded" | "failed";
      error_message: string | null;
    }) => handlePreorderProcessed(payload);

    socket.on("shopify.preorder.processed", handleProcessed);

    return () => {
      socket.off("shopify.preorder.processed", handleProcessed);
      clearTimeout(fallbackTimer);
    };
  }, [socket, isAwaitingShopifyOrder]);

  function closeAfterShopifyResult(): void {
    setSubmitOverlayPhase(null);
    clearSubmittedSku();
    setMissingItemSkuWarning(false);
    setShopifyOrderErrorMessage(null);
    form.reset(buildPreOrderFormDefaultValues(hasSkuTemplate));
    surface.close(TASK_CREATION_PRE_ORDER_SURFACE_ID);
  }

  const submitOverlayContent =
    submitOverlayPhase === null
      ? null
      : {
          creating: {
            title: "Creating pre-order and Shopify order…",
            description: undefined as string | undefined,
          },
          succeeded: {
            title: "Pre-order and Shopify order created",
            description: missingItemSkuWarning
              ? "The item has no SKU, so the Shopify product was created without one."
              : undefined,
          },
          failed: {
            title: "Pre-order created — Shopify order failed",
            description: shopifyOrderErrorMessage ?? undefined,
          },
          still_processing: {
            title: "Still processing",
            description: "The Shopify order will finish in the background.",
          },
        }[submitOverlayPhase];

  return (
    <FormProvider {...form}>
      <form
        className="relative flex h-full flex-col "
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
          footer={({ stepId }) => (
            <TaskCreationAssignmentFooter
              activeStepId={stepId}
              majorCategory={majorCategory}
              taskType="pre_order"
            />
          )}
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
                  skuPlaceholder={skuPreview ?? undefined}
                />
                <SkuTemplatePreviewHint
                  preview={skuPreview}
                  hidden={Boolean(itemSku?.trim())}
                  testId="pre-order-form-sku-preview-hint"
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
                  <UpholsteryFieldGroup quantity={itemQuantity ?? 0} />
                </ContentCard>
              ) : null}
              <ContentCard data-testid="pre-order-form-price-section">
                <ProductPriceField />
              </ContentCard>
            </div>
          </StagedFormStep>

          {!isSeller ? (
            <StagedFormStep id="assignment" className="px-0">
              <div className="flex flex-col gap-4">
                <ContentCard>
                  <WorkingSectionPickerField
                    majorCategory={majorCategory}
                    taskType="pre_order"
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
                  {productImage.hasOnlyOversizedImages ? (
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="pre-order-form-image-too-large"
                    >
                      These photos are too large for Shopify (max 20 MB and 25
                      MP), so the pre-order product will be created without one.
                      Add a smaller photo to include it.
                    </p>
                  ) : null}
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
                <ContentCard data-testid="pre-order-form-shopify-section">
                  <PreOrderShopifySection />
                </ContentCard>
              </div>
            </EntityImagesProvider>
          </StagedFormStep>

          {/* Last step. SlideStack derives pane order from child order, so this
           * must stay in sync with the `steps` array above. */}
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
        </StagedForm>

        {submitOverlayPhase && submitOverlayContent ? (
          <TaskCreationSubmitOverlay
            phase={submitOverlayPhase}
            title={submitOverlayContent.title}
            description={submitOverlayContent.description}
            sku={submittedSku?.value ?? skuPreview ?? ""}
            isSkuProvisional={submittedSku?.isProvisional ?? true}
            onDismiss={
              submitOverlayPhase === "creating"
                ? undefined
                : closeAfterShopifyResult
            }
          />
        ) : null}
      </form>
    </FormProvider>
  );
}
