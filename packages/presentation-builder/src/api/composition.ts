import { apiClient } from "@beyo/api-client";
import {
  PresentationEnvelopeSchema,
  type Presentation,
  type ReplaceCompositionInput,
} from "../types";

const BASE_PATH = "/api/v1/app-update-presentations";

export async function replaceComposition(input: ReplaceCompositionInput): Promise<Presentation> {
  const { presentationId, slideId, ...body } = input;
  const response = await apiClient.put(
    `${BASE_PATH}/${presentationId}/slides/${slideId}/composition`,
    PresentationEnvelopeSchema,
    body,
  );
  return response.data.presentation;
}
