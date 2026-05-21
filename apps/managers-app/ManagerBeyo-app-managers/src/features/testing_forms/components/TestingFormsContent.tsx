import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

import { CustomerFieldGroup, CustomerFieldsSchema } from '@/features/customers';
import {
  ItemCategorySelectionField,
  ItemDetailsFieldGroup,
  ItemDetailsFieldsSchema,
  ItemIssuesField,
  ItemIssuesFieldsSchema,
} from '@/features/items';
import {
  TaskDeliveryDateField,
  TaskFulfillmentMethodField,
  TaskReadyByDateField,
  TaskReturnSourceField,
} from '@/features/tasks';
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
  item_issues: ItemIssuesFieldsSchema.shape.item_issues,
  ready_by_at: DateOnlySchema.nullable().optional(),
  scheduled_start_at: DateOnlySchema.nullable().optional(),
  scheduled_end_at: DateOnlySchema.nullable().optional(),
  fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).optional(),
  return_source: z.enum(TASK_RETURN_SOURCE).optional(),
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
      item_issues: [],
      ready_by_at: null,
      scheduled_start_at: null,
      scheduled_end_at: null,
      fulfillment_method: undefined,
      return_source: undefined,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log('testing_forms submit', values);
  });

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-8 p-6"
        data-testid="testing-forms-form"
        noValidate
        onSubmit={onSubmit}
      >
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Customer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Validate the composed customer field group and nested address inputs.
            </p>
          </div>
          <CustomerFieldGroup />
        </section>

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
            <ItemIssuesField />
          </div>
        </section>

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
            <TaskReadyByDateField />
            <TaskDeliveryDateField />
          </div>
        </section>

        <button
          className="rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="testing-forms-submit-button"
          type="submit"
        >
          Submit test form
        </button>
      </form>
    </FormProvider>
  );
}
