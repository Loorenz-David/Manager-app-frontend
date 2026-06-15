import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import {
  PendingSeatTaskRowSchema,
  type ListPendingSeatTasksParams,
  type PendingSeatTaskRow,
} from "../types";

const PendingSeatTasksResponseSchema = ApiEnvelopeSchema(
  z.object({
    tasks_pagination: z.object({
      items: z.array(PendingSeatTaskRowSchema),
      limit: z.number(),
      offset: z.number(),
      has_more: z.boolean(),
    }),
  }),
).extend({
  ok: z.literal(true),
});

export type PendingSeatTasksPage = {
  items: PendingSeatTaskRow[];
  limit: number;
  offset: number;
  hasMore: boolean;
};

export async function fetchPendingSeatTasks(
  params: ListPendingSeatTasksParams,
): Promise<PendingSeatTasksPage> {
  const trimmedQ = params.q?.trim();
  const response = await apiClient.get(
    "/api/v1/item-upholsteries/pending-seat-tasks",
    PendingSeatTasksResponseSchema,
    {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      ...(trimmedQ ? { q: trimmedQ } : {}),
      missing_selection: params.missing_selection,
      missing_quantity: params.missing_quantity,
    },
  );

  const pagination = response.data.tasks_pagination;
  return {
    items: pagination.items,
    limit: pagination.limit,
    offset: pagination.offset,
    hasMore: pagination.has_more,
  };
}
