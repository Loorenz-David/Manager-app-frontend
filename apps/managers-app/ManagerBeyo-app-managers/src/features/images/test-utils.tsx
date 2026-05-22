import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import type { EntityImage, Image, ImageViewModel } from './types';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createTestWrapper(queryClient = createTestQueryClient()) {
  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

export function buildImage(overrides: Partial<Image> = {}): Image {
  return {
    client_id: 'img_1',
    image_url: 'https://cdn.example.com/image-1.webp',
    storage_provider: 's3',
    source_type: 'uploaded',
    source_reference: null,
    width_px: 800,
    height_px: 800,
    file_size_bytes: 12_345,
    created_at: '2026-05-21T12:00:00.000Z',
    last_event: null,
    events: [],
    image_annotation: null,
    ...overrides,
  };
}

export function buildEntityImage(overrides: Partial<EntityImage> = {}): EntityImage {
  return {
    link_client_id: 'link_1',
    image: buildImage(),
    entity_type: 'item',
    entity_client_id: 'item_1',
    display_order: 0,
    ...overrides,
  };
}

export function buildImageViewModel(overrides: Partial<ImageViewModel> = {}): ImageViewModel {
  return {
    clientId: 'img_1',
    linkClientId: 'link_1',
    entityType: 'item',
    entityClientId: 'item_1',
    imageUrl: 'https://cdn.example.com/image-1.webp',
    localObjectUrl: null,
    displayOrder: 0,
    widthPx: 800,
    heightPx: 800,
    fileSizeBytes: 12_345,
    createdAt: '2026-05-21T12:00:00.000Z',
    uploadState: 'completed',
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation: null,
    ...overrides,
  };
}
