import { useEffect } from "react";
import { RefreshCcw, X } from "lucide-react";

import { useCaseConversationContext } from "../../providers/CaseConversationProvider";
import { useEntityImagesContext } from "@/features/images/providers/EntityImagesProvider";
import { ImageAddPictureButton } from "@/features/images/components/ImageAddPictureButton";
import { ImageAnnotationSvgLayer } from "@/features/images/components/ImageAnnotationSvgLayer";
import { ImageUploadOverlay } from "@/features/images/components/ImageUploadOverlay";
import type { ImageViewModel } from "@/features/images/types";

type CaseComposerAttachmentStripProps = {
  hidden?: boolean;
  showAddTrigger?: boolean;
};

function AttachmentTile({
  image,
  onDelete,
  onRetry,
  onView,
}: {
  image: ImageViewModel;
  onDelete: (imageClientId: string) => void;
  onRetry: (imageClientId: string) => void;
  onView: (imageClientId: string) => void;
}): React.JSX.Element {
  const displayUrl = image.localObjectUrl ?? image.imageUrl;
  const isViewable = image.uploadState === "completed";
  const isRetryable = image.uploadState === "failed";

  return (
    <div className="w-24 shrink-0">
      <div className="relative overflow-hidden rounded-2xl bg-muted">
        <button
          aria-label={isViewable ? "View attachment" : "Attachment preview"}
          className="aspect-square w-full"
          data-testid={`case-composer-attachment-tile-${image.clientId}`}
          disabled={!isViewable}
          onClick={() => {
            if (isViewable) {
              onView(image.clientId);
            }
          }}
          type="button"
        >
          <img
            alt=""
            className="size-full object-cover"
            draggable={false}
            loading="lazy"
            src={displayUrl}
          />
        </button>

        <ImageAnnotationSvgLayer
          annotations={image.annotations}
          coverMode
          heightPx={image.heightPx}
          testId={`case-composer-attachment-annotation-${image.clientId}`}
          widthPx={image.widthPx}
        />
        <ImageUploadOverlay uploadState={image.uploadState} />

        <button
          aria-label="Remove attachment"
          className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-black/65 text-white transition-colors duration-150 hover:bg-black/80"
          onClick={() => {
            onDelete(image.clientId);
          }}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>

        {isRetryable ? (
          <button
            className="absolute inset-x-2 bottom-2 inline-flex items-center justify-center gap-1 rounded-full border border-white/25 bg-black/70 px-2 py-1 text-[11px] font-semibold text-white transition-colors duration-150 hover:bg-black/80"
            data-testid={`case-composer-attachment-retry-${image.clientId}`}
            onClick={() => {
              onRetry(image.clientId);
            }}
            type="button"
          >
            <RefreshCcw aria-hidden="true" className="size-3" />
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CaseComposerAttachmentStripInner({
  hidden = false,
  showAddTrigger = true,
}: {
  hidden?: boolean;
  showAddTrigger?: boolean;
}): React.JSX.Element | null {
  const controller = useCaseConversationContext();
  const {
    deleteImage,
    hasFailedUploads,
    images,
    isUploading,
    openViewer,
    retryImageUpload,
  } = useEntityImagesContext();

  useEffect(() => {
    controller.setDraftAttachmentsState({
      count: images.length,
      hasFailures: hasFailedUploads,
      isUploading,
    });
  }, [controller, hasFailedUploads, images.length, isUploading]);

  const shouldRender = !hidden && (showAddTrigger || images.length > 0);

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="mb-3" data-testid="case-composer-attachment-strip">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {showAddTrigger ? (
          <div className="w-24 shrink-0">
            <ImageAddPictureButton testId="case-composer-add-picture-button" />
          </div>
        ) : null}

        {images.map((image) => (
          <AttachmentTile
            key={image.clientId}
            image={image}
            onDelete={deleteImage}
            onRetry={retryImageUpload}
            onView={openViewer}
          />
        ))}
      </div>
    </div>
  );
}

export function CaseComposerAttachmentStrip({
  hidden = false,
  showAddTrigger = true,
}: CaseComposerAttachmentStripProps): React.JSX.Element | null {
  return (
    <CaseComposerAttachmentStripInner
      hidden={hidden}
      showAddTrigger={showAddTrigger}
    />
  );
}
