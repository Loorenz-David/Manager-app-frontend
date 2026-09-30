import { apiClient, type RequestActivity } from "@beyo/api-client";

import { DeleteImageResponseSchema } from "../types";

export type DeleteImageInput = {
  imageClientId: string;
  hardDelete?: boolean;
  /** Classifies the request (`X-Beyo-Activity`); unset: the input classifier. */
  activity?: RequestActivity;
};

export async function deleteImage({
  imageClientId,
  hardDelete,
  activity,
}: DeleteImageInput): Promise<string> {
  const response = await apiClient.delete(
    `/api/v1/images/${imageClientId}`,
    DeleteImageResponseSchema,
    undefined,
    { hard_delete: hardDelete ? true : undefined },
    activity ? { activity } : undefined,
  );
  return response.data.client_id;
}
