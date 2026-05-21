import { useQuery } from '@tanstack/react-query';

import { fetchImage } from './fetch-image';
import { imageKeys } from './image-keys';

export function useImageQuery(imageClientId: string | null | undefined) {
  return useQuery({
    queryKey: imageKeys.detail(imageClientId ?? ''),
    queryFn: () => fetchImage(imageClientId!),
    enabled: Boolean(imageClientId),
  });
}
