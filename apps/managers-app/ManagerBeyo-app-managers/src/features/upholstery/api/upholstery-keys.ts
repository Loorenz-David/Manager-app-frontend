import type { UpholsteryId, UpholsteryInventoryId } from '@/types/common';
import type { ListUpholsteriesParams, ListUpholsteryInventoriesParams } from '@/features/upholstery/types';

export const upholsteryKeys = {
  all: ['upholsteries'] as const,
  lists: () => [...upholsteryKeys.all, 'list'] as const,
  list: (params: ListUpholsteriesParams = {}) => [...upholsteryKeys.lists(), params] as const,
  details: () => [...upholsteryKeys.all, 'detail'] as const,
  detail: (id: UpholsteryId) => [...upholsteryKeys.details(), id] as const,
};

export const upholsteryInventoryKeys = {
  all: ['upholstery-inventories'] as const,
  lists: () => [...upholsteryInventoryKeys.all, 'list'] as const,
  list: (params: ListUpholsteryInventoriesParams = {}) =>
    [...upholsteryInventoryKeys.lists(), params] as const,
  details: () => [...upholsteryInventoryKeys.all, 'detail'] as const,
  detail: (id: UpholsteryInventoryId) =>
    [...upholsteryInventoryKeys.details(), id] as const,
};
