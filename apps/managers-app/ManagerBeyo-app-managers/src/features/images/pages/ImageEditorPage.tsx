import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

import { useSurface } from '@/hooks/use-surface';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useCreateImageAnnotation } from '../actions/use-create-image-annotation';
import { useImageQuery } from '../api/use-image';
import { ImageAnnotationCanvas } from '../components/ImageAnnotationCanvas';
import { ImageAnnotationToolbar } from '../components/ImageAnnotationToolbar';
import type { ImageEditorSurfaceProps } from '../controllers/use-entity-images.controller';
import {
  buildImageAnnotationPayload,
  readImageAnnotationItems,
  toImageAnnotationViewModel,
  type Image,
  type ImageAnnotationItemData,
  type TextAnnotationData,
} from '../types';

const DEFAULT_TEXT_SIZE = 0.04;

type CanvasBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type Point = {
  x: number;
  y: number;
};

function buildCanvasBox(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): CanvasBox {
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    width,
    height,
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
  };
}

function mergeSurfaceImage(
  baseImage: ImageEditorSurfaceProps['image'] | undefined,
  freshImage: Image | undefined,
) {
  if (!baseImage) {
    return null;
  }

  if (!freshImage) {
    return baseImage;
  }

  return {
    ...baseImage,
    annotation: freshImage.image_annotation
      ? toImageAnnotationViewModel(freshImage.image_annotation)
      : null,
    createdAt: freshImage.created_at,
    fileSizeBytes: freshImage.file_size_bytes ?? null,
    heightPx: freshImage.height_px ?? null,
    imageUrl: freshImage.image_url,
    widthPx: freshImage.width_px ?? null,
  };
}

export function ImageEditorPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { image } = useSurfaceProps<ImageEditorSurfaceProps>();
  const { data: freshImage } = useImageQuery(image?.clientId);
  const { createAnnotationAsync, isPending } = useCreateImageAnnotation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTool, setActiveTool] = useState<'draw' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'highlight'>('draw');
  const [sessionItems, setSessionItems] = useState<ImageAnnotationItemData[]>([]);
  const [canvasBox, setCanvasBox] = useState<CanvasBox | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ height: number; width: number } | null>(
    image?.widthPx && image.heightPx
      ? { width: image.widthPx, height: image.heightPx }
      : null,
  );
  const [textAnchor, setTextAnchor] = useState<Point | null>(null);
  const [textValue, setTextValue] = useState('');

  const currentImage = mergeSurfaceImage(image, freshImage);
  const existingItems = readImageAnnotationItems(currentImage?.annotation?.data ?? null);
  const allItems = [...existingItems, ...sessionItems];
  const displayUrl = currentImage?.localObjectUrl ?? currentImage?.imageUrl ?? '';
  const isAnnotationUnavailable = !currentImage || currentImage.uploadState !== 'completed';

  useEffect(() => {
    header?.setTitle('');
    header?.setActions(null);
  }, [header]);

  const updateCanvasBox = useCallback(() => {
    const container = containerRef.current;

    if (!container || !naturalSize) {
      return;
    }

    setCanvasBox(
      buildCanvasBox(
        container.clientWidth,
        container.clientHeight,
        naturalSize.width,
        naturalSize.height,
      ),
    );
  }, [naturalSize]);

  useEffect(() => {
    updateCanvasBox();
  }, [updateCanvasBox]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateCanvasBox();
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [updateCanvasBox]);

  useEffect(() => {
    if (textAnchor) {
      textInputRef.current?.focus();
    }
  }, [textAnchor]);

  const closeEditor = useCallback(() => {
    surface.closeTop();
  }, [surface]);

  const commitText = useCallback(
    (value: string) => {
      if (!textAnchor) {
        return;
      }

      const trimmedValue = value.trim();

      if (trimmedValue) {
        const item: TextAnnotationData = {
          tool: 'text',
          x: textAnchor.x,
          y: textAnchor.y,
          text: trimmedValue,
          fontSize: DEFAULT_TEXT_SIZE,
          color: '#ffffff',
        };

        setSessionItems((current) => [...current, item]);
      }

      setTextAnchor(null);
      setTextValue('');
    },
    [textAnchor],
  );

  const handleSave = useCallback(async () => {
    if (!currentImage) {
      closeEditor();
      return;
    }

    const payload = buildImageAnnotationPayload(allItems);

    if (!payload || sessionItems.length === 0) {
      closeEditor();
      return;
    }

    await createAnnotationAsync({
      image_client_id: currentImage.clientId,
      annotation_type: payload.annotationType,
      data: payload.data,
    });

    closeEditor();
  }, [allItems, closeEditor, createAnnotationAsync, currentImage, sessionItems.length]);

  if (!currentImage) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-white" data-testid="image-editor-page">
        <button
          className="inline-flex h-11 items-center rounded-2xl border border-white/15 px-4 text-sm"
          data-testid="image-editor-close-missing"
          type="button"
          onClick={closeEditor}
        >
          Close
        </button>
      </div>
    );
  }

  if (isAnnotationUnavailable) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white"
        data-testid="image-editor-uploading-state"
      >
        <p className="text-sm text-white/75">Upload in progress — annotation unavailable.</p>
        <button
          className="inline-flex h-11 items-center rounded-2xl border border-white/15 px-4 text-sm"
          data-testid="image-editor-unavailable-close"
          type="button"
          onClick={closeEditor}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-full flex-col bg-black text-white" data-testid="image-editor-page">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <button
          aria-label="Cancel annotation editing"
          className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white transition-colors duration-150 hover:bg-white/14"
          data-testid="image-editor-cancel-button"
          type="button"
          onClick={closeEditor}
        >
          <X className="size-4" />
        </button>

        <ImageAnnotationToolbar activeTool={activeTool} onToolChange={setActiveTool} />

        <button
          aria-label="Save annotations"
          className="inline-flex size-11 items-center justify-center rounded-2xl bg-white text-black transition-opacity duration-150 disabled:opacity-40"
          data-testid="image-editor-save-button"
          disabled={isPending || sessionItems.length === 0}
          type="button"
          onClick={() => void handleSave()}
        >
          <Check className="size-4" />
        </button>
      </div>

      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden" data-testid="image-editor-stage-container">
        <img
          alt=""
          className="h-full w-full select-none object-contain"
          draggable={false}
          src={displayUrl}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;

            if (naturalWidth > 0 && naturalHeight > 0) {
              setNaturalSize({ width: naturalWidth, height: naturalHeight });
            }
          }}
        />

        {canvasBox ? (
          <div
            className="absolute"
            style={{
              left: canvasBox.left,
              top: canvasBox.top,
              width: canvasBox.width,
              height: canvasBox.height,
            }}
          >
            <ImageAnnotationCanvas
              activeTool={activeTool}
              annotations={allItems}
              height={canvasBox.height}
              onAnnotationComplete={(item) => setSessionItems((current) => [...current, item])}
              onTextPlacementRequest={(point) => {
                setTextAnchor(point);
                setTextValue('');
              }}
              width={canvasBox.width}
            />

            {textAnchor ? (
              <input
                ref={textInputRef}
                className="absolute min-w-32 rounded-md border border-white/20 bg-black/85 px-2 py-1 text-sm text-white outline-none"
                data-testid="annotation-text-input"
                style={{
                  left: `${textAnchor.x * canvasBox.width}px`,
                  top: `${textAnchor.y * canvasBox.height}px`,
                }}
                type="text"
                value={textValue}
                onBlur={() => commitText(textValue)}
                onChange={(event) => setTextValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitText(textValue);
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setTextAnchor(null);
                    setTextValue('');
                  }
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
