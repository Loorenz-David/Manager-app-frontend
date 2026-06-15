import { useEffectEvent, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  SCANNER_SESSION_ID,
  SCANNER_SLIDE_SURFACE_ID,
  useCameraPrewarm,
  type ScanFormat,
  type ScannerSlideSurfaceProps,
} from "@beyo/scanner";
import { usePrefetchOnCondition } from "@beyo/ui";
import {
  Controller,
  FormProvider,
  useForm,
  useWatch,
  type Control,
  type FieldPath,
} from "react-hook-form";

import {
  ContentCard,
  FieldLabelRow,
  StagedForm,
  StagedFormStep,
} from "@/components/primitives";
import {
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
} from "@/components/primitives/date";
import {
  CustomerAddressFieldGroup,
  CustomerDisplayNameField,
  CustomerEmailField,
  CustomerPhoneField,
  CustomerTypeField,
} from "@/features/customers";
import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
import {
  ItemCategorySelectionField,
  ItemIdentityField,
  ItemPositionField,
  ItemQuantityField,
  ItemUpholsteryAmountField,
  ItemUpholsteryField,
  preloadItemCategoryPickerSurface,
  preloadScannerSlideSurface,
  type ItemLookupResult,
} from "@/features/items";
import { preloadPhoneCountryPickerSurface } from "@/features/phone-input";
import {
  TaskAdditionalDetailsField,
  TaskDeliveryDateField,
  TaskFulfillmentMethodField,
  TaskReadyByDateField,
  TaskReturnSourceField,
  useCreateTask,
} from "@/features/tasks";
import {
  WorkingSectionPickerField,
  preloadWorkingSectionWorkerPickerSurface,
} from "@/features/working-sections";
import { usePreloadSurface } from "@/hooks/use-preload-surface";
import { useStagedForm } from "@/hooks/use-staged-form";
import { useSurface } from "@/hooks/use-surface";
import type { StepStatus } from "@/types/staged-form";

import {
  createLookupResultSignature,
  findCachedItemCategoryOption,
  selectInternalLookupResult,
} from "../lib/item-lookup-prefill";
import { normalizeReturnFormPayload } from "../lib/normalize-task-form-payload";
import { prefetchTaskCreationFormData } from "../lib/prefetch-task-creation-form-data";
import { TaskCreationAssignmentFooter } from "./TaskCreationAssignmentFooter";
import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";
import { TASK_CREATION_RETURN_SURFACE_ID } from "../surfaces";
import { ReturnFormSchema, type ReturnFormValues } from "../types";

const RETURN_STEP_FIELDS_MAP: Record<string, FieldPath<ReturnFormValues>[]> = {
  task: ["return_source", "item", "item_upholstery"],
  customer: [
    "customer",
    "fulfillment_method",
    "scheduled_start_at",
    "scheduled_end_at",
  ],
  assignment: ["working_section_assignments"],
  details: ["item_issues", "additional_details", "ready_by_at"],
};

function UpholsteryField({
  control,
}: {
  control: Control<ReturnFormValues>;
}): React.JSX.Element {
  return (
    <Controller
      name="item_upholstery.upholstery_client_id"
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-1.5">
          <FieldLabelRow label="Upholstery" />
          <ItemUpholsteryField value={field.value} onChange={field.onChange} />
        </div>
      )}
    />
  );
}

export function ReturnFormContent(): React.JSX.Element {
  const queryClient = useQueryClient();
  const lastAppliedLookupSignatureRef = useRef<string | null>(null);

  usePreloadSurface(preloadCalendarRangePickerSurface);
  usePreloadSurface(preloadCalendarSinglePickerSurface);
  usePreloadSurface(preloadItemCategoryPickerSurface);
  usePreloadSurface(preloadScannerSlideSurface);
  usePreloadSurface(preloadPhoneCountryPickerSurface);
  usePreloadSurface(preloadWorkingSectionWorkerPickerSurface);
  usePrefetchOnCondition(true, () => prefetchTaskCreationFormData(queryClient));

  const { taskClientId, itemClientId, customerClientId } =
    useTaskCreationFormContext();
  const createTask = useCreateTask();
  const surface = useSurface();
  useCameraPrewarm(SCANNER_SESSION_ID, 200);
  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(ReturnFormSchema),
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
      customer: {
        display_name: "",
        customer_type: undefined,
        primary_email: "",
        primary_phone_number: "",
        address: {
          street: "",
          city: "",
          postal_code: "",
          country: "",
        },
      },
      return_source: undefined,
      fulfillment_method: undefined,
      scheduled_start_at: null,
      scheduled_end_at: null,
      working_section_assignments: [],
      ready_by_at: null,
      additional_details: "",
    },
  });
  const returnSource = useWatch({
    control: form.control,
    name: "return_source",
  });
  const majorCategory = useWatch({
    control: form.control,
    name: "item.major_category",
  });
  const itemQuantity = useWatch({
    control: form.control,
    name: "item.quantity",
  });
  const handleLookupResult = useEffectEvent((items: ItemLookupResult[]) => {
    const selectedItem = selectInternalLookupResult(items);

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

    lastAppliedLookupSignatureRef.current = signature;
    return true;
  });
  const hasAssignmentStep = returnSource === "before_purchase";
  const shouldShowTaskQuantity = majorCategory === "seat";
  const shouldShowTaskUpholstery =
    majorCategory === "seat" &&
    returnSource !== "after_purchase" &&
    returnSource !== "store_return";
  const steps = [
    { id: "task", title: "Task" },
    { id: "customer", title: "Customer" },
    ...(hasAssignmentStep
      ? ([{ id: "assignment", title: "Assignment" }] as const)
      : []),
    { id: "details", title: "Details" },
  ];

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
    steps,
    mode: "free",
    onBeforeAdvance: async (
      currentStepId: string,
      _nextStepId: string | null,
      setStatus: (stepId: string, status: StepStatus) => void,
    ) => {
      if (currentStepId === "details") {
        const allValid = await form.trigger();

        if (!allValid) {
          const { errors } = form.formState;

          if (errors.return_source ?? errors.item ?? errors.item_upholstery) {
            setStatus("task", "error");
          }
          if (
            errors.customer ??
            errors.fulfillment_method ??
            errors.scheduled_start_at ??
            errors.scheduled_end_at
          ) {
            setStatus("customer", "error");
          }
          if (hasAssignmentStep && errors.working_section_assignments) {
            setStatus("assignment", "error");
          }
          if (
            errors.item_issues ??
            errors.additional_details ??
            errors.ready_by_at
          ) {
            setStatus("details", "error");
          }
        }

        return allValid;
      }

      return form.trigger(RETURN_STEP_FIELDS_MAP[currentStepId] ?? []);
    },
    onSubmit: () =>
      form.handleSubmit(async (values) => {
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId },
          "return",
        );

        await createTask.mutateAsync(payload);
        surface.close(TASK_CREATION_RETURN_SURFACE_ID);
      })(),
  });

  return (
    <FormProvider {...form}>
      <form
        className="flex h-full flex-col"
        data-testid="return-form"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <StagedForm
          activeStepId={staged.activeStepId}
          data-testid="return-staged-form"
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
          <StagedFormStep id="task" className="px-0">
            <div className="flex flex-col gap-4">
              <ContentCard>
                <TaskReturnSourceField />
                <ItemIdentityField
                  onLookupResult={handleLookupResult}
                  onOpenScanner={handleOpenScanner}
                />
                <ItemPositionField />
              </ContentCard>
              <ContentCard>
                <ItemCategorySelectionField />
              </ContentCard>
              {shouldShowTaskQuantity ? (
                <ContentCard>
                  <ItemQuantityField />
                </ContentCard>
              ) : null}
              {shouldShowTaskUpholstery ? (
                <ContentCard>
                  <UpholsteryField control={form.control} />
                  <ItemUpholsteryAmountField quantity={itemQuantity ?? 0} />
                </ContentCard>
              ) : null}
            </div>
          </StagedFormStep>

          <StagedFormStep id="customer" className="px-0">
            <div className="flex flex-col gap-4">
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
                <TaskDeliveryDateField />
              </ContentCard>
            </div>
          </StagedFormStep>

          {hasAssignmentStep ? (
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
            <div className="flex flex-col gap-4">
              <ContentCard data-testid="return-form-images-section">
                <EntityImagesProvider
                  entityClientId={itemClientId}
                  captureFlow="camera-to-editor"
                  deleteMode="hard-delete"
                  entityType="item"
                >
                  <ImagePreviewGrid
                    maxImages={6}
                    testId="return-form-images-grid"
                  />
                </EntityImagesProvider>
              </ContentCard>
              <ContentCard>
                <TaskAdditionalDetailsField />
                <TaskReadyByDateField />
              </ContentCard>
            </div>
          </StagedFormStep>
        </StagedForm>
      </form>
    </FormProvider>
  );
}
