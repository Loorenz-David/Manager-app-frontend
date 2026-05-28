import { apiClient } from '@beyo/api-client';

import { ListEntityImagesParamsSchema, ListEntityImagesResponseSchema } from '../types';
import type { EntityImage, ListEntityImagesParams } from '../types';

export async function fetchEntityImages(
  params: ListEntityImagesParams,
): Promise<EntityImage[]> {
  const parsedParams = ListEntityImagesParamsSchema.parse(params);
  const response = await apiClient.get('/api/v1/images', ListEntityImagesResponseSchema, parsedParams);
  return response.data.images;
}
