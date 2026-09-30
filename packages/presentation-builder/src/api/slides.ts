import { apiClient, type RequestActivity } from "@beyo/api-client";
import {
  PresentationEnvelopeSchema,
  type CreateSlideInput,
  type DeleteSlideInput,
  type Presentation,
  type ReorderSlidesInput,
  type UpdateSlideInput,
} from "../types";

const BASE_PATH = "/api/v1/app-update-presentations";

/** `activity` classifies the request (`X-Beyo-Activity`); it is never sent in the body. */
export type AddSlideVariables = CreateSlideInput & { activity?: RequestActivity };

export async function addSlide(input: AddSlideVariables): Promise<Presentation> {
  const { presentationId, activity, ...body } = input;
  const response = await apiClient.post(
    `${BASE_PATH}/${presentationId}/slides`,
    PresentationEnvelopeSchema,
    body,
    activity ? { activity } : undefined,
  );
  return response.data.presentation;
}

export async function updateSlide(input: UpdateSlideInput): Promise<Presentation> {
  const { presentationId, slideId, ...body } = input;
  const response = await apiClient.patch(
    `${BASE_PATH}/${presentationId}/slides/${slideId}`,
    PresentationEnvelopeSchema,
    body,
  );
  return response.data.presentation;
}

export async function deleteSlide(input: DeleteSlideInput): Promise<Presentation> {
  const response = await apiClient.delete(
    `${BASE_PATH}/${input.presentationId}/slides/${input.slideId}`,
    PresentationEnvelopeSchema,
  );
  return response.data.presentation;
}

export async function reorderSlides(input: ReorderSlidesInput): Promise<Presentation> {
  const { presentationId, ...body } = input;
  const response = await apiClient.post(
    `${BASE_PATH}/${presentationId}/slides/reorder`,
    PresentationEnvelopeSchema,
    body,
  );
  return response.data.presentation;
}
