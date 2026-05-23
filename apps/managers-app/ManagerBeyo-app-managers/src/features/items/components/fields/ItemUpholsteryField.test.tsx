import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ItemUpholsteryField } from './ItemUpholsteryField';

const openMock = vi.fn();
const useUpholsterySelectionStoreMock = vi.fn();
const useUpholsteryPickerOptionQueryMock = vi.fn();

vi.mock('@/hooks/use-surface', () => ({
  useSurface: () => ({
    open: openMock,
  }),
}));

vi.mock('@/features/upholstery', () => ({
  useUpholsterySelectionStore: (selector: (state: { options: unknown[] }) => unknown) =>
    useUpholsterySelectionStoreMock(selector),
  useUpholsteryPickerOptionQuery: (...args: unknown[]) =>
    useUpholsteryPickerOptionQueryMock(...args),
}));

const STORE_OPTION = {
  client_id: 'uph_linen_natural',
  name: 'Natural Linen',
  code: 'LN-001',
  image_url: 'https://example.com/linen.jpg',
  current_stored_amount_meters: '12.5',
  inventory_condition: 'available' as const,
};

describe('ItemUpholsteryField', () => {
  beforeEach(() => {
    openMock.mockClear();
    useUpholsterySelectionStoreMock.mockImplementation((selector) =>
      selector({ options: [STORE_OPTION] }),
    );
    useUpholsteryPickerOptionQueryMock.mockReturnValue({
      data: null,
      isPending: false,
    });
  });
  it('renders the empty state with placeholder text and chevron icon', () => {
    render(<ItemUpholsteryField value={null} onChange={vi.fn()} />);

    expect(screen.getByText('Select upholstery')).toBeVisible();
    expect(screen.getByRole('button')).toBeVisible();
    expect(screen.getByRole('button').querySelector('svg')).toBeTruthy();
  });

  it('renders the selected upholstery image, name, and code from the store', () => {
    render(
      <ItemUpholsteryField
        value="uph_linen_natural"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByAltText('Natural Linen')).toHaveClass('rounded-full');
    expect(screen.getByText('Natural Linen')).toBeVisible();
    expect(screen.getByText('LN-001')).toBeVisible();
  });

  it('renders the fetched upholstery when the store is empty', () => {
    useUpholsterySelectionStoreMock.mockImplementation((selector) =>
      selector({ options: [] }),
    );
    useUpholsteryPickerOptionQueryMock.mockReturnValue({
      data: {
        ...STORE_OPTION,
        client_id: 'uph_fetched',
        name: 'Fetched Velvet',
        code: 'FV-009',
      },
      isPending: false,
    });

    render(<ItemUpholsteryField value="uph_fetched" onChange={vi.fn()} />);

    expect(screen.getByText('Fetched Velvet')).toBeVisible();
    expect(screen.getByText('FV-009')).toBeVisible();
  });

  it('shows a loading label while the edit-mode fallback fetch is pending', () => {
    useUpholsterySelectionStoreMock.mockImplementation((selector) =>
      selector({ options: [] }),
    );
    useUpholsteryPickerOptionQueryMock.mockReturnValue({
      data: null,
      isPending: true,
    });

    render(<ItemUpholsteryField value="missing-upholstery-id" onChange={vi.fn()} />);

    expect(screen.getByText('Loading upholstery…')).toBeVisible();
  });

  it('renders the fallback id text when no matching upholstery exists', () => {
    useUpholsterySelectionStoreMock.mockImplementation((selector) =>
      selector({ options: [] }),
    );
    render(
      <ItemUpholsteryField value="missing-upholstery-id" onChange={vi.fn()} />,
    );

    expect(screen.getByText('missing-upholstery-id')).toBeVisible();
  });

  it('opens the upholstery picker surface with the current selection and callbacks', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <ItemUpholsteryField
        value="uph_linen_natural"
        onChange={handleChange}
        title="Select upholstery"
        description="Choose a fabric"
      />,
    );

    await user.click(screen.getByRole('button'));

    expect(openMock).toHaveBeenCalledWith('upholstery-picker', {
      currentClientId: 'uph_linen_natural',
      onSelect: handleChange,
      title: 'Select upholstery',
      description: 'Choose a fabric',
    });
  });
});
