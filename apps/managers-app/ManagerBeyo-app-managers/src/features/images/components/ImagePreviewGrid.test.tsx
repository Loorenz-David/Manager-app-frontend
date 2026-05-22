import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildImageViewModel } from '../test-utils';

const contextValue = {
  deleteImage: vi.fn(),
  images: [] as ReturnType<typeof buildImageViewModel>[],
  isPending: false,
  openViewer: vi.fn(),
  reorderImages: vi.fn(),
};

vi.mock('../providers/EntityImagesProvider', () => ({
  useEntityImagesContext: () => contextValue,
}));

vi.mock('./ImageAddPictureButton', () => ({
  ImageAddPictureButton: () => <div data-testid="mock-add-picture-button" />,
}));

vi.mock('./ImageSortableGrid', () => ({
  ImageSortableGrid: ({
    images,
    isEditMode,
    onLongPress,
    onTap,
  }: {
    images: Array<{ clientId: string }>;
    isEditMode: boolean;
    onLongPress: (imageClientId: string) => void;
    onTap: (imageClientId: string) => void;
  }) => (
    <div data-testid="mock-sortable-grid" data-edit-mode={String(isEditMode)}>
      <button type="button" data-testid="grid-long-press" onClick={() => onLongPress('img_1')}>
        Long press
      </button>
      <button type="button" data-testid="grid-tap" onClick={() => onTap(images[0]!.clientId)}>
        Tap
      </button>
    </div>
  ),
}));

import { ImagePreviewGrid } from './ImagePreviewGrid';

describe('ImagePreviewGrid', () => {
  beforeEach(() => {
    contextValue.deleteImage.mockReset();
    contextValue.openViewer.mockReset();
    contextValue.reorderImages.mockReset();
    contextValue.images = [];
    contextValue.isPending = false;
  });

  it('renders a loading skeleton while images are pending', () => {
    contextValue.isPending = true;

    render(<ImagePreviewGrid />);

    expect(screen.getByLabelText('Loading images')).toBeVisible();
    expect(screen.getByTestId('image-preview-grid-skeleton')).toBeVisible();
  });

  it('renders the add-picture button when not editing and below the max image count', () => {
    contextValue.images = [buildImageViewModel()];

    render(<ImagePreviewGrid maxImages={3} />);

    expect(screen.getByTestId('mock-add-picture-button')).toBeVisible();
  });

  it('enters edit mode on long press and exits when clicking done', () => {
    contextValue.images = [buildImageViewModel()];

    render(<ImagePreviewGrid />);

    fireEvent.click(screen.getByTestId('grid-long-press'));
    expect(screen.getByTestId('image-preview-grid-done-button')).toBeVisible();

    fireEvent.click(screen.getByTestId('image-preview-grid-done-button'));
    expect(screen.queryByTestId('image-preview-grid-done-button')).not.toBeInTheDocument();
  });
});
