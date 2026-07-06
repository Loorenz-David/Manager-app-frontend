import { useQuery } from "@tanstack/react-query";
import type { EmailThreadMessagesFetchParams } from "@beyo/emails";

import { customerCoordinationEmailKeys } from "./customer-coordination-email-keys";
import { getThreadMessages } from "./get-thread-messages";
import type { ThreadMessagesResult } from "../types";

type UseThreadMessagesQueryOptions = {
  enabled?: boolean;
  placeholderData?: ThreadMessagesResult;
};

export function useThreadMessagesQuery(
  threadId: string | null,
  params: EmailThreadMessagesFetchParams = {},
  options: UseThreadMessagesQueryOptions = {},
) {
  return useQuery({
    queryKey: customerCoordinationEmailKeys.threadMessages(threadId ?? "", params),
    queryFn: () => getThreadMessages(threadId ?? "", params),
    enabled: Boolean(threadId) && (options.enabled ?? true),
    placeholderData: options.placeholderData,
  });
}
