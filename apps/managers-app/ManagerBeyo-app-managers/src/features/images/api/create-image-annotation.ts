import { apiClient } from '@/lib/api-client';

import { CreateImageAnnotationInputSchema, CreateImageAnnotationResponseSchema } from '../types';
import type { CreateImageAnnotationInput } from '../types';

export async function createImageAnnotation(
  input: CreateImageAnnotationInput,
): Promise<string> {
  const parsedInput = CreateImageAnnotationInputSchema.parse(input);
  const response = await apiClient.post(
    `/api/v1/images/${parsedInput.image_client_id}/annotations`,
    CreateImageAnnotationResponseSchema,
    parsedInput,
  );
  return response.data.client_id;
}
