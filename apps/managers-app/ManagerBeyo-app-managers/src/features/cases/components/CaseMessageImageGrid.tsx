import { useCallback, useEffect, useMemo, useState } from "react";

import { useSurface } from "@/hooks/use-surface";
import { useImageQuery } from "@/features/images/api/use-image";
import { ImageAnnotationSvgLayer } from "@/features/images/components/ImageAnnotationSvgLayer";
import {
  IMAGE_VIEWER_SURFACE_ID,
  preloadImageViewerSurface,
} from "@/features/images/surfaces";
import {
  toImageAnnotationViewModels,
  toImageAnnotationViewModel,
  type ImageViewModel,
} from "@/features/images/types";

import type { CaseConversationMessageRaw } from "../types";

type CaseMessageImageGridProps = {
  message: CaseConversationMessageRaw;
};

type MessageImageSnapshot = NonNullable<CaseConversationMessageRaw["images"]>[number];
type NaturalSize = { width: number; height: number };

function toMessageImages(message: CaseConversationMessageRaw): ImageViewModel[] {
  return (message.images ?? []).map((image, index) => ({
    annotation: image.image_annotation
      ? toImageAnnotationViewModel(image.image_annotation)
      : null,
    clientId: image.client_id,
    linkClientId: null,
    entityType: "case_conversation_message",
    entityClientId: message.client_id,
    imageUrl: image.image_url,
    localObjectUrl: null,
    displayOrder: index,
    widthPx: image.width_px ?? null,
    heightPx: image.height_px ?? null,
    fileSizeBytes: image.file_size_bytes ?? null,
    createdAt: image.created_at,
    uploadState: "completed",
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotations: toImageAnnotationViewModels(
      image.image_annotation,
      image.image_annotations,
    ),
  }));
}

function shouldHydrateMessageImage(image: MessageImageSnapshot): boolean {
  const hasSnapshotAnnotations =
    image.image_annotation !== null && image.image_annotation !== undefined
      ? true
      : (image.image_annotations?.length ?? 0) > 0;

  return !hasSnapshotAnnotations || image.width_px == null || image.height_px == null;
}

function useRenderableMessageImage(
  image: MessageImageSnapshot,
): Pick<ImageViewModel, "annotations" | "heightPx" | "imageUrl" | "widthPx"> {
  const shouldHydrate = shouldHydrateMessageImage(image);
  const { data: freshImage } = useImageQuery(shouldHydrate ? image.client_id : null);

  return useMemo(() => {
    const annotation = freshImage?.image_annotation ?? image.image_annotation ?? null;
    const annotations = freshImage?.image_annotations ?? image.image_annotations ?? [];

    return {
      imageUrl: freshImage?.image_url ?? image.image_url,
      widthPx: freshImage?.width_px ?? image.width_px ?? null,
      heightPx: freshImage?.height_px ?? image.height_px ?? null,
      annotations: toImageAnnotationViewModels(annotation, annotations),
    };
  }, [freshImage, image]);
}

type CaseMessageImageTileProps = {
  image: MessageImageSnapshot;
  messageClientId: string;
  imagesCount: number;
  onOpen: (imageClientId: string) => void;
};

function CaseMessageImageTile({
  image,
  messageClientId,
  imagesCount,
  onOpen,
}: CaseMessageImageTileProps): React.JSX.Element {
  const renderableImage = useRenderableMessageImage(image);
  const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(
    renderableImage.widthPx && renderableImage.heightPx
      ? {
          width: renderableImage.widthPx,
          height: renderableImage.heightPx,
        }
      : null,
  );

  useEffect(() => {
    if (!renderableImage.widthPx || !renderableImage.heightPx) {
      return;
    }

    setNaturalSize({
      width: renderableImage.widthPx,
      height: renderableImage.heightPx,
    });
  }, [renderableImage.heightPx, renderableImage.widthPx]);

  return (
    <button
      aria-label="Open message image"
      className={[
        "overflow-hidden rounded-[1.1rem] bg-black/5",
        imagesCount === 1 ? "col-span-2" : "",
      ].join(" ")}
      data-testid={`case-message-image-${messageClientId}-${image.client_id}`}
      onClick={() => {
        onOpen(image.client_id);
      }}
      onFocus={() => {
        void preloadImageViewerSurface();
      }}
      onPointerEnter={() => {
        void preloadImageViewerSurface();
      }}
      onTouchStart={() => {
        void preloadImageViewerSurface();
      }}
      type="button"
    >
      <div className="relative">
        <img
          alt=""
          className={[
            "w-full object-cover",
            imagesCount === 1 ? "aspect-[4/5]" : "aspect-square",
          ].join(" ")}
          decoding="async"
          draggable={false}
          loading="lazy"
          onLoad={(event) => {
            const { naturalHeight, naturalWidth } = event.currentTarget;

            if (naturalWidth <= 0 || naturalHeight <= 0) {
              return;
            }

            setNaturalSize({
              width: naturalWidth,
              height: naturalHeight,
            });
          }}
          src={renderableImage.imageUrl}
        />
        <ImageAnnotationSvgLayer
          annotations={renderableImage.annotations}
          coverMode
          heightPx={naturalSize?.height ?? renderableImage.heightPx}
          markerId={`case-msg-ann-${messageClientId}-${image.client_id}`}
          testId={`case-message-image-annotation-${messageClientId}-${image.client_id}`}
          widthPx={naturalSize?.width ?? renderableImage.widthPx}
        />
      </div>
    </button>
  );
}

export function CaseMessageImageGrid({
  message,
}: CaseMessageImageGridProps): React.JSX.Element | null {
  const surface = useSurface();
  const images = useMemo(() => toMessageImages(message), [message]);

  const openViewer = useCallback(
    (initialImageClientId: string) => {
      surface.open(IMAGE_VIEWER_SURFACE_ID, {
        images,
        initialImageClientId,
        entityType: "case_conversation_message",
        entityClientId: message.client_id,
        mode: "preview-only",
        enableOnDemandImageLoad: false,
      });
    },
    [images, message.client_id, surface],
  );

  if (images.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-3 grid grid-cols-2 gap-2"
      data-testid={`case-message-image-grid-${message.client_id}`}
    >
      {(message.images ?? []).map((image) => (
        <CaseMessageImageTile
          key={image.client_id}
          image={image}
          imagesCount={images.length}
          messageClientId={message.client_id}
          onOpen={openViewer}
        />
      ))}
    </div>
  );
}
