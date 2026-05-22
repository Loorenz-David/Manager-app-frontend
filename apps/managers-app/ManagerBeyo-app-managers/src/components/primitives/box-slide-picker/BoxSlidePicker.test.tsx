import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BoxSlidePicker } from './BoxSlidePicker';

describe('BoxSlidePicker', () => {
  it('renders options with selected-state semantics and emits value changes', async () => {
    const user = userEvent.setup();
    const handleValueChange = vi.fn();

    render(
      <BoxSlidePicker
        dataTestId="slide-picker"
        options={[
          { value: 'from', label: 'From', testId: 'from-option' },
          { value: 'to', label: 'To', testId: 'to-option' },
        ]}
        value="from"
        onValueChange={handleValueChange}
      />,
    );

    expect(screen.getByTestId('slide-picker')).toHaveAttribute('role', 'radiogroup');
    expect(screen.getByTestId('from-option')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('to-option')).toHaveAttribute('aria-selected', 'false');

    await user.click(screen.getByTestId('to-option'));

    expect(handleValueChange).toHaveBeenCalledWith('to');
  });

  it('respects disabled picker and disabled options', async () => {
    const user = userEvent.setup();
    const handleValueChange = vi.fn();

    const { rerender } = render(
      <BoxSlidePicker
        options={[
          { value: 'from', label: 'From', testId: 'from-option' },
          { value: 'to', label: 'To', testId: 'to-option', disabled: true },
        ]}
        value="from"
        onValueChange={handleValueChange}
      />,
    );

    await user.click(screen.getByTestId('to-option'));
    expect(handleValueChange).not.toHaveBeenCalled();

    rerender(
      <BoxSlidePicker
        disabled
        options={[
          { value: 'from', label: 'From', testId: 'from-option' },
          { value: 'to', label: 'To', testId: 'to-option' },
        ]}
        value="from"
        onValueChange={handleValueChange}
      />,
    );

    await user.click(screen.getByTestId('to-option'));
    expect(handleValueChange).not.toHaveBeenCalled();
  });

  it('supports a compact small size for xs label treatments', () => {
    render(
      <BoxSlidePicker
        dataTestId="slide-picker"
        options={[
          { value: 'from', label: 'From', testId: 'from-option' },
          { value: 'to', label: 'To', testId: 'to-option' },
        ]}
        size="sm"
        value="from"
        onValueChange={() => {}}
      />,
    );

    expect(screen.getByTestId('slide-picker')).toHaveClass('rounded-xl', 'p-0.5');
    expect(screen.getByTestId('from-option')).toHaveClass(
      'min-h-8',
      'text-xs',
      'px-2.5',
      'py-1',
    );
  });
});
