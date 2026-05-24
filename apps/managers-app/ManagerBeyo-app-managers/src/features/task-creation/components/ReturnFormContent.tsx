import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  FormProvider,
  useForm,
  useWatch,
  type Control,
  type FieldPath,
} from "react-hook-form";

import { StagedForm, StagedFormStep } from "@/components/primitives";
import {
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
} from "@/components/primitives/date";
import {
  CustomerAddressFieldGroup,
  CustomerDisplayNameField,
  CustomerEmailField,
  CustomerPhoneField,
} from "@/features/customers";
import { EntityImagesProvider, ImagePreviewGrid } from "@/features/images";
import {
  ItemCategorySelectionField,
  ItemDesignerField,
  ItemIdentityField,
  ItemIssuesField,
  ItemPositionField,
  ItemQuantityField,
  ItemUpholsteryAmountField,
  ItemUpholsteryField,
  preloadItemCategoryPickerSurface,
} from "@/features/items";
import {
  TaskAdditionalDetailsField,
  TaskDeliveryDateField,
  TaskFulfillmentMethodField,
  TaskReadyByDateField,
  TaskReturnSourceField,
  useCreateTask,
} from "@/features/tasks";
import { preloadPhoneCountryPickerSurface } from "@/features/phone-input";
import { useStagedForm } from "@/hooks/use-staged-form";
import { usePreloadSurface } from "@/hooks/use-preload-surface";
import { useSurface } from "@/hooks/use-surface";

import { ContentCard } from "@/components/primitives";
import { normalizeReturnFormPayload } from "../lib/normalize-task-form-payload";
import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";
import { TASK_CREATION_RETURN_SURFACE_ID } from "../surfaces";
import { ReturnFormSchema, type ReturnFormValues } from "../types";

const RETURN_STEP_FIELDS_MAP: Record<string, FieldPath<ReturnFormValues>[]> = {
  item: ["item", "item_upholstery", "item_issues"],
  customer: ["customer"],
  task: ["return_source", "fulfillment_method", "additional_details"],
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
          <span className="text-sm font-medium text-muted-foreground">
            Upholstery
          </span>
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

export function ReturnFormContent(): React.JSX.Element {
  usePreloadSurface(preloadCalendarRangePickerSurface);
  usePreloadSurface(preloadCalendarSinglePickerSurface);
  usePreloadSurface(preloadItemCategoryPickerSurface);
  usePreloadSurface(preloadPhoneCountryPickerSurface);

  const { taskClientId, itemClientId, customerClientId } =
    useTaskCreationFormContext();
  const createTask = useCreateTask();
  const surface = useSurface();
  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(ReturnFormSchema),
    defaultValues: {
      item: {
        designer: "",
        article_number: "",
        sku: "",
        quantity: 1,
        item_position: "",
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
      ready_by_at: null,
      additional_details: "",
    },
  });
  const majorCategory = useWatch({
    control: form.control,
    name: "item.major_category",
  });

  const staged = useStagedForm({
    steps: [
      { id: "item", title: "Item" },
      { id: "customer", title: "Customer" },
      { id: "task", title: "Task" },
    ],
    mode: "free",
    onBeforeAdvance: async (currentStepId, _nextStepId, setStatus) => {
      if (currentStepId === "task") {
        const allValid = await form.trigger();

        if (!allValid) {
          const { errors } = form.formState;

          if (errors.item ?? errors.item_issues ?? errors.item_upholstery) {
            setStatus("item", "error");
          }
          if (errors.customer) {
            setStatus("customer", "error");
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
          isAdvancing={staged.isAdvancing}
          isFirstStep={staged.isFirstStep}
          isLastStep={staged.isLastStep}
          navigationMode={staged.navigationMode}
          onAdvance={staged.advance}
          onBack={staged.back}
          onNavigate={staged.navigateTo}
          stepStatusMap={staged.stepStatusMap}
          steps={staged.steps}
        >
          <StagedFormStep id="item" className="px-0">
            <div className="flex flex-col gap-4">
              <ContentCard>
                <ItemIdentityField />
                <ItemQuantityField />
                <ItemPositionField />
                <ItemDesignerField />
              </ContentCard>
              <ContentCard>
                <ItemCategorySelectionField />
              </ContentCard>
              <ContentCard>
                <ItemIssuesField />
              </ContentCard>
              {majorCategory === "seat" ? (
                <ContentCard>
                  <UpholsteryField control={form.control} />
                  <ItemUpholsteryAmountField />
                </ContentCard>
              ) : null}
              <ContentCard data-testid="return-form-images-section">
                <EntityImagesProvider
                  entityClientId={itemClientId}
                  entityType="item"
                >
                  <ImagePreviewGrid
                    maxImages={6}
                    testId="return-form-images-grid"
                  />
                </EntityImagesProvider>
              </ContentCard>
            </div>
          </StagedFormStep>

          <StagedFormStep id="customer" className="px-0">
            <div className="flex flex-col gap-4">
              <ContentCard>
                <CustomerDisplayNameField />
                <CustomerEmailField />
                <CustomerPhoneField />
              </ContentCard>
              <ContentCard>
                <CustomerAddressFieldGroup />
              </ContentCard>
            </div>
          </StagedFormStep>

          <StagedFormStep id="task" className="px-0">
            <div className="flex flex-col gap-4">
              <ContentCard>
                <TaskReturnSourceField />
                <TaskFulfillmentMethodField />
              </ContentCard>
              <ContentCard>
                <TaskDeliveryDateField />
                <TaskReadyByDateField />
              </ContentCard>
              <ContentCard>
                <TaskAdditionalDetailsField />
              </ContentCard>
            </div>
          </StagedFormStep>
        </StagedForm>
      </form>
    </FormProvider>
  );
}
