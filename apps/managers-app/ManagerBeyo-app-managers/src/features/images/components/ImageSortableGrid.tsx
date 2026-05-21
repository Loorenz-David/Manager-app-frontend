import type { CSSProperties } from 'react';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: image.clientId,
    disabled: !isDraggable,
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0.55 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDraggable ? 'touch-none' : undefined}
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
}: ImageSortableGridProps): React.JSX.Element {
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

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const confirmedImages = images.filter((image) => image.uploadState === 'completed');
    const oldIndex = confirmedImages.findIndex((image) => image.clientId === active.id);
    const newIndex = confirmedImages.findIndex((image) => image.clientId === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedImages = arrayMove(confirmedImages, oldIndex, newIndex);
    onReorder(reorderedImages.map((image) => image.clientId));
  }

  if (!isEditMode) {
    return (
      <>
        {images.map((image) => (
          <ImagePreviewTile
            key={image.clientId}
            image={image}
            onLongPress={onLongPress}
            onTap={onTap}
          />
        ))}
      </>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map((image) => image.clientId)} strategy={rectSortingStrategy}>
        {images.map((image) => (
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
    </DndContext>
  );
}
