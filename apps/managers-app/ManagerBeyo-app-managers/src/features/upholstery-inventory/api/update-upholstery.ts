import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import type { UpholsteryId } from "@/types/common";

export type UpdateUpholsteryPayload = {
  name?: string;
  code?: string | null;
  image_url?: string | null;
  favorite?: boolean;
  upholstery_category_id?: string | null;
};

const UpdateUpholsteryResponseSchema = z.object({}).passthrough();

export async function updateUpholstery(
  upholsteryId: UpholsteryId,
  payload: UpdateUpholsteryPayload,
): Promise<void> {
  await apiClient.patch(
    `/api/v1/upholsteries/${upholsteryId}`,
    UpdateUpholsteryResponseSchema,
    payload,
  );
}
