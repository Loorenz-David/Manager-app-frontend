import type { ItemId, ItemImageId } from '@/types/common';

export const itemImageKeys = {
  all: ['item-images'] as const,
  lists: () => [...itemImageKeys.all, 'list'] as const,
  list: (itemId: ItemId) => [...itemImageKeys.lists(), { itemId }] as const,
  details: () => [...itemImageKeys.all, 'detail'] as const,
  detail: (id: ItemImageId) => [...itemImageKeys.details(), id] as const,
};
