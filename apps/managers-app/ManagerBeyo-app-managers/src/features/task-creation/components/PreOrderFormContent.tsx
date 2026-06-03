import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
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
} from "@/features/items";
import { preloadPhoneCountryPickerSurface } from "@/features/phone-input";
import {
  TaskAdditionalDetailsField,
  TaskDeliveryDateField,
  TaskFulfillmentMethodField,
  TaskReadyByDateField,
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

import { normalizeReturnFormPayload } from "../lib/normalize-task-form-payload";
import { prefetchTaskCreationFormData } from "../lib/prefetch-task-creation-form-data";
import { TaskCreationAssignmentFooter } from "./TaskCreationAssignmentFooter";
import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";
import { TASK_CREATION_PRE_ORDER_SURFACE_ID } from "../surfaces";
import { PreOrderFormSchema, type PreOrderFormValues } from "../types";

const PRE_ORDER_STEP_FIELDS_MAP: Record<
  string,
  FieldPath<PreOrderFormValues>[]
> = {
  task: ["item", "item_upholstery"],
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
  control: Control<PreOrderFormValues>;
}): React.JSX.Element {
  return (
    <Controller
      name="item_upholstery.upholstery_client_id"
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-1.5">
          <FieldLabelRow label="Upholstery" />
          <ItemUpholsteryField
            value={field.value}
            onChange={field.onChange}
            title="Select upholstery"
            description="Choose the upholstery for this item."
          />
        </div>
      )}
    />
  );
}

export function PreOrderFormContent(): React.JSX.Element {
  const queryClient = useQueryClient();

  usePreloadSurface(preloadCalendarRangePickerSurface);
  usePreloadSurface(preloadCalendarSinglePickerSurface);
  usePreloadSurface(preloadItemCategoryPickerSurface);
  usePreloadSurface(preloadPhoneCountryPickerSurface);
  usePreloadSurface(preloadWorkingSectionWorkerPickerSurface);
  usePrefetchOnCondition(true, () => prefetchTaskCreationFormData(queryClient));

  const { taskClientId, itemClientId, customerClientId } =
    useTaskCreationFormContext();
  const createTask = useCreateTask();
  const surface = useSurface();
  const form = useForm<PreOrderFormValues>({
    resolver: zodResolver(PreOrderFormSchema),
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
  const majorCategory = useWatch({
    control: form.control,
    name: "item.major_category",
  });
  const itemQuantity = useWatch({
    control: form.control,
    name: "item.quantity",
  });

  const staged = useStagedForm({
    steps: [
      { id: "task", title: "Task" },
      { id: "customer", title: "Customer" },
      { id: "assignment", title: "Assignment" },
      { id: "details", title: "Details" },
    ],
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

          if (errors.item ?? errors.item_upholstery) {
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
          if (errors.working_section_assignments) {
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

      return form.trigger(PRE_ORDER_STEP_FIELDS_MAP[currentStepId] ?? []);
    },
    onSubmit: () =>
      form.handleSubmit(async (values) => {
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId },
          "pre_order",
        );

        await createTask.mutateAsync(payload);
        surface.close(TASK_CREATION_PRE_ORDER_SURFACE_ID);
      })(),
  });

  return (
    <FormProvider {...form}>
      <form
        className="flex h-full flex-col"
        data-testid="pre-order-form"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <StagedForm
          activeStepId={staged.activeStepId}
          data-testid="pre-order-staged-form"
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
                <ItemIdentityField />
                <ItemPositionField />
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

          <StagedFormStep id="details" className="px-0">
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
