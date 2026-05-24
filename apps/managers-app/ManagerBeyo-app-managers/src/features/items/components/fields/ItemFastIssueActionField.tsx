import { Plus } from 'lucide-react';

import { preloadItemFastIssueSurface } from '@/features/items/surfaces';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { usePreloadSurface } from '@/hooks/use-preload-surface';

export function ItemFastIssueActionField() {
  usePreloadSurface(preloadItemFastIssueSurface);

  function handlePress() {
    useSurfaceStore.getState().open('item-fast-issue-page', {});
  }

  return (
    <button
      type="button"
      data-testid="item-fast-issue-open-button"
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground"
      onClick={handlePress}
    >
      <Plus className="size-4" />
      Add custom issue
    </button>
  );
}
