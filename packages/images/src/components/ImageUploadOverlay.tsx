import { AlertCircle, Loader2 } from 'lucide-react';

import type { ImageUploadState } from '../types';

const UPLOADING_STATES: ImageUploadState[] = [
  'captured',
  'compressing',
  'requesting_upload_url',
  'uploading',
  'confirming',
];

type ImageUploadOverlayProps = {
  uploadState: ImageUploadState;
};

export function ImageUploadOverlay({
  uploadState,
}: ImageUploadOverlayProps): React.JSX.Element | null {
  const isUploading = UPLOADING_STATES.includes(uploadState);
  const isFailed = uploadState === 'failed';

  if (!isUploading && !isFailed) {
    return null;
  }

  return (
    <div
      className={[
        'absolute inset-0 flex items-center justify-center rounded-xl',
        isUploading ? 'bg-black/45' : '',
        isFailed ? 'bg-destructive/70' : '',
      ].join(' ')}
      data-testid="image-upload-overlay"
    >
      {isUploading ? (
        <Loader2
          className="size-5 animate-spin text-white"
          aria-hidden="true"
          data-testid="image-upload-spinner"
        />
      ) : (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-1 text-xs font-medium text-white"
          data-testid="image-upload-error-badge"
          role="status"
        >
          <AlertCircle className="size-3" aria-hidden="true" />
          Failed
        </span>
      )}
    </div>
  );
}
