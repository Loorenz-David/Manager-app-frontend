import { apiClient } from "@beyo/api-client";
import { useQuery } from "@tanstack/react-query";

import {
  ActivePresentationEnvelopeSchema,
  type ConsumerPresentation,
} from "../types";

const BASE_PATH = "/api/v1/app-update-presentations";

export const activePresentationKeys = {
  all: ["presentations", "active"] as const,
  active: (appKey: string) => [...activePresentationKeys.all, appKey] as const,
};

export async function getActivePresentation(appKey: string): Promise<ConsumerPresentation | null> {
  const response = await apiClient.get(
    `${BASE_PATH}/active`,
    ActivePresentationEnvelopeSchema,
    { app_key: appKey },
  );
  return response.data.presentation;
}

export function useActivePresentation(appKey: string) {
  return useQuery({
    queryKey: activePresentationKeys.active(appKey),
    queryFn: () => getActivePresentation(appKey),
    enabled: appKey.length > 0,
    staleTime: 0,
  });
}

