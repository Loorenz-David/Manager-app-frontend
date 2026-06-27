import type { SocketEventHandlers } from "@beyo/realtime";

import { taskNoteKeys } from "./api/task-note-keys";

export const taskNoteSocketEvents: SocketEventHandlers = {
  "task:note-created": ({ client_id }, { queryClient }) => {
    console.log("[task-notes][socket] task:note-created fired", { client_id });
    const queries = queryClient.getQueryCache().findAll({
      queryKey: taskNoteKeys.list(client_id),
    });
    console.log("[task-notes][socket] active observers for key:", queries.map((q) => ({
      queryKey: q.queryKey,
      observersCount: q.getObserversCount(),
      state: q.state.status,
    })));
    queryClient.invalidateQueries({
      queryKey: taskNoteKeys.list(client_id),
      refetchType: "active",
    });
  },

  "task:note-updated": ({ client_id }, { queryClient }) => {
    console.log("[task-notes][socket] task:note-updated fired", { client_id });
    const queries = queryClient.getQueryCache().findAll({
      queryKey: taskNoteKeys.list(client_id),
    });
    console.log("[task-notes][socket] active observers for key:", queries.map((q) => ({
      queryKey: q.queryKey,
      observersCount: q.getObserversCount(),
      state: q.state.status,
    })));
    queryClient.invalidateQueries({
      queryKey: taskNoteKeys.list(client_id),
      refetchType: "active",
    });
  },

  "task:note-deleted": ({ client_id }, { queryClient }) => {
    console.log("[task-notes][socket] task:note-deleted fired", { client_id });
    queryClient.invalidateQueries({
      queryKey: taskNoteKeys.list(client_id),
      refetchType: "active",
    });
  },
};
