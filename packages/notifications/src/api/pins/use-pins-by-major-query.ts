import { useQuery } from "@tanstack/react-query";
import { fetchPins } from "./fetch-pins";
import { pinKeys } from "./pin-keys";

export function usePinsByMajorQuery(
  majorClientEntityId: string | null | undefined,
) {
  return useQuery({
    queryKey: majorClientEntityId
      ? pinKeys.byMajor(majorClientEntityId)
      : [...pinKeys.all, "missing-major"],
    queryFn: () => {
      if (!majorClientEntityId) {
        throw new Error("majorClientEntityId is required");
      }

      return fetchPins({
        major_client_entity_ids: [majorClientEntityId],
      });
    },
    enabled: Boolean(majorClientEntityId),
  });
}
