import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm, type FieldPath } from 'react-hook-form';
import { z } from 'zod';

import { StagedForm, StagedFormStep } from '@/components/primitives';
import { CustomerFieldGroup, CustomerFieldsSchema } from '@/features/customers';
import {
  EntityImagesProvider,
  ImagePreviewGrid,
} from '@/features/images';
import {
  ItemCategorySelectionField,
  ItemDetailsFieldGroup,
  ItemDetailsFieldsSchema,
  ItemIssuesField,
  ItemIssuesFieldsSchema,
  ItemUpholsteryAmountField,
  ItemUpholsteryField,
  ItemUpholsteryFieldsSchema,
} from '@/features/items';
import {
  TaskAdditionalDetailsField,
  TaskAdditionalDetailsFieldsSchema,
  TaskDeliveryDateField,
  TaskFulfillmentMethodField,
  TaskReadyByDateField,
  TaskReturnSourceField,
} from '@/features/tasks';
import {
  NeedsCleaningPickerField,
  OilingTreatmentPickerField,
  WorkingSectionPickerField,
  WorkingSectionPickerFieldsSchema,
} from '@/features/working-sections';
import { useStagedForm } from '@/hooks/use-staged-form';
import { DateOnlySchema } from '@/types/common';

const TASK_FULFILLMENT_METHOD = ['pickup_at_store', 'delivery'] as const;
const TASK_RETURN_SOURCE = [
  'after_purchase',
  'before_purchase',
  'store_return',
] as const;

const TestingFormsSchema = z.object({
  customer: CustomerFieldsSchema,
  item: ItemDetailsFieldsSchema,
  item_upholstery: ItemUpholsteryFieldsSchema,
  item_issues: ItemIssuesFieldsSchema.shape.item_issues,
  ready_by_at: DateOnlySchema.nullable().optional(),
  scheduled_start_at: DateOnlySchema.nullable().optional(),
  scheduled_end_at: DateOnlySchema.nullable().optional(),
  fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).optional(),
  return_source: z.enum(TASK_RETURN_SOURCE).optional(),
  additional_details: TaskAdditionalDetailsFieldsSchema.shape.additional_details,
  working_section_assignments: WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
  needs_cleaning_assignment: WorkingSectionPickerFieldsSchema.shape.needs_cleaning_assignment,
  oiling_treatment_assignment: WorkingSectionPickerFieldsSchema.shape.oiling_treatment_assignment,
});

type TestingFormsValues = z.input<typeof TestingFormsSchema>;

export function TestingFormsContent(): React.JSX.Element {
  const form = useForm<TestingFormsValues>({
    resolver: zodResolver(TestingFormsSchema),
    defaultValues: {
      customer: {
        display_name: '',
        customer_type: undefined,
        primary_email: '',
        primary_phone_number: '',
        address: {
          street: '',
          city: '',
          postal_code: '',
          country: '',
        },
      },
      item: {
        designer: '',
        article_number: '',
        sku: '',
        quantity: undefined,
        item_position: '',
        item_currency: undefined,
        item_category_id: undefined,
        major_category: undefined,
      },
      item_upholstery: {
        upholstery_client_id: null,
        upholstery_amount_meters: null,
      },
      item_issues: [],
      ready_by_at: null,
      scheduled_start_at: null,
      scheduled_end_at: null,
      fulfillment_method: undefined,
      return_source: undefined,
      additional_details: '',
      working_section_assignments: [],
      needs_cleaning_assignment: null,
      oiling_treatment_assignment: null,
    },
  });

  const staged = useStagedForm({
    steps: [
      { id: 'item', title: 'Item' },
      { id: 'customer', title: 'Customer' },
      { id: 'task', title: 'Task' },
    ],
    mode: 'free',
    onBeforeAdvance: async (currentStepId, _nextStepId, setStatus) => {
      const stepFieldsMap: Record<string, FieldPath<TestingFormsValues>[]> = {
        item: [
          'item',
          'item_upholstery',
          'item_issues',
          'needs_cleaning_assignment',
          'oiling_treatment_assignment',
        ],
        customer: ['customer'],
        task: [
          'fulfillment_method',
          'return_source',
          'additional_details',
          'working_section_assignments',
        ],
      };

      // On the last step, validate all steps so skipped ones show error state.
      if (currentStepId === 'task') {
        const allValid = await form.trigger();
        if (!allValid) {
          const { errors } = form.formState;
          if (errors.item ?? errors.item_issues) setStatus('item', 'error');
          if (errors.customer) setStatus('customer', 'error');
        }
        return allValid;
      }

      return form.trigger(stepFieldsMap[currentStepId] ?? []);
    },
    onSubmit: () =>
      form.handleSubmit((values) => {
        console.log('testing_forms submit', values);
      })(),
  });
  return (
    <FormProvider {...form}>
      <form
        className="flex h-full flex-col"
        data-testid="testing-forms-form"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <StagedForm
          activeStepId={staged.activeStepId}
          data-testid="testing-forms-staged-form"
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
          <StagedFormStep id="item">
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Item</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Validate the item details field composition layer and selectors.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <ItemDetailsFieldGroup />
                <ItemCategorySelectionField />
                <Controller
                  name="item_upholstery.upholstery_client_id"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-sm font-medium text-muted-foreground"
                        htmlFor="testing-forms-item-upholstery-field"
                      >
                        Upholstery
                      </label>
                      <ItemUpholsteryField
                        value={field.value}
                        onChange={field.onChange}
                        title="Select upholstery"
                        description="Choose the upholstery assigned to this item."
                      />
                    </div>
                  )}
                />
                <ItemUpholsteryAmountField />
                <ItemIssuesField />
                <NeedsCleaningPickerField />
                <OilingTreatmentPickerField />
                <section className="rounded-2xl border border-border p-4" data-testid="testing-images-harness-section">
                  <EntityImagesProvider
                    entityType="item"
                    entityClientId="testing-item-images"
                  >
                    <ImagePreviewGrid maxImages={6} testId="testing-images-grid" />
                  </EntityImagesProvider>
                </section>
              </div>
            </section>
          </StagedFormStep>

          <StagedFormStep id="customer">
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Customer</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Validate the composed customer field group and nested address inputs.
                </p>
              </div>
              <CustomerFieldGroup />
            </section>
          </StagedFormStep>

          <StagedFormStep id="task">
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Task fields</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Validate the box-picker task selectors alongside the date sheet flows.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <TaskFulfillmentMethodField />
                <TaskReturnSourceField />
                <TaskAdditionalDetailsField />
                <TaskReadyByDateField />
                <TaskDeliveryDateField />
                <WorkingSectionPickerField />
              </div>
            </section>
          </StagedFormStep>
        </StagedForm>
      </form>
    </FormProvider>
  );
}
