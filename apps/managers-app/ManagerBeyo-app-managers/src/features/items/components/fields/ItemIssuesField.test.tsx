import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IssueCategoryConfig } from '@/features/items/types';

import { ItemIssuesField } from './ItemIssuesField';

const useItemIssuesPickerFlowMock = vi.fn();

vi.mock('@/features/items/flows/use-item-issues-picker.flow', () => ({
  useItemIssuesPickerFlow: (itemCategoryId: string | null) =>
    useItemIssuesPickerFlowMock(itemCategoryId),
}));

const ISSUE_OPTIONS: IssueCategoryConfig[] = [
  {
    client_id: 'icc_1',
    item_category_id: 'cat_wood',
    issue_type_id: 'issue_scratches',
    base_time_seconds: 600,
    issue_type_name: 'Scratches',
  },
];

function FormDebug() {
  const { setValue } = useFormContext();
  const issues = useWatch({ name: 'item_issues' });

  return (
    <>
      <output data-testid="issues-value">{JSON.stringify(issues ?? [])}</output>
      <button
        type="button"
        data-testid="change-category"
        onClick={() => setValue('item.item_category_id', 'cat_seat')}
      >
        Change category
      </button>
    </>
  );
}

function renderField(defaultCategoryId: string | null) {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: {
        item: {
          item_category_id: defaultCategoryId,
        },
        item_issues:
          defaultCategoryId === null
            ? []
            : [{ issue_id: 'issue_scratches', issue_severity_id: 'severity_low' }],
      },
    });

    return (
      <FormProvider {...methods}>
        <ItemIssuesField />
        <FormDebug />
      </FormProvider>
    );
  };

  return render(<Wrapper />);
}

describe('ItemIssuesField', () => {
  beforeEach(() => {
    useItemIssuesPickerFlowMock.mockImplementation((itemCategoryId: string | null) => ({
      options: itemCategoryId ? ISSUE_OPTIONS : [],
      isLoading: false,
      isDisabled: itemCategoryId === null,
    }));
  });

  it('renders the disabled placeholder when no category is selected', () => {
    renderField(null);

    expect(screen.getByTestId('item-issues-disabled-state')).toHaveTextContent(
      'Select a category first',
    );
    expect(screen.queryByTestId('item-issues-picker')).not.toBeInTheDocument();
  });

  it('renders picker options from the flow when a category is selected', () => {
    renderField('cat_wood');

    expect(screen.getByTestId('item-issues-picker')).toBeVisible();
    expect(screen.getByText(/Scratches/)).toBeVisible();
  });

  it('resets selected issues when the category changes', async () => {
    const user = userEvent.setup();
    renderField('cat_wood');

    expect(screen.getByTestId('issues-value')).toHaveTextContent('issue_scratches');

    await user.click(screen.getByTestId('change-category'));

    expect(screen.getByTestId('issues-value')).toHaveTextContent('[]');
  });
});
