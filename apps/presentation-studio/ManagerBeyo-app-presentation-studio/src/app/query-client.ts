import { QueryClient } from "@tanstack/react-query";

/**
 * The app's QueryClient defaults.
 *
 * Mutations run with `networkMode: "always"`: while the system gate
 * (`@beyo/system-control`) holds react-query offline — the backend sleeps,
 * starts or is unreachable — a mutation is sent and fails at once instead of
 * being paused and replayed minutes later. The gate shows the state; the user
 * repeats the action once it is READY. Queries keep the default `"online"`
 * mode, so they pause while offline and resume when the gate is READY.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, retry: 1 },
      mutations: { retry: 0, networkMode: "always" },
    },
  });
}
