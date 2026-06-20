import { useEffect, useMemo, useState } from 'react';

import {
  parseConditionsToStates,
  usePinsByMajorQuery,
  useSavePins,
  type DesiredPinSelection,
  type NotificationPinDto,
} from '@beyo/notifications';
import { useItemUpholsteryQuery } from '@beyo/tasks';

import { useSurface } from '@/hooks/use-surface';

import { PIN_NOTIFICATIONS_SLIDE_SURFACE_ID } from '../surfaces';

export const MANAGER_UPHOLSTERY_PIN_STATES = [
  { value: 'ordered', label: 'Ordered' },
  { value: 'available', label: 'Available' },
  { value: 'in_use', label: 'In use' },
] as const;

export const MANAGER_TASK_STEP_PIN_STATES = [
  { value: 'pending', label: 'Pending' },
  { value: 'working', label: 'Working' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
] as const;

export const MANAGER_TASK_PIN_STATES = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'working', label: 'Working' },
  { value: 'ready', label: 'Ready' },
  { value: 'resolved', label: 'Resolved' },
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
  taskId: string;
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
    return Object.entries(selections)
      .map(([key, states]) => {
        const [entityType, entityClientId] = key.split(':');
        if (
          entityType !== 'task' &&
          entityType !== 'task_step' &&
          entityType !== 'item_upholstery'
        ) {
          return null;
        }

        return {
          entity_type: entityType,
          entity_client_id: entityClientId,
          states,
        } satisfies DesiredPinSelection;
      })
      .filter((entry): entry is DesiredPinSelection => entry !== null);
  }, [selections]);

  function getStates(entityType: string, entityClientId: string): string[] {
    return selections[selectionKey(entityType, entityClientId)] ?? [];
  }

  function setStates(
    entityType: 'task' | 'task_step' | 'item_upholstery',
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
