import { useQuery } from '@tanstack/react-query';

import { imageKeys } from './image-keys';
import { fetchEntityImages } from './fetch-entity-images';
import type { ListEntityImagesParams } from '../types';

export function useEntityImagesQuery(params: ListEntityImagesParams) {
  return useQuery({
    queryKey: imageKeys.list(params),
    queryFn: () => fetchEntityImages(params),
  });
}
