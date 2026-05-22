import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildImageViewModel } from '../test-utils';

const { useSurfacePropsMock, closeTopMock } = vi.hoisted(() => ({
  useSurfacePropsMock: vi.fn(),
  closeTopMock: vi.fn(),
}));

vi.mock('@/hooks/use-surface-props', () => ({
  useSurfaceProps: useSurfacePropsMock,
}));

vi.mock('@/providers/SurfaceProvider', () => ({
  useSurfaceStore: {
    getState: () => ({
      closeTop: closeTopMock,
    }),
  },
}));

import { ImageMetadataActionsSheetPage } from './ImageMetadataActionsSheetPage';

describe('ImageMetadataActionsSheetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders metadata fields for the current image', () => {
    useSurfacePropsMock.mockReturnValue({
      image: buildImageViewModel({
        fileSizeBytes: 1536,
        widthPx: 1200,
        heightPx: 800,
      }),
      mode: 'preview-only',
    });

    render(<ImageMetadataActionsSheetPage />);

    expect(screen.getByTestId('metadata-sheet-title')).toHaveTextContent('Image details');
    expect(screen.getByTestId('metadata-sheet-file-size')).toHaveTextContent('1.5 KB');
    expect(screen.getByTestId('metadata-sheet-dimensions')).toHaveTextContent('1200×800 px');
    expect(screen.queryByTestId('metadata-sheet-delete-button')).not.toBeInTheDocument();
  });

  it('calls onDelete and closes the sheet in edit mode', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    useSurfacePropsMock.mockReturnValue({
      image: buildImageViewModel(),
      mode: 'preview-edit',
      onDelete,
    });

    render(<ImageMetadataActionsSheetPage />);

    await user.click(screen.getByTestId('metadata-sheet-delete-button'));

    expect(onDelete).toHaveBeenCalledWith('img_1');
    expect(closeTopMock).toHaveBeenCalledOnce();
  });
});
