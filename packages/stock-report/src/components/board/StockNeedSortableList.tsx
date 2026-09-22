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

import { AnimatedRemovalGroup, AnimatedRemovalItem } from "@beyo/ui";

import type { StockNeedCardData } from "../../stock-report.types";
import { StockNeedCard } from "./StockNeedCard";

/**
 * `gap-2.5` on both list containers, in px.
 *
 * `AnimatedRemovalItem` animates this away as negative margin while a row
 * collapses, so the gap the leaving row leaves behind and the margin cancel
 * out. A number that disagrees with the class makes the rows below jump by the
 * difference at the end of the exit — change the two together.
 */
const LIST_GAP_PX = 10;

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
   * "Put `activeId` where `overId` is." A **row**, not a slot.
   *
   * It used to hand out the drop position's 0-based array index, which the
   * logic session turned into `priority_order` by adding one. That only holds
   * while the board shows every row of the priority group, and it does not: the
   * list query hides rows with `quantity_requested` of 0, and hides more when a
   * major-category filter is set. A hidden row above the drop point made every
   * visible index smaller than the real position, so a downward drag asked for
   * a position the row already held and the backend correctly did nothing
   * (owner report, 2026-09-22). Naming the target row instead makes the
   * translation impossible to get wrong — the controller reads that row's own
   * `priority_order`.
   */
  onReorder: (activeId: string, overId: string) => void;
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

    // The local move is the immediate visual answer only; the cache's optimistic
    // move follows and the refetch settles it.
    setOrder(arrayMove([...order], fromIndex, toIndex));
    onReorder(String(active.id), String(over.id));
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
          {/* A card can leave this list while reorganise mode is on — changing
           * its priority moves it to another bucket. Removal animates here for
           * the same reason it does in the plain list; a drag and an exit never
           * overlap, because the sheet that changes the priority has to open
           * first. */}
          <AnimatedRemovalGroup>
            {order.map((card) => (
              <AnimatedRemovalItem key={card.stockNeedId} gapPx={LIST_GAP_PX}>
                <SortableStockNeedCard
                  card={card}
                  disabled={disabled}
                  onPress={onCardPress}
                  onSetPriority={onSetPriority}
                  priorityActionLabel={priorityActionLabel}
                />
              </AnimatedRemovalItem>
            ))}
          </AnimatedRemovalGroup>
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
      {/* Giving a card a priority moves it out of the bucket being viewed. The
       * row earns its way out rather than blinking away, so the change reads as
       * something the tap did. */}
      <AnimatedRemovalGroup>
        {cards.map((card) => (
          <AnimatedRemovalItem key={card.stockNeedId} gapPx={LIST_GAP_PX}>
            <StockNeedCard
              card={card}
              onPress={onCardPress}
              onSetPriority={showPriorityAction ? onSetPriority : undefined}
              priorityActionLabel={priorityActionLabel}
            />
          </AnimatedRemovalItem>
        ))}
      </AnimatedRemovalGroup>
    </div>
  );
}
