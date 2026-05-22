import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  compressImageForUploadMock,
  requestImageUploadUrlMock,
  uploadBlobToSignedUrlMock,
  confirmImageUploadMock,
} = vi.hoisted(() => ({
  compressImageForUploadMock: vi.fn(),
  requestImageUploadUrlMock: vi.fn(),
  uploadBlobToSignedUrlMock: vi.fn(),
  confirmImageUploadMock: vi.fn(),
}));

vi.mock('./compress-image-for-upload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./compress-image-for-upload')>();

  return {
    ...actual,
    compressImageForUpload: compressImageForUploadMock,
  };
});

vi.mock('../api/request-image-upload-url', () => ({
  requestImageUploadUrl: requestImageUploadUrlMock,
}));

vi.mock('../api/upload-blob-to-signed-url', () => ({
  uploadBlobToSignedUrl: uploadBlobToSignedUrlMock,
}));

vi.mock('../api/confirm-image-upload', () => ({
  confirmImageUpload: confirmImageUploadMock,
}));

import { runImageUploadPipeline } from './image-upload-pipeline';
import { buildImage } from '../test-utils';

describe('runImageUploadPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    compressImageForUploadMock.mockResolvedValue({
      blob: new Blob(['compressed'], { type: 'image/webp' }),
      fileName: 'image-upload.webp',
      contentType: 'image/webp',
      fileSizeBytes: 456,
      widthPx: 400,
      heightPx: 400,
    });
    requestImageUploadUrlMock.mockResolvedValue({
      upload_url: 'https://storage.example.com/upload',
      pending_upload_client_id: 'pending_1',
      storage_key: 'storage-key',
      expires_in: 3600,
    });
    uploadBlobToSignedUrlMock.mockResolvedValue(undefined);
    confirmImageUploadMock.mockResolvedValue(buildImage());
  });

  it('runs compression before upload url request and reports progress in order', async () => {
    const callOrder: string[] = [];
    compressImageForUploadMock.mockImplementationOnce(async () => {
      callOrder.push('compress');
      return {
        blob: new Blob(['compressed'], { type: 'image/webp' }),
        fileName: 'image-upload.webp',
        contentType: 'image/webp',
        fileSizeBytes: 456,
        widthPx: 400,
        heightPx: 400,
      };
    });
    requestImageUploadUrlMock.mockImplementationOnce(async () => {
      callOrder.push('request_upload_url');
      return {
        upload_url: 'https://storage.example.com/upload',
        pending_upload_client_id: 'pending_1',
        storage_key: 'storage-key',
        expires_in: 3600,
      };
    });
    const progressStates: string[] = [];

    await runImageUploadPipeline({
      rawBlob: new Blob(['raw']),
      entityType: 'item',
      entityClientId: 'item_1',
      onProgress: (state) => progressStates.push(state),
    });

    expect(callOrder).toEqual(['compress', 'request_upload_url']);
    expect(progressStates).toEqual([
      'compressing',
      'requesting_upload_url',
      'uploading',
      'confirming',
      'completed',
    ]);
  });

  it('uses compressed metadata for the signed upload request', async () => {
    await runImageUploadPipeline({
      rawBlob: new Blob(['raw']),
      entityType: 'item',
      entityClientId: 'item_1',
    });

    expect(requestImageUploadUrlMock).toHaveBeenCalledWith({
      entity_type: 'item',
      entity_client_id: 'item_1',
      file_name: 'image-upload.webp',
      content_type: 'image/webp',
      file_size_bytes: 456,
    });
    expect(uploadBlobToSignedUrlMock).toHaveBeenCalledWith({
      uploadUrl: 'https://storage.example.com/upload',
      blob: expect.any(Blob),
      contentType: 'image/webp',
    });
    expect(confirmImageUploadMock).toHaveBeenCalledWith({
      pending_upload_client_id: 'pending_1',
      entity_type: 'item',
      entity_client_id: 'item_1',
    });
  });
});
