import { apiClient } from '@beyo/api-client';

import {
  ConfirmImageUploadBatchEnvelopeSchema,
  ConfirmImageUploadBatchResponseSchema,
} from '../types';
import type { ConfirmImageUploadBatchItem, Image } from '../types';

export class ConfirmImageUploadBatchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfirmImageUploadBatchValidationError';
  }
}

function findDuplicate(values: string[]): string | null {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }

    seen.add(value);
  }

  return null;
}

function validateBatchItems(items: ConfirmImageUploadBatchItem[]): void {
  const duplicateImageClientId = findDuplicate(
    items
      .map((item) => item.image_client_id)
      .filter((value): value is string => value !== undefined),
  );

  if (duplicateImageClientId) {
    throw new ConfirmImageUploadBatchValidationError(
      `Duplicate image_client_id in batch: ${duplicateImageClientId}`,
    );
  }

  const duplicatePendingUploadClientId = findDuplicate(
    items.map((item) => item.pending_upload_client_id),
  );

  if (duplicatePendingUploadClientId) {
    throw new ConfirmImageUploadBatchValidationError(
      `Duplicate pending_upload_client_id in batch: ${duplicatePendingUploadClientId}`,
    );
  }
}

export async function confirmImageUploadBatch(
  items: ConfirmImageUploadBatchItem[],
): Promise<Image[]> {
  validateBatchItems(items);

  const parsedInput = ConfirmImageUploadBatchEnvelopeSchema.parse({ items });
  const response = await apiClient.post(
    '/api/v1/images/confirm-upload',
    ConfirmImageUploadBatchResponseSchema,
    parsedInput,
  );

  return response.data.images;
}
