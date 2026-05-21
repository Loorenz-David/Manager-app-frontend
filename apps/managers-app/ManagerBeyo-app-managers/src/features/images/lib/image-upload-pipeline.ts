import { confirmImageUpload } from '../api/confirm-image-upload';
import { requestImageUploadUrl } from '../api/request-image-upload-url';
import { uploadBlobToSignedUrl } from '../api/upload-blob-to-signed-url';
import type { Image, ImageLinkEntityType } from '../types';
import {
  compressImageForUpload,
  DEFAULT_IMAGE_COMPRESSION_OPTIONS,
  type ImageCompressionOptions,
} from './compress-image-for-upload';

export type UploadPipelineProgressState =
  | 'compressing'
  | 'requesting_upload_url'
  | 'uploading'
  | 'confirming'
  | 'completed';

export type ImageUploadPipelineInput = {
  rawBlob: Blob;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  compressionOptions?: ImageCompressionOptions;
  onProgress?: (state: UploadPipelineProgressState) => void;
};

export async function runImageUploadPipeline(input: ImageUploadPipelineInput): Promise<Image> {
  const compressionOptions =
    input.compressionOptions ?? DEFAULT_IMAGE_COMPRESSION_OPTIONS;

  input.onProgress?.('compressing');
  const compressedImage = await compressImageForUpload(input.rawBlob, compressionOptions);

  input.onProgress?.('requesting_upload_url');
  const uploadData = await requestImageUploadUrl({
    entity_type: input.entityType,
    entity_client_id: input.entityClientId,
    file_name: compressedImage.fileName,
    content_type: compressedImage.contentType,
    file_size_bytes: compressedImage.fileSizeBytes,
  });

  input.onProgress?.('uploading');
  await uploadBlobToSignedUrl({
    uploadUrl: uploadData.upload_url,
    blob: compressedImage.blob,
    contentType: compressedImage.contentType,
  });

  input.onProgress?.('confirming');
  const image = await confirmImageUpload({
    pending_upload_client_id: uploadData.pending_upload_client_id,
    entity_type: input.entityType,
    entity_client_id: input.entityClientId,
  });

  input.onProgress?.('completed');
  return image;
}
