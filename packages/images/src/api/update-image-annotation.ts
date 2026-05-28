import { apiClient } from '@beyo/api-client';

import {
  UpdateImageAnnotationInputSchema,
  UpdateImageAnnotationResponseSchema,
} from '../types';
import type { UpdateImageAnnotationInput } from '../types';

export async function updateImageAnnotation(input: UpdateImageAnnotationInput): Promise<void> {
  const parsedInput = UpdateImageAnnotationInputSchema.parse(input);

  await apiClient.patch(
    `/api/v1/images/${parsedInput.image_client_id}/annotations/${parsedInput.annotation_client_id}`,
    UpdateImageAnnotationResponseSchema,
    {
      data: parsedInput.data,
      ...(parsedInput.accuracy !== undefined ? { accuracy: parsedInput.accuracy } : {}),
    },
  );
}
