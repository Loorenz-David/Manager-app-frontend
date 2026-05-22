import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildImageViewModel } from '../test-utils';

const openViewerMock = vi.fn();
const deleteImageMock = vi.fn();

vi.mock('../providers/EntityImagesProvider', () => ({
  useEntityImagesContext: () => ({
    openViewer: openViewerMock,
    deleteImage: deleteImageMock,
  }),
}));

import { ImagePreviewTile } from './ImagePreviewTile';

describe('ImagePreviewTile', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows an upload overlay for uploading images', () => {
    render(
      <ImagePreviewTile
        image={buildImageViewModel({
          uploadState: 'uploading',
        })}
      />,
    );

    expect(screen.getByTestId('image-upload-overlay')).toBeVisible();
    expect(screen.getByTestId('image-upload-spinner')).toBeVisible();
  });

  it('shows an error badge for failed images', () => {
    render(
      <ImagePreviewTile
        image={buildImageViewModel({
          uploadState: 'failed',
        })}
      />,
    );

    expect(screen.getByTestId('image-upload-error-badge')).toHaveTextContent('Failed');
  });

  it('calls the tap handler for confirmed images', () => {
    const onTap = vi.fn();

    render(<ImagePreviewTile image={buildImageViewModel()} onTap={onTap} />);

    fireEvent.click(screen.getByTestId('image-preview-tile-button-img_1'));

    expect(onTap).toHaveBeenCalledWith('img_1');
  });

  it('suppresses the tap callback after a long press', () => {
    const onTap = vi.fn();
    const onLongPress = vi.fn();

    render(
      <ImagePreviewTile
        image={buildImageViewModel()}
        onTap={onTap}
        onLongPress={onLongPress}
      />,
    );

    const tile = screen.getByTestId('image-preview-tile-img_1');
    fireEvent.pointerDown(tile);
    vi.advanceTimersByTime(500);
    fireEvent.click(screen.getByTestId('image-preview-tile-button-img_1'));

    expect(onLongPress).toHaveBeenCalledWith('img_1');
    expect(onTap).not.toHaveBeenCalled();
  });
});
