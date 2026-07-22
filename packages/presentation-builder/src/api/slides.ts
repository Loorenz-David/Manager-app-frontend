import { apiClient } from "@beyo/api-client";
import {
  PresentationEnvelopeSchema,
  type CreateSlideInput,
  type DeleteSlideInput,
  type Presentation,
  type ReorderSlidesInput,
  type UpdateSlideInput,
} from "../types";

const BASE_PATH = "/api/v1/app-update-presentations";

export async function addSlide(input: CreateSlideInput): Promise<Presentation> {
  const { presentationId, ...body } = input;
  const response = await apiClient.post(
    `${BASE_PATH}/${presentationId}/slides`,
    PresentationEnvelopeSchema,
    body,
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
