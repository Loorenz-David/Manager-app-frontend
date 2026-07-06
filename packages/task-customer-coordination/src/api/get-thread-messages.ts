import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { EmailThreadMessagesFetchParams } from "@beyo/emails";

import { mapEmailMessage } from "../lib/map-email-message";
import { EmailMessageRawSchema, type ThreadMessagesResult } from "../types";

const GetThreadMessagesResponseSchema = ApiEnvelopeSchema(
  z.object({
    email_messages: z.array(EmailMessageRawSchema),
    email_messages_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export async function getThreadMessages(
  threadId: string,
  params: EmailThreadMessagesFetchParams = {},
): Promise<ThreadMessagesResult> {
  const queryParams: Record<string, number> = {};

  if (params.limit != null) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;

  const parsed = await apiClient.get(
    `/api/v1/email-threads/${threadId}/messages`,
    GetThreadMessagesResponseSchema,
    queryParams,
  );

  return {
    messages: parsed.data.email_messages.map(mapEmailMessage),
    has_more: parsed.data.email_messages_pagination.has_more,
  };
}
