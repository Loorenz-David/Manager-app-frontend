import { buildCompressedImageFileName } from './build-compressed-image-filename';

export type ImageCompressionOptions = {
  maxWidthPx: number;
  maxHeightPx: number;
  quality: number;
  mimeType: string;
  outputExtension: string;
};

export const DEFAULT_IMAGE_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  maxWidthPx: 1600,
  maxHeightPx: 1600,
  quality: 0.82,
  mimeType: 'image/webp',
  outputExtension: 'webp',
};

export type CompressedImageResult = {
  blob: Blob;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  widthPx: number;
  heightPx: number;
};

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('canvas.toBlob returned null'));
        return;
      }

      resolve(result);
    }, mimeType, quality);
  });
}

export async function compressImageForUpload(
  rawBlob: Blob,
  options: ImageCompressionOptions = DEFAULT_IMAGE_COMPRESSION_OPTIONS,
): Promise<CompressedImageResult> {
  const bitmap = await createImageBitmap(rawBlob);

  try {
    const sourceSize = Math.min(bitmap.width, bitmap.height);
    const sourceX = Math.floor((bitmap.width - sourceSize) / 2);
    const sourceY = Math.floor((bitmap.height - sourceSize) / 2);
    const outputSize = Math.min(sourceSize, options.maxWidthPx, options.maxHeightPx);

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }

    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize,
    );

    const blob = await canvasToBlob(canvas, options.mimeType, options.quality);
    const contentType = blob.type || options.mimeType;

    if (contentType !== options.mimeType) {
      console.warn('Image compression produced a different mime type than requested.', {
        requestedMimeType: options.mimeType,
        actualMimeType: contentType,
      });
    }

    return {
      blob,
      fileName: buildCompressedImageFileName(options.outputExtension),
      contentType,
      fileSizeBytes: blob.size,
      widthPx: outputSize,
      heightPx: outputSize,
    };
  } finally {
    bitmap.close();
  }
}
