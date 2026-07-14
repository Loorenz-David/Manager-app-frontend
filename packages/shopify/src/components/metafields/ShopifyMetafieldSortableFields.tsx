import { useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
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

import type { ShopifyMetafieldField } from "../../types";
import type { ShopifyMetafieldPickerController } from "../../controllers/use-shopify-metafield-picker.controller";
import { ShopifyMetafieldField as ShopifyMetafieldFieldComponent } from "./ShopifyMetafieldField";

function SortableMetafieldField({
  field,
  controller,
}: {
  field: ShopifyMetafieldField;
  controller: ShopifyMetafieldPickerController;
}): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.identity, disabled: !field.preferenceClientId });

  return (
    <div
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <ShopifyMetafieldFieldComponent
        field={field}
        value={controller.valueForField(field)}
        showShopIdentity={controller.shouldDisplayShopIdentity}
        onChange={(value) => controller.updateFieldValue(field, value)}
        isEditMode={controller.isEditMode}
        hasItemCategory={controller.hasItemCategory}
        onAdd={() => controller.addPreference(field)}
        onRemove={() => controller.removePreference(field)}
        isMutating={controller.isFieldMutating(field)}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function ShopifyMetafieldSortableFields({
  controller,
}: {
  controller: ShopifyMetafieldPickerController;
}): React.JSX.Element {
  const [sortedFields, setSortedFields] = useState(controller.activeFields);
  const [activeId, setActiveId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) setSortedFields(controller.activeFields);
  }, [controller.activeFields]);

  const groups = useMemo(() => {
    const grouped = new Map<string, ShopifyMetafieldField[]>();
    sortedFields.forEach((field) => {
      const fields = grouped.get(field.shopIntegrationId) ?? [];
      fields.push(field);
      grouped.set(field.shopIntegrationId, fields);
    });
    return Array.from(grouped.values());
  }, [sortedFields]);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  function handleDragStart(event: DragStartEvent): void {
    isDraggingRef.current = true;
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(
    event: DragEndEvent,
    group: ShopifyMetafieldField[],
  ): void {
    isDraggingRef.current = false;
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = group.findIndex((field) => field.identity === active.id);
    const newIndex = group.findIndex((field) => field.identity === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(group, oldIndex, newIndex);
    setSortedFields((fields) => {
      const groupIds = new Set(group.map((field) => field.identity));
      const rest = fields.filter((field) => !groupIds.has(field.identity));
      return [...rest, ...reordered];
    });
    const activeField = group[oldIndex];
    controller.reorderPreference(activeField, newIndex);
  }

  if (!controller.isEditMode) {
    return (
      <>
        {controller.activeFields.map((field) => (
          <ShopifyMetafieldFieldComponent
            key={field.identity}
            field={field}
            value={controller.valueForField(field)}
            showShopIdentity={controller.shouldDisplayShopIdentity}
            onChange={(value) => controller.updateFieldValue(field, value)}
            isEditMode={false}
            hasItemCategory={controller.hasItemCategory}
            onAdd={() => controller.addPreference(field)}
            isMutating={controller.isFieldMutating(field)}
          />
        ))}
      </>
    );
  }

  const activeField = activeId
    ? sortedFields.find((field) => field.identity === activeId)
    : null;

  return (
    <>
      {groups.map((group) => (
        <DndContext
          key={group[0]?.shopIntegrationId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={(event) => handleDragEnd(event, group)}
        >
          <SortableContext
            items={group.map((field) => field.identity)}
            strategy={verticalListSortingStrategy}
          >
            {group.map((field) => (
              <SortableMetafieldField
                key={field.identity}
                field={field}
                controller={controller}
              />
            ))}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeField &&
            group.some((field) => field.identity === activeId) ? (
              <div className="rounded-md bg-card border border-light-border p-3 shadow-xl">
                <p className="text-sm font-medium">{activeField.name}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ))}
    </>
  );
}
