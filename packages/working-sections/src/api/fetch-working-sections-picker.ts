import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { WorkingSectionPickerOptionSchema } from "../types";

const ListWorkingSectionsResponseSchema = ApiEnvelopeSchema(
  z.object({
    working_sections: z.array(WorkingSectionPickerOptionSchema),
    working_sections_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number(),
      offset: z.number(),
    }),
  }),
);

export async function fetchWorkingSectionsPicker(): Promise<{
  workingSections: z.infer<typeof WorkingSectionPickerOptionSchema>[];
}> {
  const envelope = await apiClient.get(
    "/api/v1/working-sections",
    ListWorkingSectionsResponseSchema,
    {
      limit: 200,
      offset: 0,
    },
  );

  return {
    workingSections: envelope.data.working_sections,
  };
}
