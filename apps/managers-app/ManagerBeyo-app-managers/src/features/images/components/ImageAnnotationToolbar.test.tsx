import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ImageAnnotationToolbar } from './ImageAnnotationToolbar';

describe('ImageAnnotationToolbar', () => {
  it('renders the tools and reports the selected tool', async () => {
    const user = userEvent.setup();
    const onToolChange = vi.fn();

    render(<ImageAnnotationToolbar activeTool="draw" onToolChange={onToolChange} />);

    expect(screen.getByRole('button', { name: 'Draw' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Arrow' }));

    expect(onToolChange).toHaveBeenCalledWith('arrow');
  });
});
