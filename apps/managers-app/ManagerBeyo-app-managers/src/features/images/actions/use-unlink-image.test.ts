import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildEntityImage, buildImage, createTestQueryClient, createTestWrapper } from '../test-utils';
import { imageKeys } from '../api/image-keys';

const { unlinkImageMock } = vi.hoisted(() => ({
  unlinkImageMock: vi.fn(),
}));

vi.mock('../api/unlink-image', () => ({
  unlinkImage: unlinkImageMock,
}));

import { useUnlinkImage } from './use-unlink-image';

describe('useUnlinkImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('optimistically removes the image and invalidates on success', async () => {
    unlinkImageMock.mockResolvedValue({ unlinked: true });
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const key = imageKeys.list({
      entity_type: 'item',
      entity_client_id: 'item_1',
    });

    queryClient.setQueryData(key, [
      buildEntityImage({ image: buildImage({ client_id: 'img_1' }) }),
      buildEntityImage({
        link_client_id: 'link_2',
        image: buildImage({ client_id: 'img_2' }),
      }),
    ]);

    const { result } = renderHook(() => useUnlinkImage(), {
      wrapper: createTestWrapper(queryClient),
    });

    await result.current.unlinkImageAsync({
      image_client_id: 'img_1',
      entity_type: 'item',
      entity_client_id: 'item_1',
    });

    expect(
      queryClient.getQueryData<ReturnType<typeof buildEntityImage>[]>(key)?.map(
        (entry) => entry.image.client_id,
      ),
    ).toEqual(['img_2']);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key });
    });
  });

  it('rolls back the previous list on error', async () => {
    unlinkImageMock.mockRejectedValue(new Error('unlink failed'));
    const queryClient = createTestQueryClient();
    const key = imageKeys.list({
      entity_type: 'item',
      entity_client_id: 'item_1',
    });

    queryClient.setQueryData(key, [
      buildEntityImage({ image: buildImage({ client_id: 'img_1' }) }),
      buildEntityImage({
        link_client_id: 'link_2',
        image: buildImage({ client_id: 'img_2' }),
      }),
    ]);

    const { result } = renderHook(() => useUnlinkImage(), {
      wrapper: createTestWrapper(queryClient),
    });

    await expect(
      result.current.unlinkImageAsync({
        image_client_id: 'img_1',
        entity_type: 'item',
        entity_client_id: 'item_1',
      }),
    ).rejects.toThrow('unlink failed');

    expect(
      queryClient.getQueryData<ReturnType<typeof buildEntityImage>[]>(key)?.map(
        (entry) => entry.image.client_id,
      ),
    ).toEqual(['img_1', 'img_2']);
  });
});
