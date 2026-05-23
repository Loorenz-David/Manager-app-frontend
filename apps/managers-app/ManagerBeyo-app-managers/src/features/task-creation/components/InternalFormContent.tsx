import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm, useWatch, type Control, type FieldPath } from 'react-hook-form';

import { StagedForm, StagedFormStep } from '@/components/primitives';
import { EntityImagesProvider, ImagePreviewGrid } from '@/features/images';
import {
  ItemCategorySelectionField,
  ItemDesignerField,
  ItemIdentityField,
  ItemIssuesField,
  ItemPositionField,
  ItemQuantityField,
  ItemUpholsteryAmountField,
  ItemUpholsteryField,
} from '@/features/items';
import { TaskAdditionalDetailsField, TaskReadyByDateField } from '@/features/tasks';
import {
  NeedsCleaningPickerField,
  OilingTreatmentPickerField,
  WorkingSectionPickerField,
} from '@/features/working-sections';
import { useStagedForm } from '@/hooks/use-staged-form';

import { FormFieldContainer } from './FormFieldContainer';
import { useTaskCreationFormContext } from '../providers/TaskCreationFormProvider';
import { InternalFormSchema, type InternalFormValues } from '../types';

const INTERNAL_STEP_FIELDS_MAP: Record<string, FieldPath<InternalFormValues>[]> = {
  item: [
    'item',
    'item_upholstery',
    'item_issues',
    'needs_cleaning_assignment',
    'oiling_treatment_assignment',
  ],
  assignment: ['working_section_assignments'],
  task: ['ready_by_at', 'additional_details'],
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
          <span className="text-sm font-medium text-muted-foreground">Upholstery</span>
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

export function InternalFormContent(): React.JSX.Element {
  const { itemClientId } = useTaskCreationFormContext();
  const form = useForm<InternalFormValues>({
    resolver: zodResolver(InternalFormSchema),
    defaultValues: {
      item: {
        designer: '',
        article_number: '',
        sku: '',
        quantity: 1,
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
      needs_cleaning_assignment: null,
      oiling_treatment_assignment: null,
      working_section_assignments: [],
      ready_by_at: null,
      additional_details: '',
    },
  });
  const majorCategory = useWatch({ control: form.control, name: 'item.major_category' });

  const staged = useStagedForm({
    steps: [
      { id: 'item', title: 'Item' },
      { id: 'assignment', title: 'Assignment' },
      { id: 'task', title: 'Task' },
    ],
    mode: 'free',
    onBeforeAdvance: async (currentStepId, _nextStepId, setStatus) => {
      if (currentStepId === 'task') {
        const allValid = await form.trigger();

        if (!allValid) {
          const { errors } = form.formState;

          if (
            errors.item ??
            errors.item_issues ??
            errors.item_upholstery ??
            errors.needs_cleaning_assignment ??
            errors.oiling_treatment_assignment
          ) {
            setStatus('item', 'error');
          }
          if (errors.working_section_assignments) {
            setStatus('assignment', 'error');
          }
        }

        return allValid;
      }

      return form.trigger(INTERNAL_STEP_FIELDS_MAP[currentStepId] ?? []);
    },
    onSubmit: () =>
      form.handleSubmit((values) => {
        console.log('internal_form submit', values);
      })(),
  });

  return (
    <FormProvider {...form}>
      <form
        className="flex h-full flex-col"
        data-testid="internal-form"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <StagedForm
          activeStepId={staged.activeStepId}
          data-testid="internal-staged-form"
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
              <FormFieldContainer>
                <ItemIdentityField />
              </FormFieldContainer>
              <FormFieldContainer>
                <ItemCategorySelectionField />
              </FormFieldContainer>
              {majorCategory === 'seat' ? (
                <FormFieldContainer>
                  <ItemQuantityField />
                  <ItemPositionField />
                </FormFieldContainer>
              ) : null}
              {majorCategory === 'wood' ? (
                <FormFieldContainer>
                  <ItemIssuesField />
                </FormFieldContainer>
              ) : null}
              {majorCategory === 'wood' ? (
                <FormFieldContainer>
                  <NeedsCleaningPickerField />
                  <OilingTreatmentPickerField />
                </FormFieldContainer>
              ) : null}
              {majorCategory === 'seat' ? (
                <FormFieldContainer>
                  <UpholsteryField control={form.control} />
                  <ItemUpholsteryAmountField />
                </FormFieldContainer>
              ) : null}
              <FormFieldContainer>
                <ItemDesignerField />
              </FormFieldContainer>
            </div>
          </StagedFormStep>

          <StagedFormStep id="assignment" className="px-0">
            <div className="flex flex-col gap-4">
              <FormFieldContainer>
                <WorkingSectionPickerField majorCategory={majorCategory} />
              </FormFieldContainer>
            </div>
          </StagedFormStep>

          <StagedFormStep id="task" className="px-0">
            <div className="flex flex-col gap-4">
              <FormFieldContainer data-testid="internal-form-images-section">
                <EntityImagesProvider entityClientId={itemClientId} entityType="item">
                  <ImagePreviewGrid maxImages={6} testId="internal-form-images-grid" />
                </EntityImagesProvider>
              </FormFieldContainer>
              <FormFieldContainer>
                <TaskReadyByDateField />
                <TaskAdditionalDetailsField />
              </FormFieldContainer>
            </div>
          </StagedFormStep>
        </StagedForm>
      </form>
    </FormProvider>
  );
}
