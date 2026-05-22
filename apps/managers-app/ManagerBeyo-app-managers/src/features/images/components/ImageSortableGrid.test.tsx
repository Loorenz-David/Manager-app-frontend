import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildImageViewModel } from '../test-utils';

let latestOnDragEnd: ((event: { active: { id: string }; over: { id: string } | null }) => void) | null = null;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
  }) => {
    latestOnDragEnd = onDragEnd;
    return <div data-testid="mock-dnd-context">{children}</div>;
  },
  PointerSensor: class PointerSensor {},
  TouchSensor: class TouchSensor {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <>{children}</>,
  arrayMove: <T,>(items: T[], oldIndex: number, newIndex: number) => {
    const next = [...items];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved as T);
    return next;
  },
  rectSortingStrategy: vi.fn(),
  useSortable: ({ id }: { id: string }) => ({
    attributes: { 'data-sortable-id': id },
    isDragging: false,
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

vi.mock('./ImagePreviewTile', () => ({
  ImagePreviewTile: ({ image }: { image: { clientId: string } }) => (
    <div data-testid={`mock-tile-${image.clientId}`}>{image.clientId}</div>
  ),
}));

import { ImageSortableGrid } from './ImageSortableGrid';

describe('ImageSortableGrid', () => {
  it('renders plain tiles when edit mode is off', () => {
    render(
      <ImageSortableGrid
        images={[buildImageViewModel({ clientId: 'img_1' })]}
        isEditMode={false}
        onDelete={vi.fn()}
        onLongPress={vi.fn()}
        onReorder={vi.fn()}
        onTap={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('mock-dnd-context')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-tile-img_1')).toBeVisible();
  });

  it('reorders only confirmed images on drag end', () => {
    const onReorder = vi.fn();

    render(
      <ImageSortableGrid
        images={[
          buildImageViewModel({ clientId: 'img_1', uploadState: 'completed' }),
          buildImageViewModel({ clientId: 'img_2', uploadState: 'completed' }),
          buildImageViewModel({ clientId: 'img_3', uploadState: 'uploading' }),
        ]}
        isEditMode
        onDelete={vi.fn()}
        onLongPress={vi.fn()}
        onReorder={onReorder}
        onTap={vi.fn()}
      />,
    );

    latestOnDragEnd?.({
      active: { id: 'img_2' },
      over: { id: 'img_1' },
    });

    expect(onReorder).toHaveBeenCalledWith(['img_2', 'img_1']);
  });
});
