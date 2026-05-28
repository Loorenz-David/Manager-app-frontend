import { apiClient } from '@beyo/api-client';

import { UnlinkImageInputSchema, UnlinkImageResponseSchema } from '../types';
import type { UnlinkImageInput } from '../types';

export async function unlinkImage(input: UnlinkImageInput): Promise<boolean> {
  const parsedInput = UnlinkImageInputSchema.parse(input);
  const response = await apiClient.delete(
    '/api/v1/images/links',
    UnlinkImageResponseSchema,
    parsedInput,
  );
  return response.data.unlinked;
}
