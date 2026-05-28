import { apiClient } from '@beyo/api-client';

import { ImageDownloadUrlResponseSchema } from '../types';

export async function fetchImageDownloadUrl(
  imageClientId: string,
): Promise<{ downloadUrl: string; expiresIn: number }> {
  const response = await apiClient.get(
    `/api/v1/images/${imageClientId}/download-url`,
    ImageDownloadUrlResponseSchema,
  );

  return {
    downloadUrl: response.data.download_url,
    expiresIn: response.data.expires_in,
  };
}
