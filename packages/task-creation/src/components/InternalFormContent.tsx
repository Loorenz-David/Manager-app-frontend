import { useEffect, useEffectEvent, useRef } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  EntityImagesProvider,
  imageKeys,
  ImagePreviewGrid,
  useCreateImagesFromUrl,
} from "@beyo/images";
import { usePreloadSurface, useStagedForm, useSurface } from "@beyo/hooks";
import { ContentCard, StagedForm, StagedFormStep, usePrefetchOnCondition } from "@beyo/ui";
import {
  ItemIdentityField,
  ItemPositionField,
  ItemQuantityField,
  type ItemLookupResult,
} from "@beyo/items";
import { ItemCategorySelectionField } from "@beyo/item-categories";
import {
  SCANNER_SESSION_ID,
  SCANNER_SLIDE_SURFACE_ID,
  useCameraPrewarm,
  type ScanFormat,
  type ScannerSlideSurfaceProps,
} from "@beyo/scanner";
import {
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
  buildCreateImagesFromUrlBatch,
  selectPurchaseApiLookupResult,
} from "../lib/item-lookup-prefill";
import { normalizeInternalFormPayload } from "../lib/normalize-task-form-payload";
import { prefetchTaskCreationFormData } from "../lib/prefetch-task-creation-form-data";
import { TaskCreationAssignmentFooter } from "./TaskCreationAssignmentFooter";
import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";
import { InternalFormSchema, type InternalFormValues } from "../types";
import {
  CALENDAR_SINGLE_PICKER_SURFACE_ID,
  TASK_CREATION_INTERNAL_SURFACE_ID,
  preloadCalendarSinglePickerSurface,
  preloadItemCategoryPickerSurface,
  preloadScannerSlideSurface,
} from "../surfaces";

const INTERNAL_STEP_FIELDS_MAP: Record<
  string,
  FieldPath<InternalFormValues>[]
> = {
  item: ["item", "item_upholstery"],
  assignment: ["working_section_assignments"],
  task: ["item_issues", "ready_by_at", "note_content"],
};

function UpholsteryField({
  control,
}: {
  control: Control<InternalFormValues>;
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

  const surface = useSurface();
  const {
    taskClientId,
    itemClientId,
    customerClientId,
    noteClientId,
    currentUserClientId,
    regenerateIds,
  } = useTaskCreationFormContext();
  const createTask = useCreateTask();
  const createImagesFromUrl = useCreateImagesFromUrl();
  useCameraPrewarm(SCANNER_SESSION_ID, 200);
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
        item_position: undefined,
        item_currency: undefined,
        item_category_id: undefined,
        major_category: undefined,
      },
      item_upholstery: {
        upholstery_client_id: null,
        upholstery_amount_meters: null,
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

    if (selectedItem.images.length > 0) {
      void createImagesFromUrl
        .mutateAsync(
          buildCreateImagesFromUrlBatch(selectedItem.images, itemClientId),
        )
        .then(() =>
          queryClient.invalidateQueries({
            queryKey: imageKeys.list({
              entity_type: "item",
              entity_client_id: itemClientId,
            }),
          }),
        )
        .catch(() => {});
    }

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
          const { errors } = form.formState;
          let firstErrorStep: string | null = null;

          if (errors.item ?? errors.item_upholstery) {
            setStatus("item", "error");
            firstErrorStep ??= "item";
          }
          if (errors.working_section_assignments) {
            setStatus("assignment", "error");
            firstErrorStep ??= "assignment";
          }
          if (
            errors.item_issues ??
            errors.note_content ??
            errors.ready_by_at
          ) {
            setStatus("task", "error");
          }

          if (firstErrorStep) {
            navigateToRef.current(firstErrorStep);
          }
        }

        return allValid;
      }

      return form.trigger(INTERNAL_STEP_FIELDS_MAP[currentStepId] ?? []);
    },
    onSubmit: () =>
      form.handleSubmit(async (values) => {
        const payload = normalizeInternalFormPayload(values, {
          taskClientId,
          itemClientId,
          customerClientId,
          noteClientId,
          currentUserClientId,
        });

        await createTask.mutateAsync(payload);
        form.reset({
          item: {
            designer: "",
            article_number: "",
            sku: "",
            quantity: 1,
            item_position: undefined,
            item_currency: undefined,
            item_category_id: undefined,
            major_category: undefined,
          },
          item_upholstery: {
            upholstery_client_id: null,
            upholstery_amount_meters: null,
          },
          item_issues: [],
          working_section_assignments: [],
          ready_by_at: null,
          note_content: null,
        });
        regenerateIds();
        lastAppliedLookupSignatureRef.current = null;
        staged.navigateTo("item");
        surface.close(TASK_CREATION_INTERNAL_SURFACE_ID);
      })(),
  });

  navigateToRef.current = staged.navigateTo;

  useEffect(() => {
    const stepErrorMap = {
      item: Boolean(errors.item ?? errors.item_upholstery),
      assignment: Boolean(errors.working_section_assignments),
      task: Boolean(errors.item_issues ?? errors.note_content ?? errors.ready_by_at),
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
        className="flex h-full flex-col pt-4"
        data-testid="internal-form"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <StagedForm
          activeStepId={staged.activeStepId}
          data-testid="internal-staged-form"
          direction={staged.direction}
          footer={
            <TaskCreationAssignmentFooter
              activeStepId={staged.activeStepId}
              majorCategory={majorCategory}
            />
          }
          isAdvancing={staged.isAdvancing}
          isFirstStep={staged.isFirstStep}
          isLastStep={staged.isLastStep}
          navigationMode={staged.navigationMode}
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
                <ItemIdentityField
                  onLookupResult={handleLookupResult}
                  onOpenScanner={handleOpenScanner}
                />
                <ItemPositionField />
              </ContentCard>
              <ContentCard>
                <ItemCategorySelectionField />
              </ContentCard>
              {majorCategory === "seat" ? (
                <ContentCard>
                  <ItemQuantityField />
                </ContentCard>
              ) : null}
              {majorCategory === "seat" ? (
                <ContentCard>
                  <UpholsteryField control={form.control} />
                  <ItemUpholsteryAmountField quantity={itemQuantity ?? 0} />
                </ContentCard>
              ) : null}
            </div>
          </StagedFormStep>

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
