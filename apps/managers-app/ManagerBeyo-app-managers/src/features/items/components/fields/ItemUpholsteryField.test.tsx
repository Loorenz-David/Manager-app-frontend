import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ItemUpholsteryField } from './ItemUpholsteryField';

const openMock = vi.fn();

vi.mock('@/hooks/use-surface', () => ({
  useSurface: () => ({
    open: openMock,
  }),
}));

describe('ItemUpholsteryField', () => {
  beforeEach(() => {
    openMock.mockClear();
  });
  it('renders the empty state with placeholder text and chevron icon', () => {
    render(<ItemUpholsteryField value={null} onChange={vi.fn()} />);

    expect(screen.getByText('Select upholstery')).toBeVisible();
    expect(screen.getByRole('button')).toBeVisible();
    expect(screen.getByRole('button').querySelector('svg')).toBeTruthy();
  });

  it('renders the selected upholstery image, name, and code when the value matches test data', () => {
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

  it('renders the fallback id text when no matching upholstery exists', () => {
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
