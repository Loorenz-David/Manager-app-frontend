import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ItemUpholsteryEntrySchema,
  UpholsteryRequirementEntrySchema,
  type ItemUpholsteryEntry,
  type UpholsteryRequirementEntry,
} from "../types";

const FetchItemUpholsteryResponseSchema = ApiEnvelopeSchema(
  z.object({
    item_upholstery: z.array(ItemUpholsteryEntrySchema),
    requirements: z.array(UpholsteryRequirementEntrySchema),
  }),
);

export async function fetchItemUpholstery(itemId: string): Promise<{
  upholstery: ItemUpholsteryEntry[];
  requirements: UpholsteryRequirementEntry[];
}> {
  const envelope = await apiClient.get(
    `/api/v1/items/${itemId}/upholstery`,
    FetchItemUpholsteryResponseSchema,
  );

  return {
    upholstery: envelope.data.item_upholstery,
    requirements: envelope.data.requirements,
  };
}