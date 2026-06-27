import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDndContext,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { ImageViewModel } from '../types';
import { ImagePreviewTile } from './ImagePreviewTile';

type ImageSortableGridProps = {
  images: ImageViewModel[];
  isEditMode: boolean;
  onDelete: (imageClientId: string) => void;
  onLongPress: (imageClientId: string) => void;
  onReorder: (orderedClientIds: string[]) => void;
  onTap: (imageClientId: string) => void;
  overflowCount?: number;
};

type SortableTileProps = {
  image: ImageViewModel;
  isEditMode: boolean;
  onDelete: (imageClientId: string) => void;
  onLongPress: (imageClientId: string) => void;
  onTap: (imageClientId: string) => void;
};

function SortableTile({
  image,
  isEditMode,
  onDelete,
  onLongPress,
  onTap,
}: SortableTileProps): React.JSX.Element {
  const isDraggable = isEditMode && image.uploadState === 'completed';
  const { active } = useDndContext();
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: image.clientId,
    disabled: !isDraggable,
  });

  const style: CSSProperties = {
    // Invisible ghost while dragging — DragOverlay renders the visible clone.
    opacity: isDragging ? 0 : 1,
    transform: CSS.Transform.toString(transform),
    // Transition only for non-dragging tiles while a drag is active.
    // Cleared on drop so the final reflow snaps immediately.
    transition: active && !isDragging ? transition : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDraggable ? 'touch-none select-none' : undefined}
      onContextMenu={isDraggable ? (e) => { e.preventDefault(); } : undefined}
      {...(isDraggable ? attributes : {})}
      {...(isDraggable ? listeners : {})}
    >
      <ImagePreviewTile
        image={image}
        isEditMode={isEditMode}
        onDeletePress={onDelete}
        onLongPress={isEditMode ? undefined : onLongPress}
        onTap={onTap}
        testId={`image-sortable-tile-${image.clientId}`}
      />
    </div>
  );
}

export function ImageSortableGrid({
  images,
  isEditMode,
  onDelete,
  onLongPress,
  onReorder,
  onTap,
  overflowCount = 0,
}: ImageSortableGridProps): React.JSX.Element {
  const [sortedImages, setSortedImages] = useState(() => images);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overlaySize, setOverlaySize] = useState<{ width: number; height: number } | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setSortedImages(images);
    }
  }, [images]);

  const activeImage = activeId
    ? (sortedImages.find((img) => img.clientId === activeId) ?? null)
    : null;

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  function handleDragStart(event: DragStartEvent): void {
    isDraggingRef.current = true;
    setActiveId(event.active.id as string);
    const rect = event.active.rect.current.initial;
    setOverlaySize(rect ? { width: rect.width, height: rect.height } : null);
  }

  function handleDragEnd(event: DragEndEvent): void {
    isDraggingRef.current = false;
    setActiveId(null);
    setOverlaySize(null);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const confirmedImages = sortedImages.filter((image) => image.uploadState === 'completed');
    const oldIndex = confirmedImages.findIndex((image) => image.clientId === active.id);
    const newIndex = confirmedImages.findIndex((image) => image.clientId === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedConfirmed = arrayMove(confirmedImages, oldIndex, newIndex);
    const nonConfirmed = sortedImages.filter((image) => image.uploadState !== 'completed');

    setSortedImages([...reorderedConfirmed, ...nonConfirmed]);
    onReorder(reorderedConfirmed.map((image) => image.clientId));
  }

  if (!isEditMode) {
    return (
      <>
        {images.map((image, index) => (
          <ImagePreviewTile
            key={image.clientId}
            image={image}
            onLongPress={onLongPress}
            onTap={onTap}
            overlayLabel={
              overflowCount > 0 && index === images.length - 1
                ? `+${overflowCount}`
                : null
            }
          />
        ))}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortedImages.map((image) => image.clientId)} strategy={rectSortingStrategy}>
        {sortedImages.map((image) => (
          <SortableTile
            key={image.clientId}
            image={image}
            isEditMode={isEditMode}
            onDelete={onDelete}
            onLongPress={onLongPress}
            onTap={onTap}
          />
        ))}
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeImage ? (
          <div
            className="cursor-grabbing overflow-hidden rounded-2xl shadow-2xl"
            style={overlaySize ?? undefined}
          >
            <ImagePreviewTile image={activeImage} onTap={onTap} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
