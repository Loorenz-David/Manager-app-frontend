import { useQuery } from "@tanstack/react-query";
import { fetchWorkerWorkingSections } from "./fetch-worker-working-sections";
import { workerWorkingSectionKeys } from "./working-section-keys";

export function useWorkerWorkingSectionsQuery() {
  return useQuery({
    queryKey: workerWorkingSectionKeys.mine(),
    queryFn: fetchWorkerWorkingSections,
  });
}
