import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { SendEmailBatchResponseDataSchema } from "../types";
import type {
  SendEmailBatchInput,
  SendEmailBatchResponseData,
} from "../types";

const PostEmailBatchResponseSchema = ApiEnvelopeSchema(
  SendEmailBatchResponseDataSchema,
).extend({ ok: z.literal(true) });

export async function postEmailBatch(
  input: SendEmailBatchInput,
): Promise<SendEmailBatchResponseData> {
  const parsed = await apiClient.post(
    "/api/v1/tasks/customer-coordination/email-batch",
    PostEmailBatchResponseSchema,
    input,
  );

  return parsed.data;
}
