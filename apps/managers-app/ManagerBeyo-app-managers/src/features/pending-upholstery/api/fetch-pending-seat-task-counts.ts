import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import type { PendingSeatCounts } from "../types";

const PendingSeatCountsResponseSchema = ApiEnvelopeSchema(
  z.object({
    missing_selection_total: z.number(),
    missing_quantity_total: z.number(),
  }),
).extend({
  ok: z.literal(true),
});

export async function fetchPendingSeatTaskCounts(): Promise<PendingSeatCounts> {
  const response = await apiClient.get(
    "/api/v1/item-upholsteries/pending-seat-tasks/counts",
    PendingSeatCountsResponseSchema,
  );

  return {
    missing_selection_total: response.data.missing_selection_total,
    missing_quantity_total: response.data.missing_quantity_total,
  };
}
