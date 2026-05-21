import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NumberInput } from './NumberInput';

describe('NumberInput', () => {
  it('allows integer editing and empty clearing without fighting the user', async () => {
    const user = userEvent.setup();
    const handleValueChange = vi.fn();

    render(<NumberInput inputTestId="number-input" onValueChange={handleValueChange} />);

    const input = screen.getByTestId('number-input');
    await user.type(input, '12');
    expect(input).toHaveValue('12');

    await user.clear(input);
    expect(input).toHaveValue('');
    expect(handleValueChange).toHaveBeenLastCalledWith(
      null,
      expect.objectContaining({ isEmpty: true }),
    );
  });

  it('keeps partial decimals during editing and normalizes them on blur', async () => {
    const user = userEvent.setup();

    render(<NumberInput allowDecimal inputTestId="number-input" />);

    const input = screen.getByTestId('number-input');
    await user.type(input, '1.');
    expect(input).toHaveValue('1.');

    await user.tab();
    expect(input).toHaveValue('1');
  });

  it('steps values through the integrated controls and respects min bounds', async () => {
    const user = userEvent.setup();
    const handleValueChange = vi.fn();

    render(
      <NumberInput
        decrementTestId="decrement"
        incrementTestId="increment"
        inputTestId="number-input"
        min={0}
        step={1}
        value={1}
        onValueChange={handleValueChange}
      />,
    );

    await user.click(screen.getByTestId('increment'));
    expect(handleValueChange).toHaveBeenLastCalledWith(
      2,
      expect.objectContaining({ sanitizedDraft: '2' }),
    );

    await user.click(screen.getByTestId('decrement'));
    await user.click(screen.getByTestId('decrement'));
    expect(handleValueChange).toHaveBeenLastCalledWith(
      0,
      expect.objectContaining({ sanitizedDraft: '0' }),
    );
  });

  it('renders a visual unit label without making it part of the editable value', async () => {
    const user = userEvent.setup();

    render(<NumberInput inputTestId="number-input" unitLabel="cm" value={120} />);

    expect(screen.getByText('cm')).toBeVisible();
    const input = screen.getByTestId('number-input');
    expect(input).toHaveValue('120');

    await user.clear(input);
    expect(screen.getByText('cm')).toBeVisible();
  });
});
