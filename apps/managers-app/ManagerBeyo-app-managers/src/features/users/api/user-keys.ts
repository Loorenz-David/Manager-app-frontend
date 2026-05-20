import type { UserId } from '@/types/common';
import type { ListUsersParams } from '@/features/users/types';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: ListUsersParams = {}) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: UserId) => [...userKeys.details(), id] as const,
  live: () => [...userKeys.all, 'live'] as const,
};
