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
    expect(screen.queryByTestId('metadata-sheet-toggle-annotations-button')).not.toBeInTheDocument();
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

  it('opens with "Show annotations" when annotationsVisible is false', () => {
    useSurfacePropsMock.mockReturnValue({
      image: buildImageViewModel({
        annotations: [
          {
            clientId: 'ann_1',
            annotationType: 'rectangle',
            accuracy: null,
            createdAt: '2026-05-22T12:00:00.000Z',
            data: {
              tool: 'rectangle',
              x: 0.1,
              y: 0.2,
              width: 0.3,
              height: 0.2,
              color: '#ff0000',
              strokeWidth: 4,
            },
          },
        ],
      }),
      mode: 'preview-only',
      annotationsVisible: false,
      onToggleAnnotations: vi.fn(),
    });

    render(<ImageMetadataActionsSheetPage />);

    expect(screen.getByTestId('metadata-sheet-toggle-annotations-button')).toHaveTextContent(
      'Show annotations',
    );
  });

  it('renders a hide/show annotations action for annotated images and flips the label locally', async () => {
    const user = userEvent.setup();
    const onToggleAnnotations = vi.fn();

    useSurfacePropsMock.mockReturnValue({
      image: buildImageViewModel({
        annotations: [
          {
            clientId: 'ann_1',
            annotationType: 'rectangle',
            accuracy: null,
            createdAt: '2026-05-22T12:00:00.000Z',
            data: {
              tool: 'rectangle',
              x: 0.1,
              y: 0.2,
              width: 0.3,
              height: 0.2,
              color: '#ff0000',
              strokeWidth: 4,
            },
          },
        ],
      }),
      mode: 'preview-only',
      annotationsVisible: true,
      onToggleAnnotations,
    });

    render(<ImageMetadataActionsSheetPage />);

    const toggleButton = screen.getByTestId('metadata-sheet-toggle-annotations-button');

    expect(toggleButton).toHaveTextContent('Hide annotations');

    await user.click(toggleButton);

    expect(onToggleAnnotations).toHaveBeenCalledOnce();
    expect(screen.getByTestId('metadata-sheet-toggle-annotations-button')).toHaveTextContent('Show annotations');
  });
});
