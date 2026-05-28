import { apiClient } from '@beyo/api-client';

import { RequestImageUploadUrlInputSchema, RequestImageUploadUrlResponseSchema } from '../types';
import type { RequestImageUploadUrlInput, RequestImageUploadUrlResponse } from '../types';

export async function requestImageUploadUrl(
  input: RequestImageUploadUrlInput,
): Promise<RequestImageUploadUrlResponse['data']> {
  const parsedInput = RequestImageUploadUrlInputSchema.parse(input);
  const response = await apiClient.post(
    '/api/v1/images/upload-url',
    RequestImageUploadUrlResponseSchema,
    parsedInput,
  );
  return response.data;
}
