import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { openCameraMock, preloadImageCameraSurfaceMock } = vi.hoisted(() => ({
  openCameraMock: vi.fn(),
  preloadImageCameraSurfaceMock: vi.fn(() => Promise.resolve()),
}));

vi.mock('../providers/EntityImagesProvider', () => ({
  useEntityImagesContext: () => ({
    openCamera: openCameraMock,
  }),
}));

vi.mock('../surfaces', () => ({
  preloadImageCameraSurface: preloadImageCameraSurfaceMock,
}));

import { ImageAddPictureButton } from './ImageAddPictureButton';

describe('ImageAddPictureButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the camera opener when pressed', async () => {
    const user = userEvent.setup();

    render(<ImageAddPictureButton />);

    await user.click(screen.getByRole('button', { name: 'Add picture' }));

    expect(openCameraMock).toHaveBeenCalledOnce();
  });

  it('preloads the camera surface on intent signals', () => {
    render(<ImageAddPictureButton />);

    const button = screen.getByRole('button', { name: 'Add picture' });
    fireEvent.focus(button);
    fireEvent.pointerEnter(button);
    fireEvent.touchStart(button);

    expect(preloadImageCameraSurfaceMock).toHaveBeenCalledTimes(3);
  });
});
