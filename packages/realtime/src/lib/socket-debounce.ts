import type { QueryClient, QueryKey } from "@tanstack/react-query";

const _timers = new Map<string, ReturnType<typeof setTimeout>>();

export function debouncedInvalidation(
  queryClient: QueryClient,
  queryKey: QueryKey,
  delay = 300,
): void {
  const key = JSON.stringify(queryKey);
  const existing = _timers.get(key);

  if (existing) {
    clearTimeout(existing);
  }

  _timers.set(
    key,
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey, refetchType: "active" });
      _timers.delete(key);
    }, delay),
  );
}
