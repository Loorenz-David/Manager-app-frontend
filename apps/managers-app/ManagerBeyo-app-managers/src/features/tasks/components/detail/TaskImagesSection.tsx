import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { EntityImagesProvider, ImagePreviewGrid } from "@/features/images";
import { taskKeys } from "../../api/task-keys";
import { useTaskDetailContext } from "../../providers/TaskDetailProvider";

export function TaskImagesSection(): React.JSX.Element {
  const { taskDetail, taskId } = useTaskDetailContext();
  const itemId = taskDetail?.item?.client_id ?? null;
  const queryClient = useQueryClient();

  const handleImagesChanged = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  }, [queryClient, taskId]);

  return (
    <div className="flex flex-col gap-3 mt-6">
      <h3 className="text-sm  text-[color:var(--color-icon)]">Images</h3>
      {itemId ? (
        <EntityImagesProvider entityClientId={itemId} entityType="item" onImagesChanged={handleImagesChanged}>
          <ImagePreviewGrid />
        </EntityImagesProvider>
      ) : (
        <p className="text-sm text-muted-foreground">
          No item is linked to this task.
        </p>
      )}
    </div>
  );
}
