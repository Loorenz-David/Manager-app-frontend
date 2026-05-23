import { useEffect } from 'react';

import { useIssueCategoryConfigsQuery } from '../api/use-issue-category-configs';
import { useIssueCategoryConfigSelectionStore } from '../store/issue-category-config-selection.store';
import type { IssueCategoryConfig } from '../types';

export function useItemIssuesPickerFlow(itemCategoryId: string | null) {
  const configsByCategory = useIssueCategoryConfigSelectionStore(
    (state) => state.configsByCategory,
  );
  const setConfigsForCategory = useIssueCategoryConfigSelectionStore(
    (state) => state.setConfigsForCategory,
  );

  const alreadyCached = itemCategoryId ? (configsByCategory[itemCategoryId] ?? null) : null;

  const { data, isPending } = useIssueCategoryConfigsQuery(
    { item_category_id: itemCategoryId ?? undefined },
    { enabled: itemCategoryId !== null && alreadyCached === null },
  );

  useEffect(() => {
    if (data?.issueConfigs && itemCategoryId && alreadyCached === null) {
      setConfigsForCategory(itemCategoryId, data.issueConfigs);
    }
  }, [alreadyCached, data, itemCategoryId, setConfigsForCategory]);

  if (itemCategoryId === null) {
    return { options: [] as IssueCategoryConfig[], isLoading: false, isDisabled: true };
  }

  const options = alreadyCached !== null ? alreadyCached : (data?.issueConfigs ?? []);

  return {
    options,
    isLoading: isPending && alreadyCached === null,
    isDisabled: false,
  };
}
