import { QueryClient } from "@tanstack/react-query";

/**
 * The floor app's QueryClient defaults.
 *
 * Mutations run with `networkMode: "always"`: while the system gate
 * (`@beyo/system-control`) holds react-query offline — the backend sleeps,
 * starts or is unreachable — a clock-in is sent and fails at once instead of
 * being paused and replayed minutes later (a replayed clock-in would carry the
 * wrong time, long after the worker walked away). The gate shows the state;
 * the worker repeats the action once it is READY. Queries keep the default
 * `"online"` mode, so they pause while offline and resume when READY.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 300_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
        networkMode: "always",
      },
    },
  });
}
