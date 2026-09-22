import { useEffect, useEffectEvent, useRef, useState } from "react";
import { isMajorCategory } from "@beyo/lib";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
import { usePreloadSurface, useStagedForm, useSurface } from "@beyo/hooks";
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
import { ItemCategorySelectionField } from "@beyo/item-categories";
import { ItemPricingFieldGroup } from "@beyo/item-economics";
import {
  CameraPrewarm,
  SCANNER_SESSION_ID,
  SCANNER_SLIDE_SURFACE_ID,
  type ScanFormat,
  type ScannerSlideSurfaceProps,
} from "@beyo/scanner";
import { TaskReadyByDateField, useCreateTask } from "@beyo/tasks";
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
  applyPurchasePriceLookupResult,
  createLookupResultSignature,
  findCachedItemCategoryOption,
  applyLookupPropertiesResult,
  selectPurchaseApiLookupResult,
} from "../lib/item-lookup-prefill";
import {
  readRememberedInternalItemPosition,
  writeRememberedInternalItemPosition,
} from "../lib/internal-item-position-memory";
import { useLookupItemImages } from "../hooks/use-lookup-item-images";
import { normalizeInternalFormPayload } from "../lib/normalize-task-form-payload";
import { prefetchTaskCreationFormData } from "../lib/prefetch-task-creation-form-data";
import { TaskCreationAssignmentFooter } from "./TaskCreationAssignmentFooter";
import { UpholsteryFieldGroup } from "./UpholsteryFieldGroup";
import { TaskCreationStagedFormHeader } from "./TaskCreationStagedFormHeader";
import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";
import { InternalFormSchema, type InternalFormValues } from "../types";
import {
  CALENDAR_SINGLE_PICKER_SURFACE_ID,
  TASK_CREATION_INTERNAL_SURFACE_ID,
  preloadCalendarSinglePickerSurface,
  preloadItemCategoryPickerSurface,
  preloadScannerSlideSurface,
} from "../surfaces";

// Exported so the pricing-validation boundary is regression-tested directly.
// eslint-disable-next-line react-refresh/only-export-components
export const INTERNAL_STEP_FIELDS_MAP: Record<
  string,
  FieldPath<InternalFormValues>[]
> = {
  item: [
    "item.article_number",
    "item.sku",
    "item.designer",
    "item.quantity",
    "item.item_position",
    "item.item_zone",
    "item.item_category_id",
    "item.major_category",
    "item.can_have_upholstery",
    "item_upholstery.upholstery_client_id",
    "item_upholstery.upholstery_amount_meters",
    "item_pricing.expected_sale_price_per_piece",
  ],
  assignment: ["working_section_assignments"],
  task: ["item_issues", "ready_by_at", "note_content"],
};

export function InternalFormContent(): React.JSX.Element {
  const queryClient = useQueryClient();

  usePreloadSurface(preloadCalendarSinglePickerSurface);
  usePreloadSurface(preloadItemCategoryPickerSurface);
  usePreloadSurface(preloadScannerSlideSurface);
  usePreloadSurface(preloadWorkingSectionWorkerPickerSurface);
  usePreloadSurface(preloadUpholsteryPickerSurface);
  usePrefetchOnCondition(true, () => prefetchTaskCreationFormData(queryClient));

  const navigateToRef = useRef<(stepId: string) => void>(() => {});
  const lastAppliedLookupSignatureRef = useRef<string | null>(null);
  const lookupInjectedRef = useRef<Record<string, unknown>>({});
  const [positionErrorRevealNonce, setPositionErrorRevealNonce] = useState(0);

  const surface = useSurface();
  const {
    taskClientId,
    itemClientId,
    customerClientId,
    noteClientId,
    currentUserClientId,
    regenerateIds,
    callbacks,
  } = useTaskCreationFormContext();
  const [initialItemPosition] = useState(() =>
    readRememberedInternalItemPosition(currentUserClientId),
  );
  const createTask = useCreateTask();
  usePreloadSurface(
    callbacks.candidateGate?.preload ?? (() => Promise.resolve()),
  );
  const applyLookupImages = useLookupItemImages(itemClientId);
  const form = useForm<InternalFormValues>({
    resolver: zodResolver(InternalFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      item: {
        designer: "",
        article_number: "",
        sku: "",
        quantity: 1,
        item_position: initialItemPosition ?? "",
        item_zone: "",
        item_category_id: undefined,
        major_category: undefined,
      },
      item_upholstery: {
        upholstery_client_id: null,
        upholstery_amount_meters: null,
      },
      item_pricing: {
        purchase_cost_per_piece: null,
        expected_sale_price_per_piece: null,
      },
      item_issues: [],
      working_section_assignments: [],
      ready_by_at: null,
      note_content: null,
    },
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
  const itemCategoryId = useWatch({
    control: form.control,
    name: "item.item_category_id",
  });
  const itemProperties = useWatch({
    control: form.control,
    name: "item.properties",
  });

  const sameValue = (left: unknown, right: unknown): boolean =>
    JSON.stringify(left) === JSON.stringify(right);

  const clearLookupInjectedValues = (): void => {
    const injected = lookupInjectedRef.current;
    if (sameValue(form.getValues("item.item_category_id"), injected.category)) {
      form.setValue("item.item_category_id", undefined, { shouldDirty: true });
    }
    if (
      sameValue(form.getValues("item.article_number"), injected.articleNumber)
    ) {
      form.setValue("item.article_number", "", { shouldDirty: true });
    }
    if (
      sameValue(form.getValues("item.major_category"), injected.majorCategory)
    ) {
      form.setValue("item.major_category", undefined, { shouldDirty: true });
    }
    if (sameValue(form.getValues("item.quantity"), injected.quantity)) {
      form.setValue("item.quantity", 1, { shouldDirty: true });
    }
    if (
      sameValue(
        form.getValues("item_pricing.purchase_cost_per_piece"),
        injected.purchaseCost,
      )
    ) {
      form.setValue("item_pricing.purchase_cost_per_piece", null, {
        shouldDirty: true,
      });
    }
    if (sameValue(form.getValues("item.properties"), injected.properties)) {
      form.setValue("item.properties", undefined, { shouldDirty: true });
    }
    lookupInjectedRef.current = {};
    applyLookupImages([]);
  };

  const checkCandidate = async (): Promise<boolean> => {
    const articleNumber = itemArticleNumber?.trim() || undefined;
    return (
      callbacks.candidateGate?.check(
        {
          articleNumber,
          sku: articleNumber ? undefined : itemSku?.trim() || undefined,
          itemCategoryId: itemCategoryId ?? undefined,
          properties: itemProperties ?? {},
          quantity: itemQuantity ?? 1,
        },
        { onChangeItem: clearLookupInjectedValues },
      ) ?? true
    );
  };

  useEffect(() => {
    if (!callbacks.candidateGate) return;
    const timeout = window.setTimeout(() => {
      void checkCandidate();
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [
    callbacks.candidateGate,
    itemArticleNumber,
    itemCategoryId,
    itemProperties,
    itemQuantity,
    itemSku,
  ]);
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
    // The picker's `major_category` is read-side and deliberately untyped, so
    // narrow it here rather than widening the form field (review N13).
    form.setValue(
      "item.major_category",
      isMajorCategory(matchedCategory?.major_category)
        ? matchedCategory.major_category
        : undefined,
      {
        shouldDirty: true,
      },
    );
    form.setValue("item.quantity", selectedItem.quantity, {
      shouldDirty: true,
    });
    applyPurchasePriceLookupResult(form, selectedItem);
    applyLookupPropertiesResult(form, selectedItem);

    applyLookupImages(selectedItem.images);

    lookupInjectedRef.current = {
      category: selectedItem.item_category_id ?? undefined,
      articleNumber: selectedItem.article_number,
      majorCategory: isMajorCategory(matchedCategory?.major_category)
        ? matchedCategory.major_category
        : undefined,
      quantity: selectedItem.quantity,
      purchaseCost:
        selectedItem.purchase_price_minor == null
          ? null
          : selectedItem.purchase_price_minor / 100,
      properties:
        selectedItem.properties &&
        Object.keys(selectedItem.properties).length > 0
          ? selectedItem.properties
          : undefined,
    };

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

  const staged = useStagedForm({
    steps: [
      { id: "item", title: "Item" },
      { id: "assignment", title: "Assignment" },
      { id: "task", title: "Task" },
    ],
    mode: "free",
    onBeforeAdvance: async (currentStepId, _nextStepId, setStatus) => {
      if (currentStepId === "task") {
        const allValid = await form.trigger();

        if (!allValid) {
          setPositionErrorRevealNonce((current) => current + 1);
          const { errors } = form.formState;
          let firstErrorStep: string | null = null;

          if (errors.item ?? errors.item_upholstery ?? errors.item_pricing) {
            setStatus("item", "error");
            firstErrorStep ??= "item";
          }
          if (errors.working_section_assignments) {
            setStatus("assignment", "error");
            firstErrorStep ??= "assignment";
          }
          if (errors.item_issues ?? errors.note_content ?? errors.ready_by_at) {
            setStatus("task", "error");
          }

          if (firstErrorStep) {
            navigateToRef.current(firstErrorStep);
          }
        }

        return allValid;
      }

      const stepValid = await form.trigger(
        INTERNAL_STEP_FIELDS_MAP[currentStepId] ?? [],
      );

      if (!stepValid) {
        setPositionErrorRevealNonce((current) => current + 1);
      }

      if (!stepValid) return false;
      return currentStepId === "item" ? checkCandidate() : true;
    },
    onSubmit: () =>
      form.handleSubmit(async (values) => {
        if (!(await checkCandidate())) {
          staged.navigateTo("item");
          return;
        }
        const payload = normalizeInternalFormPayload(values, {
          taskClientId,
          itemClientId,
          customerClientId,
          noteClientId,
          currentUserClientId,
        });

        const result = await createTask.mutateAsync(payload);
        writeRememberedInternalItemPosition(
          currentUserClientId,
          values.item.item_position,
        );
        const createdInfo = {
          result,
          hadUpholstery: Boolean(payload.item_upholstery),
        };
        callbacks.onTaskCreated?.(createdInfo);
        const outcome = await callbacks.afterCreate?.(createdInfo);
        form.reset({
          item: {
            designer: "",
            article_number: "",
            sku: "",
            quantity: 1,
            item_position: "",
            item_zone: "",
            item_category_id: undefined,
            major_category: undefined,
          },
          item_upholstery: {
            upholstery_client_id: null,
            upholstery_amount_meters: null,
          },
          item_pricing: {
            purchase_cost_per_piece: null,
            expected_sale_price_per_piece: null,
          },
          item_issues: [],
          working_section_assignments: [],
          ready_by_at: null,
          note_content: null,
        });
        regenerateIds();
        lastAppliedLookupSignatureRef.current = null;
        lookupInjectedRef.current = {};
        callbacks.candidateGate?.clear?.();
        staged.navigateTo("item");
        if (outcome !== "reset-stay") {
          surface.close(TASK_CREATION_INTERNAL_SURFACE_ID);
        }
      })(),
  });

  navigateToRef.current = staged.navigateTo;
  const CandidateStatusSlot = callbacks.candidateGate?.statusSlot;

  useEffect(() => {
    const stepErrorMap = {
      item: Boolean(
        errors.item ?? errors.item_upholstery ?? errors.item_pricing,
      ),
      assignment: Boolean(errors.working_section_assignments),
      task: Boolean(
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
        data-testid="internal-form"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <StagedForm
          activeStepId={staged.activeStepId}
          data-testid="internal-staged-form"
          direction={staged.direction}
          header={<TaskCreationStagedFormHeader title="Internal Task" />}
          footer={({ stepId }) => (
            <TaskCreationAssignmentFooter
              activeStepId={stepId}
              majorCategory={majorCategory}
              taskType="internal"
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
          <StagedFormStep id="item" className="px-0">
            <div className="flex flex-col gap-4">
              <ContentCard>
                <CameraPrewarm delayMs={200} sessionId={SCANNER_SESSION_ID} />
                <ItemIdentityField
                  onLookupResult={handleLookupResult}
                  onOpenScanner={handleOpenScanner}
                />
                {CandidateStatusSlot ? <CandidateStatusSlot /> : null}
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
                </ContentCard>
              ) : null}
              {isMajorCategory(majorCategory) ? (
                <ContentCard>
                  <ItemPricingFieldGroup
                    majorCategory={majorCategory}
                    quantity={itemQuantity}
                  />
                </ContentCard>
              ) : null}
              {majorCategory === "seat" ? (
                <ContentCard>
                  <UpholsteryFieldGroup quantity={itemQuantity ?? 0} />
                </ContentCard>
              ) : null}
            </div>
          </StagedFormStep>

          <StagedFormStep id="assignment" className="px-0">
            <div className="flex flex-col gap-4">
              <ContentCard>
                <WorkingSectionPickerField
                  majorCategory={majorCategory}
                  taskType="internal"
                  showShortcutBar={false}
                />
              </ContentCard>
            </div>
          </StagedFormStep>

          <StagedFormStep id="task" className="px-0">
            <EntityImagesProvider
              entityClientId={noteClientId}
              captureFlow="camera-to-editor"
              deleteMode="hard-delete"
              entityType="note"
            >
              <div className="flex flex-col gap-4">
                <ContentCard data-testid="internal-form-images-section">
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="internal-form-images-grid"
                    />
                  </EntityImagesProvider>
                </ContentCard>
                <ContentCard>
                  <TaskReadyByDateField
                    onOpenCalendarSinglePicker={(props) =>
                      surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props)
                    }
                  />
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="internal-form-note-composer"
                      />
                    )}
                  />
                  <TaskNoteImagesSection />
                </ContentCard>
              </div>
            </EntityImagesProvider>
          </StagedFormStep>
        </StagedForm>
      </form>
    </FormProvider>
  );
}
