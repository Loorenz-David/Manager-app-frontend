import { apiClient } from '@beyo/api-client';

import { GetImageResponseSchema } from '../types';
import type { Image } from '../types';

export async function fetchImage(imageClientId: string): Promise<Image> {
  const response = await apiClient.get(`/api/v1/images/${imageClientId}`, GetImageResponseSchema);
  return response.data.image;
}
