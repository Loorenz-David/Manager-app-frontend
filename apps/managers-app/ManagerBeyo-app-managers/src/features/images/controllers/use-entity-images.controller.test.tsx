import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildEntityImage, buildImage, createTestQueryClient, createTestWrapper } from '../test-utils';
import { buildEntityKey, useImagesStore } from '../store/images.store';

const {
  useEntityImagesQueryMock,
  runImageUploadPipelineMock,
  useSurfaceMock,
  useDeleteImageMock,
  useReorderImagesMock,
  useUnlinkImageMock,
  generateClientIdMock,
} = vi.hoisted(() => ({
  useEntityImagesQueryMock: vi.fn(),
  runImageUploadPipelineMock: vi.fn(),
  useSurfaceMock: vi.fn(),
  useDeleteImageMock: vi.fn(),
  useReorderImagesMock: vi.fn(),
  useUnlinkImageMock: vi.fn(),
  generateClientIdMock: vi.fn(),
}));

vi.mock('../api/use-entity-images', () => ({
  useEntityImagesQuery: useEntityImagesQueryMock,
}));

vi.mock('../lib/image-upload-pipeline', () => ({
  runImageUploadPipeline: runImageUploadPipelineMock,
}));

vi.mock('../actions/use-delete-image', () => ({
  useDeleteImage: useDeleteImageMock,
}));

vi.mock('../actions/use-reorder-images', () => ({
  useReorderImages: useReorderImagesMock,
}));

vi.mock('../actions/use-unlink-image', () => ({
  useUnlinkImage: useUnlinkImageMock,
}));

vi.mock('@/hooks/use-surface', () => ({
  useSurface: useSurfaceMock,
}));

vi.mock('@/lib/client-id', () => ({
  generateClientId: generateClientIdMock,
}));

import { useEntityImagesController } from './use-entity-images.controller';

describe('useEntityImagesController', () => {
  const entityKey = buildEntityKey('item', 'item_1');
  const revokeObjectURLMock = vi.fn();
  const createObjectURLMock = vi.fn();
  const unlinkImageAsyncMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useImagesStore.setState({ optimisticImages: { [entityKey]: [] } });

    useEntityImagesQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });
    useSurfaceMock.mockReturnValue({ open: vi.fn() });
    useDeleteImageMock.mockReturnValue({});
    useReorderImagesMock.mockReturnValue({ reorderImages: vi.fn() });
    useUnlinkImageMock.mockReturnValue({ unlinkImageAsync: unlinkImageAsyncMock });
    generateClientIdMock.mockReturnValue('optimistic_img_1');

    createObjectURLMock.mockReturnValue('blob:optimistic');
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    } as unknown as typeof URL);
  });

  it('merges confirmed server images with pending optimistic images and removes duplicates', async () => {
    useImagesStore.setState({
      optimisticImages: {
        [entityKey]: [
          {
            clientId: 'img_server',
            linkClientId: null,
            entityType: 'item',
            entityClientId: 'item_1',
            imageUrl: 'https://cdn.example.com/image-server.webp',
            localObjectUrl: null,
            displayOrder: 5,
            widthPx: 800,
            heightPx: 800,
            fileSizeBytes: 500,
            createdAt: '2026-05-21T12:00:00.000Z',
            uploadState: 'completed',
            isOptimistic: true,
            isDeleted: false,
            pendingUploadClientId: null,
            uploadError: null,
            annotation: null,
          },
          {
            clientId: 'img_pending',
            linkClientId: null,
            entityType: 'item',
            entityClientId: 'item_1',
            imageUrl: 'blob:pending',
            localObjectUrl: 'blob:pending',
            displayOrder: 1,
            widthPx: null,
            heightPx: null,
            fileSizeBytes: 400,
            createdAt: '2026-05-21T12:00:00.000Z',
            uploadState: 'uploading',
            isOptimistic: true,
            isDeleted: false,
            pendingUploadClientId: null,
            uploadError: null,
            annotation: null,
          },
        ],
      },
    });
    useEntityImagesQueryMock.mockReturnValue({
      data: [
        buildEntityImage({
          image: buildImage({ client_id: 'img_server', image_url: 'https://cdn.example.com/image-server.webp' }),
          display_order: 0,
        }),
      ],
      isPending: false,
      isError: false,
    });

    const { result } = renderHook(
      () =>
        useEntityImagesController({
          entityType: 'item',
          entityClientId: 'item_1',
        }),
      {
        wrapper: createTestWrapper(createTestQueryClient()),
      },
    );

    expect(result.current.images.map((image) => image.clientId)).toEqual(['img_server', 'img_pending']);

    await waitFor(() => {
      expect(useImagesStore.getState().optimisticImages[entityKey]).toEqual([
        expect.objectContaining({ clientId: 'img_pending' }),
      ]);
    });
  });

  it('cleans up and unlinks when an uploading image is deleted before confirmation finishes', async () => {
    let resolveUpload!: (image: ReturnType<typeof buildImage>) => void;
    runImageUploadPipelineMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
      () =>
        useEntityImagesController({
          entityType: 'item',
          entityClientId: 'item_1',
        }),
      {
        wrapper: createTestWrapper(queryClient),
      },
    );

    result.current.uploadImage(new Blob(['raw'], { type: 'image/png' }));

    await waitFor(() => {
      expect(result.current.images).toHaveLength(1);
    });

    result.current.deleteImage('optimistic_img_1');

    expect(useImagesStore.getState().optimisticImages[entityKey]?.[0]).toEqual(
      expect.objectContaining({
        isDeleted: true,
        uploadState: 'delete_requested',
      }),
    );

    resolveUpload(buildImage({ client_id: 'img_confirmed' }));

    await waitFor(() => {
      expect(useImagesStore.getState().optimisticImages[entityKey]).toEqual([]);
    });

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:optimistic');
    expect(unlinkImageAsyncMock).toHaveBeenCalledWith({
      image_client_id: 'img_confirmed',
      entity_type: 'item',
      entity_client_id: 'item_1',
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
