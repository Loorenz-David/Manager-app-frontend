import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPins } from "../api/pins/create-pins";
import { deletePins } from "../api/pins/delete-pins";
import { pinKeys } from "../api/pins/pin-keys";
import {
  generateNotificationPinId,
  parseConditionsToStates,
  serializeStatesToConditions,
  type CreatePinInput,
  type ListPinsResponse,
  type NotificationPinDto,
  type PinEntityType,
} from "../pins/pin-types";

export type DesiredPinSelection = {
  entity_type: PinEntityType;
  entity_client_id: string;
  states: string[];
};

export type SavePinsInput = {
  major_client_entity_id: string;
  existingPins: NotificationPinDto[];
  desiredSelections: DesiredPinSelection[];
};

type SavePinsContext = {
  previousPins: ListPinsResponse | undefined;
};

function targetKey(entityType: PinEntityType, entityClientId: string): string {
  return `${entityType}:${entityClientId}`;
}

function areStatesEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

export function buildPinSaveDiff(input: SavePinsInput): {
  upserts: CreatePinInput[];
  removals: NotificationPinDto[];
} {
  const existingByTarget = new Map(
    input.existingPins.map((pin) => [
      targetKey(pin.entity_type, pin.entity_client_id),
      pin,
    ]),
  );
  const desiredByTarget = new Map(
    input.desiredSelections
      .filter((selection) => selection.states.length > 0)
      .map((selection) => [
        targetKey(selection.entity_type, selection.entity_client_id),
        selection,
      ]),
  );

  const upserts: CreatePinInput[] = [];

  for (const selection of desiredByTarget.values()) {
    const existing = existingByTarget.get(
      targetKey(selection.entity_type, selection.entity_client_id),
    );
    const existingStates = existing
      ? parseConditionsToStates(existing.conditions)
      : [];

    if (existing && areStatesEqual(existingStates, selection.states)) {
      continue;
    }

    upserts.push({
      client_id: existing?.client_id ?? generateNotificationPinId(),
      entity_type: selection.entity_type,
      entity_client_id: selection.entity_client_id,
      major_entity_type: "task",
      major_client_entity_id: input.major_client_entity_id,
      conditions: serializeStatesToConditions(selection.states),
      fire_once: false,
    });
  }

  const removals = input.existingPins.filter(
    (pin) =>
      !desiredByTarget.has(targetKey(pin.entity_type, pin.entity_client_id)),
  );

  return { upserts, removals };
}

export function useSavePins() {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, SavePinsInput, SavePinsContext>({
    mutationFn: async (input: SavePinsInput) => {
      const { upserts, removals } = buildPinSaveDiff(input);

      if (upserts.length > 0) {
        await createPins(upserts);
      }

      if (removals.length > 0) {
        await deletePins(
          removals.map((pin) => ({
            client_id: pin.client_id,
          })),
        );
      }
    },
    onMutate: async (input) => {
      const queryKey = pinKeys.byMajor(input.major_client_entity_id);

      await queryClient.cancelQueries({ queryKey });
      const previousPins =
        queryClient.getQueryData<ListPinsResponse>(queryKey);

      return { previousPins };
    },
    onError: (_error, input, context) => {
      if (context?.previousPins !== undefined) {
        queryClient.setQueryData(
          pinKeys.byMajor(input.major_client_entity_id),
          context.previousPins,
        );
      }
    },
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: pinKeys.byMajor(input.major_client_entity_id),
      });
    },
  });

  return {
    savePins: mutation.mutate,
    savePinsAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
