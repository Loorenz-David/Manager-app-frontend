import type { WorkingSectionId } from '@/types/common';
import type { ListWorkingSectionsParams } from '@/features/working_sections/types';

export const workingSectionKeys = {
  all: ['working-sections'] as const,
  lists: () => [...workingSectionKeys.all, 'list'] as const,
  list: (params: ListWorkingSectionsParams = {}) =>
    [...workingSectionKeys.lists(), params] as const,
  details: () => [...workingSectionKeys.all, 'detail'] as const,
  detail: (id: WorkingSectionId) => [...workingSectionKeys.details(), id] as const,
  members: (id: WorkingSectionId) => [...workingSectionKeys.detail(id), 'members'] as const,
};
