import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UpholsteryCard } from './UpholsteryCard';

const TEST_RECORD = {
  client_id: 'uph_linen_natural',
  name: 'Natural Linen',
  code: 'LN-001',
  image_url: 'https://example.com/upholstery.jpg',
  favorite: false,
  list_order: 1,
  current_stored_amount_meters: '1.05',
  inventory_condition: 'available' as const,
};

describe('UpholsteryCard', () => {
  it('renders name, code, image, and formatted meters', () => {
    render(
      <UpholsteryCard
        record={TEST_RECORD}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Natural Linen')).toBeVisible();
    expect(screen.getByText('LN-001')).toBeVisible();
    expect(screen.getByText(/1[.,]05\s*m/)).toBeVisible();
    expect(screen.getByAltText('Natural Linen')).toHaveClass('rounded-full');
  });

  it('gracefully omits the code when it is null', () => {
    render(
      <UpholsteryCard
        record={{ ...TEST_RECORD, code: null }}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByText('LN-001')).not.toBeInTheDocument();
  });

  it('applies selected styles and emits the selected client id', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <UpholsteryCard
        record={TEST_RECORD}
        isSelected
        onSelect={handleSelect}
        testId="upholstery-card-uph_linen_natural"
      />,
    );

    const button = screen.getByRole('button', { name: 'Natural Linen' });
    expect(screen.getByTestId('upholstery-card-uph_linen_natural')).toHaveClass(
      'bg-primary',
      'text-card',
      'transition-colors',
      'duration-150',
    );

    await user.click(button);

    expect(handleSelect).toHaveBeenCalledWith('uph_linen_natural');
  });

  it('renders the favorite button and triggers the toggle callback', async () => {
    const user = userEvent.setup();
    const handleToggleFavorite = vi.fn();

    render(
      <UpholsteryCard
        record={{ ...TEST_RECORD, favorite: true }}
        isSelected={false}
        onSelect={vi.fn()}
        onToggleFavorite={handleToggleFavorite}
      />,
    );

    const favoriteButton = screen.getByTestId('upholstery-card-favorite-button');
    expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(favoriteButton);

    expect(handleToggleFavorite).toHaveBeenCalledWith('uph_linen_natural', true);
  });
});
