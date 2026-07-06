import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { SendCoordinationReplyResponseDataSchema } from "../types";
import type {
  SendCoordinationReplyInput,
  SendCoordinationReplyResponseData,
} from "../types";

const PostCoordinationReplyResponseSchema = ApiEnvelopeSchema(
  SendCoordinationReplyResponseDataSchema,
).extend({ ok: z.literal(true) });

export async function postCoordinationReply(
  taskId: string,
  input: SendCoordinationReplyInput,
): Promise<SendCoordinationReplyResponseData> {
  const parsed = await apiClient.post(
    `/api/v1/tasks/${taskId}/customer-coordination/reply`,
    PostCoordinationReplyResponseSchema,
    input,
  );

  return parsed.data;
}
