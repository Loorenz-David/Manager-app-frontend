import { useEffect, useEffectEvent, useMemo, useRef } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  EntityImagesProvider,
  ImagePreviewGrid,
  preloadImageCameraSurface,
  preloadImageEditorSurface,
  preloadImageViewerSurface,
} from "@beyo/images";
import { usePreloadSurface, useSurface } from "@beyo/hooks";
import { ContentCard, usePrefetchOnCondition } from "@beyo/ui";
import {
  ItemIdentityField,
  ItemQuantityField,
  type ItemLookupResult,
} from "@beyo/items";
import {
  SCANNER_SESSION_ID,
  SCANNER_SLIDE_SURFACE_ID,
  useCameraPrewarm,
  type ScanFormat,
  type ScannerSlideSurfaceProps,
} from "@beyo/scanner";
import { useCreateTask } from "@beyo/tasks";
import {
  NeedsPhotoPickerField,
  NeedsCleaningPickerField,
  OilingTreatmentPickerField,
  resolveDefaultWoodFixSection,
  useNeedsPhotoPickerFlow,
  useNeedsCleaningPickerFlow,
  useOilingTreatmentPickerFlow,
  useWorkingSectionPickerFlow,
} from "@beyo/working-sections";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import {
  createLookupResultSignature,
  findCachedItemCategoryOption,
  applyLookupPropertiesResult,
  selectPurchaseApiLookupResult,
} from "../lib/item-lookup-prefill";
import { useLookupItemImages } from "../hooks/use-lookup-item-images";
import {
  normalizeWorkerInternalFormPayload,
  toWorkerItemIssueFields,
} from "../lib/normalize-task-form-payload";
import { prefetchTaskCreationFormData } from "../lib/prefetch-task-creation-form-data";
import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";
import {
  preloadItemCategoryPickerSurface,
  preloadScannerSlideSurface,
  preloadWorkerInternalItemIssueSelectionSheetSurface,
  TASK_CREATION_WORKER_INTERNAL_SURFACE_ID,
  TASK_CREATION_WORKER_ITEM_ISSUES_SURFACE_ID,
} from "../surfaces";
import {
  WorkerInternalFormSchema,
  type WorkerInternalFormValues,
  type WorkerItemIssueSelectionDraft,
} from "../types";
import { WoodItemCategorySelectionField } from "./WoodItemCategorySelectionField";
import { WorkerItemIssuePreviewSection } from "./WorkerItemIssuePreviewSection";
import { WorkerTaskCreationBottomActions } from "./WorkerTaskCreationBottomActions";

function buildDefaultValues(): WorkerInternalFormValues {
  return {
    item: {
      designer: "",
      article_number: "",
      sku: "",
      quantity: 1,
      item_position: undefined,
      item_category_id: undefined,
      major_category: "wood",
    },
    item_issues: [],
    item_issue_selection_draft: {},
    needs_photo_assignment: null,
    needs_cleaning_assignment: null,
    oiling_treatment_assignment: [],
  };
}

export function WorkerInternalFormContent(): React.JSX.Element {
  const queryClient = useQueryClient();
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
  const createTask = useCreateTask();
  usePreloadSurface(
    callbacks.candidateGate?.preload ?? (() => Promise.resolve()),
  );
  const applyLookupImages = useLookupItemImages(itemClientId);
  const workingSectionsFlow = useWorkingSectionPickerFlow();
  const defaultWoodFixSection = useMemo(
    () => resolveDefaultWoodFixSection(workingSectionsFlow.options),
    [workingSectionsFlow.options],
  );
  const photoFlow = useNeedsPhotoPickerFlow();
  const cleaningFlow = useNeedsCleaningPickerFlow();
  const oilingFlow = useOilingTreatmentPickerFlow();
  const hasAutoAppliedDefaultsRef = useRef(false);

  usePreloadSurface(preloadItemCategoryPickerSurface);
  usePreloadSurface(preloadScannerSlideSurface);
  usePreloadSurface(preloadWorkerInternalItemIssueSelectionSheetSurface);
  usePreloadSurface(preloadImageCameraSurface);
  usePreloadSurface(preloadImageViewerSurface);
  usePreloadSurface(preloadImageEditorSurface);
  usePrefetchOnCondition(true, () => prefetchTaskCreationFormData(queryClient));

  useCameraPrewarm(SCANNER_SESSION_ID, 200);

  const lastAppliedLookupSignatureRef = useRef<string | null>(null);
  const lookupInjectedRef = useRef<Record<string, unknown>>({});

  const form = useForm<WorkerInternalFormValues>({
    resolver: zodResolver(WorkerInternalFormSchema),
    defaultValues: buildDefaultValues(),
  });

  const itemCategoryId = useWatch({
    control: form.control,
    name: "item.item_category_id",
  });
  const itemArticleNumber = useWatch({
    control: form.control,
    name: "item.article_number",
  });
  const itemSku = useWatch({
    control: form.control,
    name: "item.sku",
  });
  const itemQuantity = useWatch({
    control: form.control,
    name: "item.quantity",
  });
  const itemProperties = useWatch({
    control: form.control,
    name: "item.properties",
  });
  const itemIssueDraft = useWatch({
    control: form.control,
    name: "item_issue_selection_draft",
  });

  const sameValue = (left: unknown, right: unknown): boolean =>
    JSON.stringify(left) === JSON.stringify(right);

  const clearLookupInjectedValues = (): void => {
    const injected = lookupInjectedRef.current;
    if (
      sameValue(form.getValues("item.article_number"), injected.articleNumber)
    ) {
      form.setValue("item.article_number", "", { shouldDirty: true });
    }
    if (sameValue(form.getValues("item.quantity"), injected.quantity)) {
      form.setValue("item.quantity", 1, { shouldDirty: true });
    }
    if (sameValue(form.getValues("item.properties"), injected.properties)) {
      form.setValue("item.properties", undefined, { shouldDirty: true });
    }
    if (sameValue(form.getValues("item.item_category_id"), injected.category)) {
      form.setValue("item.item_category_id", undefined, { shouldDirty: true });
    }
    // Worker major_category is an invariant of this form, never lookup-clear it.
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

  useEffect(() => {
    if (form.getValues("item.major_category") !== "wood") {
      form.setValue("item.major_category", "wood", {
        shouldDirty: false,
      });
    }
  }, [form]);

  useEffect(() => {
    if (hasAutoAppliedDefaultsRef.current) return;
    if (photoFlow.isLoading || cleaningFlow.isLoading || oilingFlow.isLoading)
      return;
    if (
      photoFlow.sections.length === 0 &&
      cleaningFlow.sections.length === 0 &&
      oilingFlow.sections.length === 0
    )
      return;

    hasAutoAppliedDefaultsRef.current = true;

    if (photoFlow.sections.length > 0) {
      form.setValue(
        "needs_photo_assignment",
        {
          working_section_id: photoFlow.sections[0].client_id,
          assigned_worker_id: null,
        },
        { shouldDirty: false },
      );
    }

    if (cleaningFlow.sections.length > 0) {
      form.setValue(
        "needs_cleaning_assignment",
        {
          working_section_id: cleaningFlow.sections[0].client_id,
          assigned_worker_id: null,
        },
        { shouldDirty: false },
      );
    }

    if (oilingFlow.sections.length > 0) {
      form.setValue(
        "oiling_treatment_assignment",
        oilingFlow.sections.map((s) => ({
          working_section_id: s.client_id,
          assigned_worker_id: null,
        })),
        { shouldDirty: false },
      );
    }
  }, [
    cleaningFlow.isLoading,
    cleaningFlow.sections,
    form,
    oilingFlow.isLoading,
    oilingFlow.sections,
    photoFlow.isLoading,
    photoFlow.sections,
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
    const isWoodCategory = matchedCategory?.major_category === "wood";

    form.setValue("item.article_number", selectedItem.article_number, {
      shouldDirty: true,
    });
    form.setValue("item.quantity", selectedItem.quantity, {
      shouldDirty: true,
    });
    form.setValue("item.major_category", "wood", {
      shouldDirty: false,
    });
    applyLookupPropertiesResult(form, selectedItem);

    if (isWoodCategory) {
      form.setValue(
        "item.item_category_id",
        selectedItem.item_category_id ?? undefined,
        {
          shouldDirty: true,
        },
      );
      form.clearErrors("item.item_category_id");
    } else {
      form.setValue("item.item_category_id", undefined, {
        shouldDirty: true,
      });
      form.setError("item.item_category_id", {
        type: "manual",
        message:
          "This lookup returned a non-wood item. This form only supports wood items.",
      });
    }

    applyLookupImages(selectedItem.images);

    lookupInjectedRef.current = {
      articleNumber: selectedItem.article_number,
      quantity: selectedItem.quantity,
      properties:
        selectedItem.properties &&
        Object.keys(selectedItem.properties).length > 0
          ? selectedItem.properties
          : undefined,
      category: isWoodCategory
        ? (selectedItem.item_category_id ?? undefined)
        : undefined,
    };

    lastAppliedLookupSignatureRef.current = signature;
    return isWoodCategory ? true : "invalid";
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

  function handleOpenIssueSelection(): void {
    surface.open(TASK_CREATION_WORKER_ITEM_ISSUES_SURFACE_ID, {
      itemCategoryId: itemCategoryId ?? null,
      workingSectionId: defaultWoodFixSection?.client_id ?? null,
      draft: itemIssueDraft ?? {},
      onSave: (draft: WorkerItemIssueSelectionDraft) => {
        form.setValue("item_issue_selection_draft", draft, {
          shouldDirty: true,
        });
        form.setValue("item_issues", toWorkerItemIssueFields(draft), {
          shouldDirty: true,
        });
      },
    });
  }

  async function handleSubmit(values: WorkerInternalFormValues): Promise<void> {
    if (!(await checkCandidate())) {
      return;
    }
    if (!defaultWoodFixSection) {
      form.setError("needs_cleaning_assignment", {
        type: "manual",
        message: "The default wood fix section is unavailable.",
      });
      return;
    }

    const payload = normalizeWorkerInternalFormPayload(
      values,
      {
        taskClientId,
        itemClientId,
        customerClientId,
        noteClientId,
        currentUserClientId,
      },
      defaultWoodFixSection.client_id,
    );

    const result = await createTask.mutateAsync(payload);
    const createdInfo = { result, hadUpholstery: false };
    callbacks.onTaskCreated?.(createdInfo);
    const outcome = await callbacks.afterCreate?.(createdInfo);
    form.reset(buildDefaultValues());
    regenerateIds();
    lastAppliedLookupSignatureRef.current = null;
    lookupInjectedRef.current = {};
    callbacks.candidateGate?.clear?.();
    if (outcome !== "reset-stay") {
      surface.close(TASK_CREATION_WORKER_INTERNAL_SURFACE_ID);
    }
  }

  const CandidateStatusSlot = callbacks.candidateGate?.statusSlot;

  return (
    <FormProvider {...form}>
      <form
        className="flex h-full flex-col overflow-hidden"
        data-testid="worker-internal-form"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          void handleSubmit(values);
        })}
      >
        <div className="flex-1 overflow-y-auto  pb-6 pt-4">
          <div className="flex flex-col gap-4">
            <ContentCard>
              <ItemIdentityField
                onLookupResult={handleLookupResult}
                onOpenScanner={handleOpenScanner}
              />
              {CandidateStatusSlot ? <CandidateStatusSlot /> : null}
              <ItemQuantityField />
              <WoodItemCategorySelectionField />
            </ContentCard>

            <ContentCard data-testid="worker-internal-form-images-section">
              <WorkerItemIssuePreviewSection
                draft={itemIssueDraft ?? {}}
                itemCategoryId={itemCategoryId}
                onOpen={handleOpenIssueSelection}
                workingSectionId={defaultWoodFixSection?.client_id}
              />
              <EntityImagesProvider
                captureFlow="camera-to-editor"
                deleteMode="hard-delete"
                entityClientId={itemClientId}
                entityType="item"
              >
                <ImagePreviewGrid
                  maxImages={6}
                  testId="worker-internal-form-images-grid"
                />
              </EntityImagesProvider>
            </ContentCard>

            <ContentCard>
              <NeedsCleaningPickerField />
              <OilingTreatmentPickerField />
              <NeedsPhotoPickerField />
            </ContentCard>

            {!defaultWoodFixSection && !workingSectionsFlow.isLoading ? (
              <p
                className="rounded-xl border border-dashed border-destructive/40 px-4 py-3 text-sm text-destructive"
                data-testid="worker-internal-form-wood-fix-error"
              >
                The default wood fix working section could not be resolved.
              </p>
            ) : null}
          </div>
        </div>

        <WorkerTaskCreationBottomActions
          isSubmitting={createTask.isPending || form.formState.isSubmitting}
          disabled={callbacks.candidateGate?.isPending}
        />
      </form>
    </FormProvider>
  );
}
