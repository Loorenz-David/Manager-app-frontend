import { useQuery } from "@tanstack/react-query";
import { fetchWorkspaceWorkingSections } from "./fetch-workspace-working-sections";
import { workerWorkingSectionKeys } from "./working-section-keys";

/**
 * Lazy by design: home only fetches the workspace-wide list once the worker
 * taps "show more", so the default home render still costs a single request.
 */
export function useWorkspaceWorkingSectionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: workerWorkingSectionKeys.workspace(),
    queryFn: fetchWorkspaceWorkingSections,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
