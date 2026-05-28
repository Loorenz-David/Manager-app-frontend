import { useQuery } from '@tanstack/react-query';

import { fetchImageDownloadUrl } from './fetch-image-download-url';
import { imageKeys } from './image-keys';

const DOWNLOAD_URL_STALE_TIME_MS = 1000 * 60 * 4;
const DOWNLOAD_URL_GC_TIME_MS = 1000 * 60 * 5;

export function useImageDownloadUrlQuery(
  imageClientId: string | null | undefined,
  enabled = false,
) {
  return useQuery({
    queryKey: imageKeys.downloadUrl(imageClientId ?? ''),
    queryFn: () => fetchImageDownloadUrl(imageClientId!),
    enabled: Boolean(imageClientId) && enabled,
    staleTime: DOWNLOAD_URL_STALE_TIME_MS,
    gcTime: DOWNLOAD_URL_GC_TIME_MS,
  });
}
