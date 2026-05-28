import { apiClient } from '@beyo/api-client';

import { ConfirmImageUploadInputSchema, ConfirmImageUploadResponseSchema } from '../types';
import type { ConfirmImageUploadInput, Image } from '../types';

export async function confirmImageUpload(input: ConfirmImageUploadInput): Promise<Image> {
  const parsedInput = ConfirmImageUploadInputSchema.parse(input);
  const response = await apiClient.post(
    '/api/v1/images/confirm-upload',
    ConfirmImageUploadResponseSchema,
    parsedInput,
  );
  return response.data.image;
}
