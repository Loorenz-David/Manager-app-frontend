import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn, isSameImagePath } from "@beyo/lib";
import { useSurface } from "@beyo/hooks";
import { useImageQuery } from "@beyo/images";
import { useDeleteImage } from "@beyo/images";
import { ImageAnnotationSvgLayer } from "@beyo/images";
import {
  IMAGE_VIEWER_SURFACE_ID,
  preloadImageViewerSurface,
} from "@beyo/images";
import {
  toImageAnnotationViewModels,
  toImageAnnotationViewModel,
  type ImageViewModel,
} from "@beyo/images";

import type { CaseConversationMessageRaw } from "../types";
import { useCaseConversationMessagesContext } from "../providers/CaseConversationProvider";

// Maximum images shown in the collage grid; any beyond this show a "+N" badge
// on the last visible cell. Tapping opens the viewer at that cell so the user
// can swipe through the remaining images.
const MAX_COLLAGE_IMAGES = 4;

type CaseMessageImageGridProps = {
  message: CaseConversationMessageRaw;
};

type MessageImageSnapshot = NonNullable<
  CaseConversationMessageRaw["images"]
>[number];
type NaturalSize = { width: number; height: number };

function toMessageImages(
  message: CaseConversationMessageRaw,
): ImageViewModel[] {
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

  return (
    hasSnapshotAnnotations &&
    (image.width_px == null || image.height_px == null)
  );
}

function useRenderableMessageImage(
  image: MessageImageSnapshot,
): Pick<ImageViewModel, "annotations" | "heightPx" | "imageUrl" | "widthPx"> {
  const shouldHydrate = shouldHydrateMessageImage(image);
  const { data: freshImage } = useImageQuery(
    shouldHydrate ? image.client_id : null,
  );

  return useMemo(() => {
    const annotation =
      freshImage?.image_annotation ?? image.image_annotation ?? null;
    const annotations =
      freshImage?.image_annotations ?? image.image_annotations ?? [];

    return {
      imageUrl: freshImage?.image_url ?? image.image_url,
      widthPx: freshImage?.width_px ?? image.width_px ?? null,
      heightPx: freshImage?.height_px ?? image.height_px ?? null,
      annotations: toImageAnnotationViewModels(annotation, annotations),
    };
  }, [freshImage, image]);
}

// ---------------------------------------------------------------------------
// Collage layout
//
// All configurations share the same outer aspect-4/5 container so the message
// bubble height is always stable regardless of image count — the same principle
// Instagram and Telegram use to prevent virtual-list scroll corrections.
//
// 1 image  → full container
// 2 images → stacked vertically (2 rows, 1 column)
// 3 images → left column full height (3fr), right column two rows (2fr)
// 4+       → 2×2 grid; images beyond 4 fold into a "+N" badge on the last cell
// ---------------------------------------------------------------------------
type CollageCell = { rowSpan?: 2 };
type CollageLayout = { gridClass: string; cells: CollageCell[] };

function getCollageLayout(imageCount: number): CollageLayout {
  switch (Math.min(imageCount, MAX_COLLAGE_IMAGES)) {
    case 1:
      return { gridClass: "grid-cols-1 grid-rows-1", cells: [{}] };
    case 2:
      return { gridClass: "grid-cols-1 grid-rows-2", cells: [{}, {}] };
    case 3:
      return {
        gridClass: "grid-cols-[3fr_2fr] grid-rows-2",
        cells: [{ rowSpan: 2 }, {}, {}],
      };
    default:
      return { gridClass: "grid-cols-2 grid-rows-2", cells: [{}, {}, {}, {}] };
  }
}

function canReuseImageSnapshot(
  cached: MessageImageSnapshot,
  next: MessageImageSnapshot,
): boolean {
  return (
    cached.client_id === next.client_id &&
    isSameImagePath(cached.image_url, next.image_url) &&
    cached.width_px === next.width_px &&
    cached.height_px === next.height_px &&
    Boolean(cached.image_annotation) === Boolean(next.image_annotation) &&
    (cached.image_annotations?.length ?? 0) ===
      (next.image_annotations?.length ?? 0)
  );
}

type CaseMessageImageTileProps = {
  image: MessageImageSnapshot;
  messageClientId: string;
  rowSpan?: 2;
  extraBadge?: number;
  onOpen: (imageClientId: string) => void;
};

const CaseMessageImageTile = memo(function CaseMessageImageTile({
  image,
  messageClientId,
  rowSpan,
  extraBadge,
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

    if (renderableImage.annotations.length === 0) {
      return;
    }

    setNaturalSize((prev) => {
      if (
        prev?.width === renderableImage.widthPx &&
        prev?.height === renderableImage.heightPx
      ) {
        return prev;
      }
      return {
        width: renderableImage.widthPx!,
        height: renderableImage.heightPx!,
      };
    });
  }, [renderableImage.heightPx, renderableImage.widthPx]);

  return (
    <button
      aria-label="Open message image"
      className={cn("relative overflow-hidden", rowSpan === 2 && "row-span-2")}
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
      {/* img is absolutely positioned — it cannot influence Virtuoso's
          ResizeObserver measurements. The collage outer div owns the height. */}
      <img
        alt=""
        className="absolute inset-0 size-full object-cover"
        decoding="async"
        draggable={false}
        loading="eager"
        onLoad={(event) => {
          const { naturalHeight, naturalWidth } = event.currentTarget;

          if (naturalWidth <= 0 || naturalHeight <= 0) {
            return;
          }

          if (renderableImage.annotations.length === 0) {
            return;
          }

          setNaturalSize((prev) => {
            if (
              prev?.width === naturalWidth &&
              prev?.height === naturalHeight
            ) {
              return prev;
            }
            return { width: naturalWidth, height: naturalHeight };
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
      {extraBadge !== undefined && extraBadge > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="text-2xl font-bold text-white">+{extraBadge}</span>
        </div>
      )}
    </button>
  );
});

export function CaseMessageImageGrid({
  message,
}: CaseMessageImageGridProps): React.JSX.Element | null {
  const surface = useSurface();
  const messagesController = useCaseConversationMessagesContext();
  const { deleteImageWithOptionsAsync } = useDeleteImage();
  const images = useMemo(() => toMessageImages(message), [message]);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const stableVisibleImagesRef = useRef<Map<string, MessageImageSnapshot>>(
    new Map(),
  );
  const handleDelete = useCallback(
    (imageClientId: string) => {
      void deleteImageWithOptionsAsync({
        imageClientId,
        hardDelete: true,
      }).then(() => messagesController.retry());
    },
    [deleteImageWithOptionsAsync, messagesController],
  );

  const openViewer = useCallback(
    (initialImageClientId: string) => {
      surface.open(IMAGE_VIEWER_SURFACE_ID, {
        images: imagesRef.current,
        initialImageClientId,
        entityType: "case_conversation_message",
        entityClientId: message.client_id,
        mode: "preview-edit",
        onDelete: handleDelete,
        enableOnDemandImageLoad: false,
      });
    },
    [handleDelete, message.client_id, surface],
  );

  const rawImages = message.images ?? [];

  if (rawImages.length === 0) {
    return null;
  }

  const layout = getCollageLayout(rawImages.length);
  const visibleImages = useMemo(() => {
    const nextStableImages = rawImages
      .slice(0, MAX_COLLAGE_IMAGES)
      .map((image) => {
        const cached = stableVisibleImagesRef.current.get(image.client_id);

        return cached && canReuseImageSnapshot(cached, image) ? cached : image;
      });

    stableVisibleImagesRef.current = new Map(
      nextStableImages.map((image) => [image.client_id, image]),
    );

    return nextStableImages;
  }, [rawImages]);
  const extraCount = Math.max(0, rawImages.length - MAX_COLLAGE_IMAGES);

  return (
    <div
      className="mt-3 h-75 w-60 max-w-full overflow-hidden rounded-[1.1rem]"
      data-testid={`case-message-image-grid-${message.client_id}`}
    >
      <div className={cn("grid size-full gap-px", layout.gridClass)}>
        {visibleImages.map((image, index) => {
          const cell = layout.cells[index]!;
          const isLastVisible = index === visibleImages.length - 1;
          const badge =
            isLastVisible && extraCount > 0 ? extraCount : undefined;

          return (
            <CaseMessageImageTile
              key={image.client_id}
              extraBadge={badge}
              image={image}
              messageClientId={message.client_id}
              rowSpan={cell.rowSpan}
              onOpen={openViewer}
            />
          );
        })}
      </div>
    </div>
  );
}
