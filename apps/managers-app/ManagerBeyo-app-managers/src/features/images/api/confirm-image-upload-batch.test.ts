import { describe, expect, it, vi } from 'vitest';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: postMock,
  },
}));

import {
  confirmImageUploadBatch,
  ConfirmImageUploadBatchValidationError,
} from './confirm-image-upload-batch';

describe('confirmImageUploadBatch', () => {
  it('throws before posting when image_client_id values are duplicated', async () => {
    await expect(
      confirmImageUploadBatch([
        {
          pending_upload_client_id: 'pending_1',
          entity_type: 'item',
          entity_client_id: 'item_1',
          image_client_id: 'img_1',
        },
        {
          pending_upload_client_id: 'pending_2',
          entity_type: 'item',
          entity_client_id: 'item_1',
          image_client_id: 'img_1',
        },
      ]),
    ).rejects.toBeInstanceOf(ConfirmImageUploadBatchValidationError);

    expect(postMock).not.toHaveBeenCalled();
  });

  it('throws before posting when pending_upload_client_id values are duplicated', async () => {
    await expect(
      confirmImageUploadBatch([
        {
          pending_upload_client_id: 'pending_1',
          entity_type: 'item',
          entity_client_id: 'item_1',
          image_client_id: 'img_1',
        },
        {
          pending_upload_client_id: 'pending_1',
          entity_type: 'item',
          entity_client_id: 'item_1',
          image_client_id: 'img_2',
        },
      ]),
    ).rejects.toBeInstanceOf(ConfirmImageUploadBatchValidationError);

    expect(postMock).not.toHaveBeenCalled();
  });
});
