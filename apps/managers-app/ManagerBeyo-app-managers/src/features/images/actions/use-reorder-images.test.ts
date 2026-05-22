import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildEntityImage, buildImage, createTestQueryClient, createTestWrapper } from '../test-utils';
import { imageKeys } from '../api/image-keys';

const { reorderImagesMock } = vi.hoisted(() => ({
  reorderImagesMock: vi.fn(),
}));

vi.mock('../api/reorder-images', () => ({
  reorderImages: reorderImagesMock,
}));

import { useReorderImages } from './use-reorder-images';

describe('useReorderImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('optimistically reorders the list and invalidates on success', async () => {
    reorderImagesMock.mockResolvedValue({ reordered: 2 });
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const key = imageKeys.list({
      entity_type: 'item',
      entity_client_id: 'item_1',
    });

    queryClient.setQueryData(key, [
      buildEntityImage({
        image: buildImage({ client_id: 'img_1' }),
        display_order: 0,
      }),
      buildEntityImage({
        link_client_id: 'link_2',
        image: buildImage({
          client_id: 'img_2',
          image_url: 'https://cdn.example.com/image-2.webp',
        }),
        display_order: 1,
      }),
    ]);

    const { result } = renderHook(() => useReorderImages(), {
      wrapper: createTestWrapper(queryClient),
    });

    await result.current.reorderImagesAsync({
      entity_type: 'item',
      entity_client_id: 'item_1',
      ordered_image_client_ids: ['img_2', 'img_1'],
    });

    expect(
      queryClient.getQueryData<ReturnType<typeof buildEntityImage>[]>(key)?.map(
        (entry) => entry.image.client_id,
      ),
    ).toEqual(['img_2', 'img_1']);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key });
    });
  });

  it('rolls back the previous list on error', async () => {
    reorderImagesMock.mockRejectedValue(new Error('reorder failed'));
    const queryClient = createTestQueryClient();
    const key = imageKeys.list({
      entity_type: 'item',
      entity_client_id: 'item_1',
    });

    queryClient.setQueryData(key, [
      buildEntityImage({
        image: buildImage({ client_id: 'img_1' }),
        display_order: 0,
      }),
      buildEntityImage({
        link_client_id: 'link_2',
        image: buildImage({
          client_id: 'img_2',
          image_url: 'https://cdn.example.com/image-2.webp',
        }),
        display_order: 1,
      }),
    ]);

    const { result } = renderHook(() => useReorderImages(), {
      wrapper: createTestWrapper(queryClient),
    });

    await expect(
      result.current.reorderImagesAsync({
        entity_type: 'item',
        entity_client_id: 'item_1',
        ordered_image_client_ids: ['img_2', 'img_1'],
      }),
    ).rejects.toThrow('reorder failed');

    expect(
      queryClient.getQueryData<ReturnType<typeof buildEntityImage>[]>(key)?.map(
        (entry) => entry.image.client_id,
      ),
    ).toEqual(['img_1', 'img_2']);
  });
});
