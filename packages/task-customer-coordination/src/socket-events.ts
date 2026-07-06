import type { QueryClient } from "@tanstack/react-query";

import type { SocketEventHandlers } from "@beyo/realtime";

import { customerCoordinationEmailKeys } from "./api/customer-coordination-email-keys";
import { customerCoordinationKeys } from "./api/customer-coordination-keys";

export const customerCoordinationEmailSocketEvents: SocketEventHandlers = {
  "email.entity_threads.updated": (payload, { queryClient }) => {
    if (payload.entity_type !== "task_customer_coordination") {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: customerCoordinationEmailKeys.unreadCount(),
      refetchType: "active",
    });

    void queryClient.invalidateQueries({
      queryKey: [...customerCoordinationEmailKeys.all, "inbox-threads"],
      refetchType: "active",
    });

    for (const threadId of payload.thread_client_ids) {
      void queryClient.invalidateQueries({
        queryKey: [...customerCoordinationEmailKeys.all, "thread-messages", threadId],
        refetchType: "active",
      });
    }
  },

  // A background coordination-batch send job has finished delivering. The outbound
  // threads/messages already exist from queue time, so this event mainly reconciles
  // send outcomes; refetch the same four families the inbox + slide read. The payload
  // carries message_ids (not thread ids), so thread-messages is invalidated wholesale.
  // invalidateQueries is additive/idempotent, so a retry's second event is harmless.
  "email_batch:delivery_completed": (payload, { queryClient }) => {
    if (payload.request_kind !== "coordination_batch") {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: customerCoordinationEmailKeys.unreadCount(),
      refetchType: "active",
    });

    void queryClient.invalidateQueries({
      queryKey: [...customerCoordinationEmailKeys.all, "inbox-threads"],
      refetchType: "active",
    });

    void queryClient.invalidateQueries({
      queryKey: [...customerCoordinationEmailKeys.all, "thread-messages"],
      refetchType: "active",
    });

    // get-tasks-with-coordination + coordination counts.
    void queryClient.invalidateQueries({
      queryKey: customerCoordinationKeys.all,
      refetchType: "active",
    });
  },
};

// Coordination *state* transitions (completed / failed / coordinating). These are
// their own workspace events — they are NOT accompanied by a task:* event — so an
// app that only listens to task:* stays stale when another user changes a
// coordination. Invalidating customerCoordinationKeys.all refreshes both the home
// coordinate box count (get-customer-coordination-counts) and the batch slide list
// (get-tasks-with-coordination); the email keys keep the coordinating inbox + unread
// count in sync since a completed/failed coordination leaves the coordinating inbox.
function invalidateCoordinationState(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: customerCoordinationKeys.all,
    refetchType: "active",
  });
  void queryClient.invalidateQueries({
    queryKey: [...customerCoordinationEmailKeys.all, "inbox-threads"],
    refetchType: "active",
  });
  void queryClient.invalidateQueries({
    queryKey: customerCoordinationEmailKeys.unreadCount(),
    refetchType: "active",
  });
}

export const customerCoordinationSocketEvents: SocketEventHandlers = {
  "task_customer_coordination:completed": (_payload, { queryClient }) => {
    invalidateCoordinationState(queryClient);
  },
  "task_customer_coordination:failed": (_payload, { queryClient }) => {
    invalidateCoordinationState(queryClient);
  },
  "task_customer_coordination:coordinating": (_payload, { queryClient }) => {
    invalidateCoordinationState(queryClient);
  },
};
