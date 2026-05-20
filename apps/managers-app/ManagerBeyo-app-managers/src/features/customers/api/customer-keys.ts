import type { CustomerId } from '@/types/common';
import type { ListCustomersParams } from '@/features/customers/types';

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params: ListCustomersParams = {}) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: CustomerId) => [...customerKeys.details(), id] as const,
};
