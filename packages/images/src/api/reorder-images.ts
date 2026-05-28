import { apiClient } from '@beyo/api-client';

import { ReorderImagesInputSchema, ReorderImagesResponseSchema } from '../types';
import type { ReorderImagesInput } from '../types';

export async function reorderImages(input: ReorderImagesInput): Promise<number> {
  const parsedInput = ReorderImagesInputSchema.parse(input);
  const response = await apiClient.post(
    '/api/v1/images/reorder',
    ReorderImagesResponseSchema,
    parsedInput,
  );
  return response.data.reordered;
}
