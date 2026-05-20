import type { ItemUpholsteryId, UpholsteryRequirementId } from '@/types/common';
import type { ListItemUpholsteriesParams } from '@/features/upholstery_requirements/types';

export const itemUpholsteryKeys = {
  all: ['item-upholsteries'] as const,
  lists: () => [...itemUpholsteryKeys.all, 'list'] as const,
  list: (params: ListItemUpholsteriesParams = {}) =>
    [...itemUpholsteryKeys.lists(), params] as const,
  details: () => [...itemUpholsteryKeys.all, 'detail'] as const,
  detail: (id: ItemUpholsteryId) => [...itemUpholsteryKeys.details(), id] as const,
  requirements: (id: ItemUpholsteryId) =>
    [...itemUpholsteryKeys.detail(id), 'requirements'] as const,
};

export const upholsteryRequirementKeys = {
  all: ['upholstery-requirements'] as const,
  details: () => [...upholsteryRequirementKeys.all, 'detail'] as const,
  detail: (id: UpholsteryRequirementId) =>
    [...upholsteryRequirementKeys.details(), id] as const,
};
