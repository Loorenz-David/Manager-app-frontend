import type { ItemId } from '@/types/common';
import type { ListItemsParams } from '@/features/items/types';

export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (params: ListItemsParams = {}) => [...itemKeys.lists(), params] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: ItemId) => [...itemKeys.details(), id] as const,
};
