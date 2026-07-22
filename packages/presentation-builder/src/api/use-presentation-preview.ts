import { useQuery } from "@tanstack/react-query";
import { presentationKeys } from "./presentation-keys";
import { fetchPresentationPreview } from "./presentations";

export type PresentationPreviewOptions = { enabled?: boolean };

export function usePresentationPreview(id: string, options: PresentationPreviewOptions = {}) {
  return useQuery({
    queryKey: presentationKeys.preview(id),
    queryFn: () => fetchPresentationPreview(id),
    enabled: Boolean(id) && (options.enabled ?? true),
  });
}
