import { useCallback, useState } from 'react';
import { Download, Eye, EyeOff, Trash2 } from 'lucide-react';

import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { fetchImageDownloadUrl } from '../api/fetch-image-download-url';
import type { ImageMetadataSurfaceProps } from '../controllers/use-entity-images.controller';
import type { ImageUploadState } from '../types';

const UPLOAD_STATE_LABELS: Record<ImageUploadState, string | null> = {
  idle: null,
  captured: 'Processing',
  compressing: 'Compressing',
  requesting_upload_url: 'Preparing upload',
  uploading: 'Uploading',
  confirming: 'Finalizing upload',
  completed: null,
  failed: 'Upload failed',
  delete_requested: 'Delete requested',
  deleting: 'Deleting',
};

function formatFileSize(fileSizeBytes: number | null): string | null {
  if (fileSizeBytes === null) {
    return null;
  }

  if (fileSizeBytes < 1024) {
    return new Intl.NumberFormat(undefined).format(fileSizeBytes) + ' B';
  }

  if (fileSizeBytes < 1024 * 1024) {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(fileSizeBytes / 1024) + ' KB';
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(fileSizeBytes / (1024 * 1024)) + ' MB';
}

function formatDate(createdAt: string | null): string | null {
  if (!createdAt) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(createdAt));
}

export function ImageMetadataActionsSheetPage(): React.JSX.Element {
  const {
    image,
    mode = 'preview-only',
    onDelete,
    annotationsVisible,
    onToggleAnnotations,
  } = useSurfaceProps<ImageMetadataSurfaceProps>();
  const header = useSurfaceHeader();

  const displayUrl = image?.localObjectUrl ?? image?.imageUrl ?? null;
  const uploadStateLabel = image ? UPLOAD_STATE_LABELS[image.uploadState] : null;
  const fileSize = image ? formatFileSize(image.fileSizeBytes) : null;
  const createdDate = image ? formatDate(image.createdAt) : null;
  const dimensions =
    image?.widthPx != null && image.heightPx != null
      ? `${image.widthPx}×${image.heightPx} px`
      : null;

  const [isDownloading, setIsDownloading] = useState(false);
  const [localAnnotationsVisible, setLocalAnnotationsVisible] = useState(annotationsVisible ?? true);

  const handleDownload = useCallback(async () => {
    if (!image) return;
    setIsDownloading(true);
    try {
      const { downloadUrl } = await fetchImageDownloadUrl(image.clientId);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `image_${image.clientId}`;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  }, [image]);

  const handleDelete = useCallback(() => {
    if (!image) {
      return;
    }

    onDelete?.(image.clientId);
    header?.requestClose();
  }, [image, onDelete, header]);

  const handleToggleAnnotations = useCallback(() => {
    setLocalAnnotationsVisible((previous) => !previous);
    onToggleAnnotations?.();
  }, [onToggleAnnotations]);

  return (
    <div className="flex flex-col" data-testid="image-metadata-sheet">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        {displayUrl ? (
          <img
            alt="Image preview"
            className="size-14 shrink-0 rounded-2xl object-cover"
            data-testid="metadata-sheet-thumbnail"
            src={displayUrl}
          />
        ) : (
          <div
            className="size-14 shrink-0 rounded-2xl bg-muted"
            data-testid="metadata-sheet-thumbnail-placeholder"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground" data-testid="metadata-sheet-title">
            Image details
          </p>
          {uploadStateLabel ? (
            <p
              className="mt-1 text-sm text-muted-foreground"
              data-testid="metadata-sheet-upload-state"
            >
              {uploadStateLabel}
            </p>
          ) : null}
          {createdDate ? (
            <p
              className="mt-1 truncate text-sm text-muted-foreground"
              data-testid="metadata-sheet-created-at"
            >
              {createdDate}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col px-4" data-testid="metadata-sheet-fields">
        {fileSize ? (
          <div
            className="flex items-center justify-between border-b border-border py-3"
            data-testid="metadata-sheet-file-size"
          >
            <span className="text-sm text-muted-foreground">Size</span>
            <span className="text-sm font-medium text-foreground">{fileSize}</span>
          </div>
        ) : null}

        {dimensions ? (
          <div
            className="flex items-center justify-between border-b border-border py-3"
            data-testid="metadata-sheet-dimensions"
          >
            <span className="text-sm text-muted-foreground">Dimensions</span>
            <span className="text-sm font-medium text-foreground">{dimensions}</span>
          </div>
        ) : null}
      </div>

      <div className="px-4 py-2" data-testid="metadata-sheet-actions">
        <button
          aria-label="Download image"
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-foreground transition-colors duration-150 hover:bg-muted disabled:opacity-50"
          data-testid="metadata-sheet-download-button"
          disabled={isDownloading || !image}
          type="button"
          onClick={() => void handleDownload()}
        >
          <Download className="size-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">{isDownloading ? 'Downloading…' : 'Download image'}</span>
        </button>

        {(image?.annotations?.length ?? 0) > 0 ? (
          <button
            aria-label={localAnnotationsVisible ? 'Hide annotations' : 'Show annotations'}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-foreground transition-colors duration-150 hover:bg-muted"
            data-testid="metadata-sheet-toggle-annotations-button"
            type="button"
            onClick={handleToggleAnnotations}
          >
            {localAnnotationsVisible ? (
              <EyeOff className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <Eye className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span className="text-sm font-medium">
              {localAnnotationsVisible ? 'Hide annotations' : 'Show annotations'}
            </span>
          </button>
        ) : null}

        {mode === 'preview-edit' && image && onDelete ? (
          <button
            aria-label="Delete image"
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-destructive transition-colors duration-150 hover:bg-destructive/10"
            data-testid="metadata-sheet-delete-button"
            type="button"
            onClick={handleDelete}
          >
            <Trash2 className="size-4 shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">Delete image</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
