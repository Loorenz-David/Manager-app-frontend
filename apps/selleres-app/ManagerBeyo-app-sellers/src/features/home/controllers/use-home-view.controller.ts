import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  customerCoordinationEmailKeys,
  getCoordinationInboxThreads,
  useCustomerCoordinationCountsQuery,
  useEmailUnreadCountQuery,
} from "@beyo/task-customer-coordination";
import { usePostHandlingCountsQuery } from "@beyo/tasks";

import { formatCompactCount } from "../lib/format-compact-count";
import type { HomeState } from "../types";

export type HomeViewController = HomeState;

const FOLLOW_UP_INBOX_QUERY_PARAMS = {
  coordination_states: "coordinating",
  limit: 50,
  offset: 0,
} as const;

export function useHomeViewController(): HomeViewController {
  const queryClient = useQueryClient();
  const postHandlingCountsQuery = usePostHandlingCountsQuery("pending");
  const coordinationCountsQuery =
    useCustomerCoordinationCountsQuery("pending");
  const emailUnreadCountQuery = useEmailUnreadCountQuery();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: customerCoordinationEmailKeys.inboxThreads(
        FOLLOW_UP_INBOX_QUERY_PARAMS,
      ),
      queryFn: () => getCoordinationInboxThreads(FOLLOW_UP_INBOX_QUERY_PARAMS),
    });
  }, [queryClient]);

  const postHandlingCount = postHandlingCountsQuery.data?.pending ?? null;
  const postHandlingCountLabel =
    postHandlingCount !== null
      ? ` (${formatCompactCount(postHandlingCount)})`
      : "";
  const coordinationCount = coordinationCountsQuery.data?.pending ?? null;
  const coordinationCountLabel =
    coordinationCount !== null
      ? ` (${formatCompactCount(coordinationCount)})`
      : "";
  const emailUnreadCount = emailUnreadCountQuery.data ?? null;
  const emailUnreadCountLabel =
    emailUnreadCount !== null
      ? ` (${formatCompactCount(emailUnreadCount)})`
      : "";

  return {
    postHandlingCount,
    postHandlingCountLabel,
    coordinationCount,
    coordinationCountLabel,
    emailUnreadCount,
    emailUnreadCountLabel,
  };
}
