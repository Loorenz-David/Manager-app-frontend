import { useCallback, useEffect, useRef, useState } from "react";

import { useSurface } from "@/hooks/use-surface";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { useSurfaceStore } from "@/providers/SurfaceProvider";
import { useCreateImageAnnotation } from "../actions/use-create-image-annotation";
import { useDeleteImageAnnotation } from "../actions/use-delete-image-annotation";
import { useUpdateImageAnnotation } from "../actions/use-update-image-annotation";
import { useImageQuery } from "../api/use-image";
import {
  ImageAnnotationCanvas,
  type ImageAnnotationCanvasHandle,
} from "../components/ImageAnnotationCanvas";
import { ImageEditorBottomControls } from "../components/ImageEditorBottomControls";
import { ZoomableEditorStage } from "../components/ZoomableEditorStage";
import type { ImageEditorSurfaceProps } from "../controllers/use-entity-images.controller";
import {
  IMAGE_ANNOTATION_ACTIONS_SURFACE_ID,
  IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID,
  IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID,
  IMAGE_EDITOR_SURFACE_ID,
  type ImageAnnotationActionsSurfaceProps,
  type ImageAnnotationToolPickerSurfaceProps,
  type ImageEditorDiscardChangesSurfaceProps,
} from "../surfaces";
import {
  type AnnotatedCanvasItem,
  buildImageAnnotationPayload,
  readImageAnnotationSingleItem,
  toImageAnnotationViewModel,
  type Image,
  type ImageAnnotationItemData,
  type ImageAnnotationTool,
  type TextAnnotationData,
} from "../types";

const DEFAULT_TEXT_SIZE = 0.04;

type CanvasBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type TextMoveState = {
  item: AnnotatedCanvasItem & { data: TextAnnotationData };
  currentX: number;
  currentY: number;
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
  const scale = Math.min(
    containerWidth / imageWidth,
    containerHeight / imageHeight,
  );
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
  baseImage: ImageEditorSurfaceProps["image"] | undefined,
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
    annotations: (freshImage.image_annotations ?? []).map(
      toImageAnnotationViewModel,
    ),
    createdAt: freshImage.created_at,
    fileSizeBytes: freshImage.file_size_bytes ?? null,
    heightPx: freshImage.height_px ?? null,
    imageUrl: freshImage.image_url,
    widthPx: freshImage.width_px ?? null,
  };
}

function isTextCanvasItem(
  item: AnnotatedCanvasItem | null,
): item is AnnotatedCanvasItem & {
  data: TextAnnotationData;
} {
  return item?.data.tool === "text";
}

function buildTextAnnotation(
  anchor: Point,
  value: string,
  base?: Pick<TextAnnotationData, "color" | "fontSize">,
): TextAnnotationData | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return {
    tool: "text",
    x: anchor.x,
    y: anchor.y,
    text: trimmedValue,
    fontSize: base?.fontSize ?? DEFAULT_TEXT_SIZE,
    color: base?.color ?? "#ffffff",
  };
}

export function ImageEditorPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { image, isDirectCaptureSession, onSaveComplete, onCancelCapture } =
    useSurfaceProps<ImageEditorSurfaceProps>();
  const { data: freshImage } = useImageQuery(image?.clientId);
  const { createAnnotationAsync, isPending } = useCreateImageAnnotation();
  const { deleteAnnotationAsync } = useDeleteImageAnnotation();
  const { updateAnnotation } = useUpdateImageAnnotation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<ImageAnnotationCanvasHandle | null>(null);
  const canvasBoxRef = useRef<HTMLDivElement | null>(null);
  const movePointerIdRef = useRef<number | null>(null);
  const moveDragStartRef = useRef<{
    normX: number;
    normY: number;
    textStartX: number;
    textStartY: number;
  } | null>(null);
  const handleSaveAndCloseRef = useRef<() => Promise<void>>(async () => {});
  const handleDeleteAnnotationRef = useRef<
    ((item: AnnotatedCanvasItem) => void) | null
  >(null);
  const previousToolBeforeEditRef = useRef<ImageAnnotationTool | null>(null);
  const [activeTool, setActiveTool] = useState<ImageAnnotationTool>("draw");
  const [sessionItems, setSessionItems] = useState<ImageAnnotationItemData[]>(
    [],
  );
  const [canvasBox, setCanvasBox] = useState<CanvasBox | null>(null);
  const [naturalSize, setNaturalSize] = useState<{
    height: number;
    width: number;
  } | null>(
    image?.widthPx && image.heightPx
      ? { width: image.widthPx, height: image.heightPx }
      : null,
  );
  const [textAnchor, setTextAnchor] = useState<Point | null>(null);
  const [textValue, setTextValue] = useState("");
  const [activeTextTarget, setActiveTextTarget] =
    useState<AnnotatedCanvasItem | null>(null);
  const [textMoveState, setTextMoveState] = useState<TextMoveState | null>(
    null,
  );
  const [isCancelingCapture, setIsCancelingCapture] = useState(false);
  const textMoveStateRef = useRef<TextMoveState | null>(null);
  textMoveStateRef.current = textMoveState;

  const currentImage = mergeSurfaceImage(image, freshImage);
  const persistedCanvasItems: AnnotatedCanvasItem[] = (
    currentImage?.annotations ?? []
  ).flatMap((annotation) => {
    const item = readImageAnnotationSingleItem(annotation);

    return item
      ? [
          {
            data: item,
            annotationClientId: annotation.clientId,
            source: "persisted" as const,
          },
        ]
      : [];
  });
  const sessionCanvasItems: AnnotatedCanvasItem[] = sessionItems.map(
    (item) => ({
      data: item,
      annotationClientId: null,
      source: "session" as const,
    }),
  );
  const allCanvasItems: AnnotatedCanvasItem[] = [
    ...persistedCanvasItems,
    ...sessionCanvasItems,
  ];
  const editingOrMovingItem = activeTextTarget ?? textMoveState?.item ?? null;
  const visibleCanvasItems = editingOrMovingItem
    ? allCanvasItems.filter((item) => {
        if (
          editingOrMovingItem.source === "persisted" &&
          editingOrMovingItem.annotationClientId
        ) {
          return (
            item.annotationClientId !== editingOrMovingItem.annotationClientId
          );
        }

        return item !== editingOrMovingItem;
      })
    : allCanvasItems;
  const displayUrl =
    currentImage?.localObjectUrl ?? currentImage?.imageUrl ?? "";
  const hasUnsavedChanges =
    sessionItems.length > 0 || (textAnchor !== null && textValue.trim() !== "");
  const isAnnotationUnavailable =
    !currentImage || currentImage.uploadState !== "completed";

  useEffect(() => {
    header?.setTitle("");
    header?.setActions(null);
    header?.setHeaderHidden(true);
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

  useEffect(() => {
    return () => {
      movePointerIdRef.current = null;
      moveDragStartRef.current = null;
    };
  }, []);

  const closeEditor = useCallback(() => {
    useSurfaceStore.getState().close(IMAGE_EDITOR_SURFACE_ID);
  }, []);

  const completeSaveFlow = useCallback(() => {
    if (onSaveComplete) {
      onSaveComplete();
      return;
    }

    closeEditor();
  }, [closeEditor, onSaveComplete]);

  const resetTextDraft = useCallback(() => {
    setTextAnchor(null);
    setTextValue("");
    setActiveTextTarget(null);
    if (previousToolBeforeEditRef.current !== null) {
      setActiveTool(previousToolBeforeEditRef.current);
      previousToolBeforeEditRef.current = null;
    }
  }, []);

  const cancelMove = useCallback(() => {
    canvasRef.current?.setInteractionEnabled(true);
    setTextMoveState(null);
    movePointerIdRef.current = null;
    moveDragStartRef.current = null;
  }, []);

  const applyTextItemUpdate = useCallback(
    (item: AnnotatedCanvasItem, nextItem: TextAnnotationData) => {
      if (item.source === "session") {
        setSessionItems((current) =>
          current.map((sessionItem) =>
            sessionItem === item.data ? nextItem : sessionItem,
          ),
        );
        return;
      }

      if (item.annotationClientId && currentImage) {
        updateAnnotation({
          image_client_id: currentImage.clientId,
          annotation_client_id: item.annotationClientId,
          data: nextItem,
        });
      }
    },
    [currentImage, updateAnnotation],
  );

  const commitMove = useCallback(() => {
    const state = textMoveStateRef.current;

    if (!state) {
      return;
    }

    applyTextItemUpdate(state.item, {
      ...state.item.data,
      x: state.currentX,
      y: state.currentY,
    });
    canvasRef.current?.setInteractionEnabled(true);
    setTextMoveState(null);
    movePointerIdRef.current = null;
    moveDragStartRef.current = null;
  }, [applyTextItemUpdate]);

  const commitText = useCallback(
    (value: string) => {
      if (!textAnchor) {
        return;
      }

      const item = buildTextAnnotation(
        textAnchor,
        value,
        isTextCanvasItem(activeTextTarget)
          ? {
              color: activeTextTarget.data.color,
              fontSize: activeTextTarget.data.fontSize,
            }
          : undefined,
      );

      if (item) {
        if (isTextCanvasItem(activeTextTarget)) {
          applyTextItemUpdate(activeTextTarget, item);
        } else {
          setSessionItems((current) => [...current, item]);
        }
      }

      resetTextDraft();
    },
    [activeTextTarget, applyTextItemUpdate, resetTextDraft, textAnchor],
  );

  const handleSaveAndClose = useCallback(async () => {
    if (textMoveStateRef.current) {
      commitMove();
    }

    let finalSessionItems = sessionItems;

    if (textAnchor) {
      const textItem = buildTextAnnotation(
        textAnchor,
        textValue,
        isTextCanvasItem(activeTextTarget)
          ? {
              color: activeTextTarget.data.color,
              fontSize: activeTextTarget.data.fontSize,
            }
          : undefined,
      );

      if (textItem) {
        if (isTextCanvasItem(activeTextTarget)) {
          applyTextItemUpdate(activeTextTarget, textItem);
        } else {
          finalSessionItems = [...sessionItems, textItem];
        }
      }
    }

    resetTextDraft();

    if (!currentImage) {
      useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
      completeSaveFlow();
      return;
    }

    const payload = buildImageAnnotationPayload(finalSessionItems);

    if (!payload || finalSessionItems.length === 0) {
      useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
      completeSaveFlow();
      return;
    }

    await createAnnotationAsync({
      image_client_id: currentImage.clientId,
      annotation_type: payload.annotationType,
      data: payload.data,
    });

    useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
    completeSaveFlow();
  }, [
    activeTextTarget,
    applyTextItemUpdate,
    completeSaveFlow,
    commitMove,
    createAnnotationAsync,
    currentImage,
    resetTextDraft,
    sessionItems,
    textAnchor,
    textValue,
  ]);

  handleSaveAndCloseRef.current = handleSaveAndClose;

  const handleDeleteAnnotation = useCallback(
    (item: AnnotatedCanvasItem) => {
      if (item.source === "session") {
        setSessionItems((current) =>
          current.filter((sessionItem) => sessionItem !== item.data),
        );
        return;
      }

      if (item.annotationClientId && currentImage) {
        void deleteAnnotationAsync({
          image_client_id: currentImage.clientId,
          annotation_client_id: item.annotationClientId,
        });
      }
    },
    [currentImage, deleteAnnotationAsync],
  );

  handleDeleteAnnotationRef.current = handleDeleteAnnotation;

  const handleClose = useCallback(() => {
    if (textMoveStateRef.current) {
      cancelMove();
      return;
    }

    if (isDirectCaptureSession) {
      if (!currentImage) {
        closeEditor();
        return;
      }

      setIsCancelingCapture(true);
      void Promise.resolve(onCancelCapture?.(currentImage.clientId)).finally(
        () => {
          setIsCancelingCapture(false);
          closeEditor();
        },
      );
      return;
    }

    if (!hasUnsavedChanges) {
      closeEditor();
      return;
    }

    surface.open(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID, {
      onDiscardAndClose: () => {
        useSurfaceStore
          .getState()
          .close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
        closeEditor();
      },
      onSaveAndClose: () => void handleSaveAndCloseRef.current(),
    } satisfies ImageEditorDiscardChangesSurfaceProps);
  }, [
    cancelMove,
    closeEditor,
    currentImage,
    hasUnsavedChanges,
    isDirectCaptureSession,
    onCancelCapture,
    surface,
  ]);

  const handleUndo = useCallback(() => {
    if (textAnchor !== null) {
      resetTextDraft();
      return;
    }

    setSessionItems((current) => current.slice(0, -1));
  }, [resetTextDraft, textAnchor]);

  const handleOpenToolPicker = useCallback(() => {
    surface.open(IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID, {
      activeTool,
      onSelect: setActiveTool,
    } satisfies ImageAnnotationToolPickerSurfaceProps);
  }, [activeTool, surface]);

  const handleEditText = useCallback(
    (item: AnnotatedCanvasItem) => {
      if (!isTextCanvasItem(item)) {
        return;
      }

      cancelMove();
      previousToolBeforeEditRef.current = activeTool;
      setActiveTool("text");
      setActiveTextTarget(item);
      setTextAnchor({ x: item.data.x, y: item.data.y });
      setTextValue(item.data.text);
    },
    [activeTool, cancelMove],
  );

  const handleMoveText = useCallback(
    (item: AnnotatedCanvasItem) => {
      if (!isTextCanvasItem(item)) {
        return;
      }

      resetTextDraft();
      canvasRef.current?.setInteractionEnabled(false);
      setTextMoveState({ item, currentX: item.data.x, currentY: item.data.y });
    },
    [resetTextDraft],
  );

  const handleAnnotationTap = useCallback(
    (item: AnnotatedCanvasItem) => {
      surface.open(IMAGE_ANNOTATION_ACTIONS_SURFACE_ID, {
        item,
        onDelete: () => handleDeleteAnnotationRef.current?.(item),
        onEditText: isTextCanvasItem(item)
          ? () => handleEditText(item)
          : undefined,
        onMoveText: isTextCanvasItem(item)
          ? () => handleMoveText(item)
          : undefined,
      } satisfies ImageAnnotationActionsSurfaceProps);
    },
    [handleEditText, handleMoveText, surface],
  );

  if (!currentImage) {
    return (
      <div
        className="flex h-full items-center justify-center bg-black text-white"
        data-testid="image-editor-page"
      >
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
        <p className="text-sm text-white/75">
          Upload in progress - annotation unavailable.
        </p>
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
    <div
      className="flex h-full min-h-full flex-col bg-black text-white"
      data-testid="image-editor-page"
    >
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden touch-none"
        data-testid="image-editor-stage-container"
      >
        <ZoomableEditorStage
          onPinchStart={() => {
            canvasRef.current?.reset();
            canvasRef.current?.setInteractionEnabled(false);
            resetTextDraft();
            cancelMove();
          }}
          onPinchEnd={() => {
            if (!textMoveStateRef.current) {
              canvasRef.current?.setInteractionEnabled(true);
            }
          }}
        >
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
              ref={canvasBoxRef}
              className="absolute"
              style={{
                left: canvasBox.left,
                top: canvasBox.top,
                width: canvasBox.width,
                height: canvasBox.height,
              }}
            >
              <ImageAnnotationCanvas
                ref={canvasRef}
                activeTool={activeTool}
                annotations={visibleCanvasItems}
                height={canvasBox.height}
                onAnnotationComplete={(item) =>
                  setSessionItems((current) => [...current, item])
                }
                onAnnotationTap={handleAnnotationTap}
                onTextPlacementRequest={(point) => {
                  setActiveTextTarget(null);
                  setTextAnchor(point);
                  setTextValue("");
                }}
                width={canvasBox.width}
              />

              {textAnchor ? (
                <input
                  ref={textInputRef}
                  className="absolute border-2 border-dashed border-white bg-transparent px-2 py-1 text-white outline-none"
                  data-testid="annotation-text-input"
                  style={{
                    left: `${textAnchor.x * canvasBox.width}px`,
                    top: `${textAnchor.y * canvasBox.height}px`,
                    fontSize: `${DEFAULT_TEXT_SIZE * canvasBox.height}px`,
                    minWidth: 200,
                    width: `${Math.max(
                      200,
                      textValue.length *
                        DEFAULT_TEXT_SIZE *
                        canvasBox.height *
                        0.62 +
                        32,
                    )}px`,
                  }}
                  type="text"
                  value={textValue}
                  onBlur={() => {
                    if (textValue.trim()) {
                      commitText(textValue);
                      return;
                    }

                    resetTextDraft();
                  }}
                  onChange={(event) => setTextValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitText(textValue);
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      resetTextDraft();
                    }
                  }}
                />
              ) : null}

              {textMoveState ? (
                <div
                  className="absolute touch-none select-none"
                  style={{
                    left: `${textMoveState.currentX * canvasBox.width}px`,
                    top: `${textMoveState.currentY * canvasBox.height}px`,
                    cursor: "grab",
                    zIndex: 10,
                  }}
                  onPointerDown={(event) => {
                    if (movePointerIdRef.current !== null) {
                      return;
                    }

                    const canvasElement = canvasBoxRef.current;

                    if (!canvasElement) {
                      return;
                    }

                    movePointerIdRef.current = event.pointerId;
                    event.currentTarget.setPointerCapture(event.pointerId);

                    const rect = canvasElement.getBoundingClientRect();
                    moveDragStartRef.current = {
                      normX: (event.clientX - rect.left) / rect.width,
                      normY: (event.clientY - rect.top) / rect.height,
                      textStartX: textMoveState.currentX,
                      textStartY: textMoveState.currentY,
                    };
                  }}
                  onPointerMove={(event) => {
                    if (
                      event.pointerId !== movePointerIdRef.current ||
                      !moveDragStartRef.current
                    ) {
                      return;
                    }

                    const canvasElement = canvasBoxRef.current;

                    if (!canvasElement) {
                      return;
                    }

                    const rect = canvasElement.getBoundingClientRect();
                    const currentNormX =
                      (event.clientX - rect.left) / rect.width;
                    const currentNormY =
                      (event.clientY - rect.top) / rect.height;
                    const newX =
                      moveDragStartRef.current.textStartX +
                      (currentNormX - moveDragStartRef.current.normX);
                    const newY =
                      moveDragStartRef.current.textStartY +
                      (currentNormY - moveDragStartRef.current.normY);

                    setTextMoveState((previous) => {
                      if (!previous) {
                        return previous;
                      }

                      return {
                        ...previous,
                        currentX: Math.max(0, Math.min(1, newX)),
                        currentY: Math.max(0, Math.min(1, newY)),
                      };
                    });
                  }}
                  onPointerUp={(event) => {
                    if (event.pointerId === movePointerIdRef.current) {
                      movePointerIdRef.current = null;
                      moveDragStartRef.current = null;
                    }
                  }}
                  onPointerCancel={(event) => {
                    if (event.pointerId === movePointerIdRef.current) {
                      movePointerIdRef.current = null;
                      moveDragStartRef.current = null;
                    }
                  }}
                >
                  <div
                    className="border-2 border-dashed border-white px-2 py-1 text-white"
                    style={{
                      fontSize: `${textMoveState.item.data.fontSize * canvasBox.height}px`,
                    }}
                  >
                    {textMoveState.item.data.text}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </ZoomableEditorStage>
      </div>

      <ImageEditorBottomControls
        activeTool={activeTool}
        canUndo={sessionItems.length > 0 || textAnchor !== null}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isPending || isCancelingCapture}
        onClose={handleClose}
        onDone={() => void handleSaveAndClose()}
        onOpenToolPicker={handleOpenToolPicker}
        onUndo={handleUndo}
      />
    </div>
  );
}
