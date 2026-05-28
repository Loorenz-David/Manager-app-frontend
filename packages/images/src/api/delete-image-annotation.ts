import { apiClient } from '@beyo/api-client';

import { DeleteImageAnnotationResponseSchema } from '../types';

export async function deleteImageAnnotation(
  imageClientId: string,
  annotationClientId: string,
): Promise<void> {
  await apiClient.delete(
    `/api/v1/images/${imageClientId}/annotations/${annotationClientId}`,
    DeleteImageAnnotationResponseSchema,
  );
}
