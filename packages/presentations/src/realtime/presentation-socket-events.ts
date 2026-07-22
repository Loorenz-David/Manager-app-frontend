import type { QueryClient } from "@tanstack/react-query";

import { activePresentationKeys } from "../api/active-presentation";

export type PresentationRealtimePayload = {
  client_id: string;
  logical_client_id: string;
  version: number;
};

type PresentationRealtimeHandlerContext = {
  queryClient: QueryClient;
};

export function invalidateActivePresentationQueries(
  queryClient: QueryClient,
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: activePresentationKeys.all,
  });
}

function handlePresentationChange(
  _payload: PresentationRealtimePayload,
  { queryClient }: PresentationRealtimeHandlerContext,
): void {
  void invalidateActivePresentationQueries(queryClient);
}

export const presentationSocketEvents = {
  "app_update_presentation:published": handlePresentationChange,
  "app_update_presentation:archived": handlePresentationChange,
} as const;
