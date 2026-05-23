import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ItemCategoryPickerOption } from '@/features/items/types';

import { ItemCategorySelectionField } from './ItemCategorySelectionField';

const openMock = vi.fn();
const useItemCategoryPickerFlowMock = vi.fn();

vi.mock('@/features/items/flows/use-item-category-picker.flow', () => ({
  useItemCategoryPickerFlow: () => useItemCategoryPickerFlowMock(),
}));

vi.mock('@/providers/SurfaceProvider', () => ({
  useSurfaceStore: {
    getState: () => ({
      open: openMock,
    }),
  },
}));

const OPTIONS: ItemCategoryPickerOption[] = [
  {
    client_id: 'cat_wood_table',
    name: 'Table',
    major_category: 'wood',
    image_url: null,
  },
  {
    client_id: 'cat_seat_chair',
    name: 'Chair',
    major_category: 'seat',
    image_url: null,
  },
];

function MajorValue() {
  const majorCategory = useWatch({ name: 'item.major_category' }) as string | undefined;
  return <output data-testid="major-category-value">{majorCategory ?? ''}</output>;
}

function renderField(defaultValues?: {
  item?: { major_category?: string | null; item_category_id?: string | null };
}) {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: defaultValues ?? {
        item: {
          major_category: '',
          item_category_id: null,
        },
      },
    });

    return (
      <FormProvider {...methods}>
        <ItemCategorySelectionField />
        <MajorValue />
      </FormProvider>
    );
  };

  return render(<Wrapper />);
}

describe('ItemCategorySelectionField', () => {
  beforeEach(() => {
    openMock.mockClear();
    useItemCategoryPickerFlowMock.mockReturnValue({
      options: OPTIONS,
      byMajorCategory: {
        wood: [OPTIONS[0]],
        seat: [OPTIONS[1]],
      },
      isLoading: false,
    });
  });

  it('derives the major category from an injected category id', () => {
    renderField({
      item: {
        major_category: '',
        item_category_id: 'cat_wood_table',
      },
    });

    expect(screen.getByTestId('major-category-value')).toHaveTextContent('wood');
  });

  it('keeps the major category picker interactive while categories are loading', async () => {
    const user = userEvent.setup();
    useItemCategoryPickerFlowMock.mockReturnValue({
      options: [],
      byMajorCategory: {},
      isLoading: true,
    });

    renderField();

    await user.click(screen.getByText('Wood'));

    expect(screen.getByTestId('item-major-category-picker')).toBeVisible();
    expect(screen.getByTestId('item-category-picker-trigger')).toBeDisabled();
    expect(screen.getByText('Loading categories…')).toBeVisible();
    expect(openMock).not.toHaveBeenCalled();
  });
});
