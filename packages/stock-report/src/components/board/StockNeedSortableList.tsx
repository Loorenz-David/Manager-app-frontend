import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { StockNeedCardData } from "../../stock-report.types";
import { StockNeedCard } from "./StockNeedCard";

export type StockNeedSortableListProps = {
  cards: readonly StockNeedCardData[];
  onCardPress: (stockNeedId: string) => void;
  /**
   * Reorganise mode. Outside it no card shows a handle or a priority button and
   * nothing can be dragged (intention §6.1).
   */
  isReorganiseMode: boolean;
  /**
   * `false` for the Unset bucket: unprioritised rows have no order, so they get
   * the priority button and no handle at all (the backend refuses to order a
   * null-priority row).
   */
  sortable?: boolean;
  /** Drag off while a reorder is still in flight (§12B B16). */
  disabled?: boolean;
  onSetPriority: (stockNeedId: string) => void;
  /** What the per-card priority button says — see `StockNeedCard`. */
  priorityActionLabel?: string;
  /**
   * `toIndex` is the **0-based array index** of the drop position in the
   * complete bucket list. The 1-based `priority_order` the endpoint wants is
   * the logic session's conversion (intention §8.4).
   */
  onReorder: (activeId: string, toIndex: number) => void;
};

/**
 * The list only ever moves vertically, so the horizontal component of the drag
 * transform is thrown away. A modifier is a plain function — no extra package.
 */
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

type SortableStockNeedCardProps = {
  card: StockNeedCardData;
  onPress: (stockNeedId: string) => void;
  onSetPriority: (stockNeedId: string) => void;
  priorityActionLabel?: string;
  disabled: boolean;
};

function SortableStockNeedCard({
  card,
  onPress,
  onSetPriority,
  priorityActionLabel,
  disabled,
}: SortableStockNeedCardProps): React.JSX.Element {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.stockNeedId, disabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // The dragged card keeps its place in the flow and is drawn above its
    // neighbours: the design wants the card itself to carry the dragging look,
    // with the list reflowing live and no drop indicator (states B2/B3).
    zIndex: isDragging ? 1 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onContextMenu={(event) => event.preventDefault()}
    >
      <StockNeedCard
        card={card}
        dragHandleProps={{ ...attributes, ...listeners }}
        dragHandleRef={setActivatorNodeRef}
        isDragging={isDragging}
        // The handle stays visible while a reorder is in flight — `useSortable`
        // is what refuses the drag. Hiding it would make the row flicker.
        showDragHandle
        onPress={onPress}
        onSetPriority={onSetPriority}
        priorityActionLabel={priorityActionLabel}
      />
    </div>
  );
}

export function StockNeedSortableList({
  cards,
  onCardPress,
  isReorganiseMode,
  sortable = true,
  disabled = false,
  onSetPriority,
  priorityActionLabel,
  onReorder,
}: StockNeedSortableListProps): React.JSX.Element {
  const [order, setOrder] = useState<readonly StockNeedCardData[]>(cards);
  const isDraggingRef = useRef(false);

  // Incoming data is adopted between drags only: replacing the list underneath
  // a finger would teleport the card being held.
  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrder(cards);
    }
  }, [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Outside reorganise mode, and in the Unset bucket, there is nothing to drag:
  // render the plain list and mount no DndContext at all.
  if (!isReorganiseMode || !sortable) {
    return (
      <StockNeedPlainList
        cards={cards}
        // A bucket with no ordering has nothing to enter a mode for, so its one
        // action is offered outright: in Unset the priority button is always
        // there (owner, 2026-09-22). An orderable bucket keeps it behind the
        // mode, beside the drag handles.
        showPriorityAction={!sortable || isReorganiseMode}
        onCardPress={onCardPress}
        onSetPriority={onSetPriority}
        priorityActionLabel={priorityActionLabel}
      />
    );
  }

  function handleDragStart(_event: DragStartEvent): void {
    isDraggingRef.current = true;
  }

  function handleDragCancel(): void {
    isDraggingRef.current = false;
    setOrder(cards);
  }

  function handleDragEnd(event: DragEndEvent): void {
    isDraggingRef.current = false;

    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = order.findIndex((card) => card.stockNeedId === active.id);
    const toIndex = order.findIndex((card) => card.stockNeedId === over.id);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    setOrder(arrayMove([...order], fromIndex, toIndex));
    onReorder(String(active.id), toIndex);
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      sensors={sensors}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <SortableContext
        items={order.map((card) => card.stockNeedId)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="flex flex-col gap-2.5"
          data-testid="stock-report-board-list"
        >
          {order.map((card) => (
            <SortableStockNeedCard
              key={card.stockNeedId}
              card={card}
              disabled={disabled}
              onPress={onCardPress}
              onSetPriority={onSetPriority}
              priorityActionLabel={priorityActionLabel}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

type StockNeedPlainListProps = {
  cards: readonly StockNeedCardData[];
  showPriorityAction: boolean;
  onCardPress: (stockNeedId: string) => void;
  onSetPriority: (stockNeedId: string) => void;
  priorityActionLabel?: string;
};

function StockNeedPlainList({
  cards,
  showPriorityAction,
  onCardPress,
  onSetPriority,
  priorityActionLabel,
}: StockNeedPlainListProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2.5" data-testid="stock-report-board-list">
      {cards.map((card) => (
        <StockNeedCard
          key={card.stockNeedId}
          card={card}
          onPress={onCardPress}
          onSetPriority={showPriorityAction ? onSetPriority : undefined}
          priorityActionLabel={priorityActionLabel}
        />
      ))}
    </div>
  );
}
