import { useEffect, useRef } from "react";
import { useAuth } from "@beyo/auth";

import { useTaskNotesQuery } from "../api/use-task-notes-query";
import type { TaskNoteUnreadViewerSurfaceProps } from "../surface-ids";

export type UseTaskNotesUnreadControllerOptions = {
  taskId: string;
  onOpen: (props: TaskNoteUnreadViewerSurfaceProps) => void;
};

export function useTaskNotesUnreadController({
  taskId,
  onOpen,
}: UseTaskNotesUnreadControllerOptions): void {
  const { user } = useAuth();
  const notesQuery = useTaskNotesQuery(taskId);
  const hasFiredRef = useRef(false);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (hasFiredRef.current || notesQuery.isPending || !user?.id) {
      return;
    }

    const hasUnread = (notesQuery.data ?? []).some(
      (entry) => !entry.note.users_read_list.includes(user.id),
    );

    hasFiredRef.current = true;

    if (!hasUnread) {
      return;
    }

    onOpenRef.current({ taskId });
  }, [notesQuery.data, notesQuery.isPending, taskId, user?.id]);
}
