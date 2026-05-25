import { SectionLabel } from '@/components/primitives';
import { useItemCategoryPickerFlow } from '@/features/items';

import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

export function TaskBodyCategoryRow(): React.JSX.Element | null {
  const { taskDetail } = useTaskDetailContext();
  const { isLoading, options } = useItemCategoryPickerFlow();

  if (!taskDetail?.item) {
    return null;
  }

  const { item } = taskDetail;
  const category = item.item_category_id
    ? (options.find((option) => option.client_id === item.item_category_id) ?? null)
    : null;
  const categoryLabel = category?.name ?? item.item_category_snapshot ?? (isLoading ? 'Loading…' : null);

  if (!categoryLabel && !item.item_position) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-0.5">
      <SectionLabel tone="muted">{categoryLabel ?? '—'}</SectionLabel>
      {item.item_position ? (
        <span className="text-sm text-muted-foreground">{item.item_position}</span>
      ) : null}
    </div>
  );
}
