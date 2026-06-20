import { useEffect, useMemo, useState } from "react";
import {
  parseConditionsToStates,
  usePinsByMajorQuery,
  useSavePins,
  type DesiredPinSelection,
  type NotificationPinDto,
} from "@beyo/notifications";
import { useItemUpholsteryQuery } from "@beyo/tasks";
import type { TaskId } from "@beyo/lib";
import { useSurface } from "@beyo/hooks";
import { PIN_NOTIFICATIONS_SLIDE_SURFACE_ID } from "../surface-ids";

export const WORKER_UPHOLSTERY_PIN_STATES = [
  { value: "ordered", label: "Ordered" },
  { value: "available", label: "Available" },
] as const;

export const WORKER_TASK_STEP_PIN_STATES = [
  { value: "pending", label: "Pending" },
  { value: "working", label: "Working" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
] as const;

type SelectionMap = Record<string, string[]>;

function selectionKey(entityType: string, entityClientId: string): string {
  return `${entityType}:${entityClientId}`;
}

function buildInitialSelections(pins: NotificationPinDto[]): SelectionMap {
  return pins.reduce<SelectionMap>((acc, pin) => {
    acc[selectionKey(pin.entity_type, pin.entity_client_id)] =
      parseConditionsToStates(pin.conditions);
    return acc;
  }, {});
}

export function usePinNotificationsController({
  taskId,
  itemId,
}: {
  taskId: TaskId;
  itemId: string | null | undefined;
}) {
  const surface = useSurface();
  const pinsQuery = usePinsByMajorQuery(taskId);
  const upholsteryQuery = useItemUpholsteryQuery(itemId);
  const savePins = useSavePins();
  const [selections, setSelections] = useState<SelectionMap>({});
  const [hydratedTaskId, setHydratedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (pinsQuery.data && hydratedTaskId !== taskId) {
      setSelections(buildInitialSelections(pinsQuery.data.pins));
      setHydratedTaskId(taskId);
    }
  }, [hydratedTaskId, pinsQuery.data, taskId]);

  const upholsteryEntry = upholsteryQuery.data?.upholstery[0] ?? null;

  const desiredSelections = useMemo<DesiredPinSelection[]>(() => {
    return Object.entries(selections).reduce<DesiredPinSelection[]>(
      (acc, [key, states]) => {
        const [entityType, entityClientId] = key.split(":");
        if (
          entityType !== "task_step" &&
          entityType !== "item_upholstery"
        ) {
          return acc;
        }

        acc.push({
          entity_type: entityType,
          entity_client_id: entityClientId,
          states,
        });
        return acc;
      },
      [],
    );
  }, [selections]);

  function getStates(entityType: string, entityClientId: string): string[] {
    return selections[selectionKey(entityType, entityClientId)] ?? [];
  }

  function setStates(
    entityType: "task_step" | "item_upholstery",
    entityClientId: string,
    states: string[],
  ) {
    setSelections((current) => {
      const next = { ...current };
      const key = selectionKey(entityType, entityClientId);

      if (states.length === 0) {
        delete next[key];
        return next;
      }

      next[key] = states;
      return next;
    });
  }

  async function submit() {
    await savePins.savePinsAsync({
      major_client_entity_id: taskId,
      existingPins: pinsQuery.data?.pins ?? [],
      desiredSelections,
    });
    surface.close(PIN_NOTIFICATIONS_SLIDE_SURFACE_ID);
  }

  return {
    taskId,
    itemId,
    pins: pinsQuery.data?.pins ?? [],
    isHydrating: pinsQuery.isLoading,
    isUpholsteryPending: upholsteryQuery.isLoading,
    isUpholsteryError: upholsteryQuery.isError,
    upholsteryEntry,
    saveError: savePins.error,
    isSaving: savePins.isPending,
    getStates,
    setStates,
    submit,
  };
}

export type PinNotificationsController = ReturnType<
  typeof usePinNotificationsController
>;
