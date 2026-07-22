import { apiClient } from "@beyo/api-client";
import {
  PresentationEnvelopeSchema,
  type Presentation,
  type ReplaceAudienceInput,
} from "../types";

const BASE_PATH = "/api/v1/app-update-presentations";

export async function replaceAudience(input: ReplaceAudienceInput): Promise<Presentation> {
  const { presentationId, ...body } = input;
  const response = await apiClient.put(
    `${BASE_PATH}/${presentationId}/audience`,
    PresentationEnvelopeSchema,
    body,
  );
  return response.data.presentation;
}
