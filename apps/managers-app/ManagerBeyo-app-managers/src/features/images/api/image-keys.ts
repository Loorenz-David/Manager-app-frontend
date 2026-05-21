import type { ListEntityImagesParams } from '../types';

export const imageKeys = {
  all: ['images'] as const,
  lists: () => [...imageKeys.all, 'list'] as const,
  list: (params: ListEntityImagesParams) => [...imageKeys.lists(), params] as const,
  details: () => [...imageKeys.all, 'detail'] as const,
  detail: (imageClientId: string) => [...imageKeys.details(), imageClientId] as const,
  downloadUrl: (imageClientId: string) =>
    [...imageKeys.detail(imageClientId), 'download-url'] as const,
};
