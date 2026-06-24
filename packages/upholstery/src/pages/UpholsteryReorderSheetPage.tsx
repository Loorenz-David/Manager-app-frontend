import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useUpdateUpholsteryListOrder } from "../actions/use-update-upholstery-list-order";
import { useUpholsteryPickerOptionsQuery } from "../api/use-upholstery-picker-options";
import { UpholsteryDnDCard } from "../components/UpholsteryDnDCard";
import type { UpholsteryPickerOption } from "../types";

type UpholsteryReorderSheetSurfaceProps = {
  clientId: string;
};

type SortableDnDCardProps = {
  record: UpholsteryPickerOption;
  displayOrder: number;
};

function SortableUpholsteryDnDCard({
  record,
  displayOrder,
}: SortableDnDCardProps): React.JSX.Element {
  const { active } = useDndContext();
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: record.client_id,
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0 : 1,
    transform: CSS.Transform.toString(transform),
    transition: active && !isDragging ? transition : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      className="select-none"
      data-testid={`upholstery-sortable-card-${record.client_id}`}
      style={style}
      onContextMenu={(event) => event.preventDefault()}
    >
      <UpholsteryDnDCard
        displayOrder={displayOrder}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
        dragHandleRef={setActivatorNodeRef}
        record={record}
      />
    </div>
  );
}

function buildOrderedItems(
  upholsteries: UpholsteryPickerOption[],
  targetClientId: string,
): UpholsteryPickerOption[] {
  const target = upholsteries.find((item) => item.client_id === targetClientId) ?? null;
  const ordered = upholsteries.filter((item) => item.list_order !== null);

  if (target && target.list_order === null) {
    ordered.push(target);
  }

  return ordered.sort((left, right) => {
    if (left.list_order === null && right.list_order === null) {
      return 0;
    }
    if (left.list_order === null) {
      return 1;
    }
    if (right.list_order === null) {
      return -1;
    }
    return left.list_order - right.list_order;
  });
}

export function UpholsteryReorderSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { clientId } = useSurfaceProps<UpholsteryReorderSheetSurfaceProps>();
  const { data, isPending } = useUpholsteryPickerOptionsQuery({});
  const updateListOrder = useUpdateUpholsteryListOrder();
  const [localOrder, setLocalOrder] = useState<UpholsteryPickerOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const orderedItems = useMemo(
    () => (clientId ? buildOrderedItems(data?.upholsteries ?? [], clientId) : []),
    [clientId, data?.upholsteries],
  );
  const activeItem = activeId
    ? localOrder.find((item) => item.client_id === activeId) ?? null
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

  useEffect(() => {
    header?.setTitle("Reorder upholsteries");
    header?.setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalOrder(orderedItems);
    }
  }, [orderedItems]);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current !== null) {
        window.clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  function scheduleAutoClose() {
    if (autoCloseTimerRef.current !== null) {
      window.clearTimeout(autoCloseTimerRef.current);
    }

    autoCloseTimerRef.current = window.setTimeout(() => {
      header?.requestClose();
    }, 2000);
  }

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true;
    setActiveId(event.active.id as string);

    if (autoCloseTimerRef.current !== null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false;
    setActiveId(null);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localOrder.findIndex((item) => item.client_id === active.id);
    const newIndex = localOrder.findIndex((item) => item.client_id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(localOrder, oldIndex, newIndex);
    const movedItem = reordered[newIndex];

    setLocalOrder(reordered);

    updateListOrder.updateListOrder({
      client_id: movedItem.client_id,
      list_order: newIndex + 1,
    });

    scheduleAutoClose();
  }

  function handleDragCancel() {
    isDraggingRef.current = false;
    setActiveId(null);
  }

  if (!clientId) {
    return (
      <div
        className="bg-background p-4 text-sm text-muted-foreground"
        data-testid="upholstery-reorder-sheet"
      >
        Upholstery id is missing.
      </div>
    );
  }

  return (
    <div
      className="bg-background px-4 pb-4 pt-2"
      data-testid="upholstery-reorder-sheet"
    >
      {isPending && localOrder.length === 0 ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : localOrder.length > 0 ? (
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          <SortableContext
            items={localOrder.map((item) => item.client_id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {localOrder.map((item, index) => (
                <SortableUpholsteryDnDCard
                  key={item.client_id}
                  displayOrder={index + 1}
                  record={item}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeItem ? (
              <UpholsteryDnDCard
                displayOrder={localOrder.findIndex((item) => item.client_id === activeItem.client_id) + 1}
                isDragOverlay
                record={activeItem}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">No upholsteries to reorder.</p>
      )}
    </div>
  );
}
