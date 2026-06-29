import { z } from "zod";

import { apiClient } from "@beyo/api-client";

import {
  type ExternalUpholsteryProvider,
  UpholsteryListResponseSchema,
  UpholsteryPickerOptionSchema,
} from "../types";

export type FetchExternalUpholsteryOptionsParams = {
  q: string;
  limit?: number;
  providers?: ExternalUpholsteryProvider[] | string;
};

function serializeProviders(
  providers: FetchExternalUpholsteryOptionsParams["providers"],
): string | undefined {
  if (!providers) {
    return undefined;
  }

  return Array.isArray(providers) ? providers.join(",") : providers;
}

export async function fetchExternalUpholsteryOptions(
  params: FetchExternalUpholsteryOptionsParams,
): Promise<{
  upholsteries: z.infer<typeof UpholsteryPickerOptionSchema>[];
  has_more: boolean;
  providers: string[];
}> {
  const providers = serializeProviders(params.providers);
  const envelope = await apiClient.get(
    "/api/v1/upholsteries/external",
    UpholsteryListResponseSchema,
    {
      q: params.q,
      limit: params.limit ?? 7,
      ...(providers ? { providers } : {}),
    },
  );

  return {
    upholsteries: envelope.data.upholsteries,
    has_more: envelope.data.upholsteries_pagination.has_more,
    providers: envelope.data.providers ?? [],
  };
}
