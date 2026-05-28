import { apiClient } from '@beyo/api-client';

import { CreateImageAnnotationInputSchema, CreateImageAnnotationResponseSchema } from '../types';
import type { CreateImageAnnotationInput } from '../types';

export async function createImageAnnotation(
  input: CreateImageAnnotationInput,
): Promise<void> {
  const parsedInput = CreateImageAnnotationInputSchema.parse(input);
  await apiClient.post(
    `/api/v1/images/${parsedInput.image_client_id}/annotations`,
    CreateImageAnnotationResponseSchema,
    parsedInput,
  );
}
