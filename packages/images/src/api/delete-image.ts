import { apiClient } from "@beyo/api-client";

import { DeleteImageResponseSchema } from "../types";

export type DeleteImageInput = {
  imageClientId: string;
  hardDelete?: boolean;
};

export async function deleteImage({
  imageClientId,
  hardDelete,
}: DeleteImageInput): Promise<string> {
  const response = await apiClient.delete(
    `/api/v1/images/${imageClientId}`,
    DeleteImageResponseSchema,
    undefined,
    { hard_delete: hardDelete ? true : undefined },
  );
  return response.data.client_id;
}
