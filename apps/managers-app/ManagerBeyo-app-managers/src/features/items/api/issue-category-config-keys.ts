import type { ListIssueCategoryConfigsParams } from '../types';

export const issueCategoryConfigKeys = {
  all: ['issue-category-configs'] as const,
  lists: () => [...issueCategoryConfigKeys.all, 'list'] as const,
  list: (params: ListIssueCategoryConfigsParams = {}) =>
    [...issueCategoryConfigKeys.lists(), params] as const,
};
