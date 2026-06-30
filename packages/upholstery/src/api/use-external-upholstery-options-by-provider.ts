import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";

import {
  EXTERNAL_UPHOLSTERY_PROVIDERS,
  type ExternalUpholsteryProvider,
  type UpholsteryPickerOption,
} from "../types";
import {
  fetchExternalUpholsteryOptions,
  type FetchExternalUpholsteryOptionsParams,
} from "./fetch-external-upholstery-options";
import { upholsteryKeys } from "./upholstery-keys";

const EXTERNAL_PROVIDER_LIMIT = 10;

export type UseExternalUpholsteryOptionsByProviderParams = {
  q: string;
  providers?: ExternalUpholsteryProvider[];
};

export function resolveExternalSearchProviders(
  providers: ExternalUpholsteryProvider[] | undefined,
): ExternalUpholsteryProvider[] {
  if (!providers || providers.length === 0) {
    return [...EXTERNAL_UPHOLSTERY_PROVIDERS];
  }

  const validProviders = providers.filter((provider) =>
    EXTERNAL_UPHOLSTERY_PROVIDERS.includes(provider),
  );

  return validProviders.length > 0
    ? validProviders
    : [...EXTERNAL_UPHOLSTERY_PROVIDERS];
}

export function useExternalUpholsteryOptionsByProviderQuery(
  params: UseExternalUpholsteryOptionsByProviderParams,
  options: { enabled?: boolean } = {},
): {
  completionOrder: ExternalUpholsteryProvider[];
  isFetching: boolean;
  providers: ExternalUpholsteryProvider[];
  refetch: () => Promise<unknown[]>;
  upholsteries: UpholsteryPickerOption[];
} {
  const enabled = options.enabled ?? params.q.trim().length >= 1;
  const providers = useMemo(
    () => resolveExternalSearchProviders(params.providers),
    [params.providers],
  );
  const requestKey = `${params.q.trim()}::${providers.join(",")}`;
  const [completionOrder, setCompletionOrder] = useState<
    ExternalUpholsteryProvider[]
  >([]);

  const queries = useQueries({
    queries: providers.map((provider) => ({
      queryKey: upholsteryKeys.externalProviderSearch({
        q: params.q,
        limit: EXTERNAL_PROVIDER_LIMIT,
        provider,
      }),
      queryFn: () =>
        fetchExternalUpholsteryOptions({
          q: params.q,
          limit: EXTERNAL_PROVIDER_LIMIT,
          providers: [provider],
        } satisfies FetchExternalUpholsteryOptionsParams),
      enabled,
      placeholderData: (previous: Awaited<
        ReturnType<typeof fetchExternalUpholsteryOptions>
      > | undefined) => previous,
    })),
  });

  useEffect(() => {
    setCompletionOrder([]);
  }, [requestKey]);

  useEffect(() => {
    setCompletionOrder((previous) => {
      const next = previous.filter((provider) => providers.includes(provider));
      const seenProviders = new Set(next);
      const newlyCompleted = providers
        .map((provider, index) => ({
          dataUpdatedAt: queries[index]?.dataUpdatedAt ?? 0,
          provider,
          status: queries[index]?.status,
        }))
        .filter(
          (query) =>
            query.status === "success" &&
            query.dataUpdatedAt > 0 &&
            !seenProviders.has(query.provider),
        )
        .sort((left, right) => left.dataUpdatedAt - right.dataUpdatedAt);

      if (newlyCompleted.length === 0 && next.length === previous.length) {
        return previous;
      }

      newlyCompleted.forEach(({ provider }) => seenProviders.add(provider));

      const merged = [...next, ...newlyCompleted.map(({ provider }) => provider)];

      return merged.length === previous.length &&
        merged.every((provider, index) => provider === previous[index])
        ? previous
        : merged;
    });
  }, [providers, queries]);

  const providerData = useMemo(
    () =>
      new Map(
        providers.map((provider, index) => [provider, queries[index]?.data] as const),
      ),
    [providers, queries],
  );

  const upholsteries = useMemo(
    () =>
      completionOrder.flatMap(
        (provider) => providerData.get(provider)?.upholsteries ?? [],
      ),
    [completionOrder, providerData],
  );

  return {
    completionOrder,
    isFetching: queries.some((query) => query.isFetching),
    providers,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
    upholsteries,
  };
}
