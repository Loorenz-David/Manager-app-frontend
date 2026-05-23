import { useQuery } from '@tanstack/react-query';

import type { ListIssueCategoryConfigsParams } from '../types';
import { fetchIssueCategoryConfigs } from './fetch-issue-category-configs';
import { issueCategoryConfigKeys } from './issue-category-config-keys';

export function useIssueCategoryConfigsQuery(
  params: ListIssueCategoryConfigsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: issueCategoryConfigKeys.list(params),
    queryFn: () => fetchIssueCategoryConfigs(params),
    enabled: options.enabled ?? true,
  });
}
