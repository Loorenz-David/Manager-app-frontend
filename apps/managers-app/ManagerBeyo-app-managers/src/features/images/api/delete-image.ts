import { apiClient } from '@/lib/api-client';

import { DeleteImageResponseSchema } from '../types';

export async function deleteImage(imageClientId: string): Promise<string> {
  const response = await apiClient.delete(
    `/api/v1/images/${imageClientId}`,
    DeleteImageResponseSchema,
  );
  return response.data.client_id;
}
