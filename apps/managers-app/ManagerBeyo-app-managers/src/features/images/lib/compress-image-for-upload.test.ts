import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { compressImageForUpload } from './compress-image-for-upload';

describe('compressImageForUpload', () => {
  const createElement = document.createElement.bind(document);
  const mockBitmap = {
    width: 1200,
    height: 800,
    close: vi.fn(),
  };
  const drawImage = vi.fn();
  const getContext = vi.fn(() => ({
    drawImage,
  }));
  const toBlob = vi.fn(
    (callback: BlobCallback, mimeType?: string) =>
      callback(new Blob(['compressed'], { type: mimeType ?? 'image/webp' })),
  );

  beforeEach(() => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext,
          toBlob,
        } as unknown as HTMLCanvasElement;
      }

      return createElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('crops to a square and keeps output inside the configured bounds', async () => {
    const result = await compressImageForUpload(new Blob(['raw'], { type: 'image/png' }), {
      maxWidthPx: 400,
      maxHeightPx: 600,
      quality: 0.82,
      mimeType: 'image/webp',
      outputExtension: 'webp',
    });

    expect(result.widthPx).toBe(400);
    expect(result.heightPx).toBe(400);
    expect(drawImage).toHaveBeenCalledWith(
      mockBitmap,
      200,
      0,
      800,
      800,
      0,
      0,
      400,
      400,
    );
  });

  it('returns a webp filename and closes the bitmap', async () => {
    const result = await compressImageForUpload(new Blob(['raw'], { type: 'image/png' }));

    expect(result.fileName).toMatch(/\.webp$/);
    expect(result.contentType).toBe('image/webp');
    expect(mockBitmap.close).toHaveBeenCalledOnce();
  });
});
