import { apiClient } from "@beyo/api-client";
import {
  PresentationEnvelopeSchema,
  UploadUrlEnvelopeSchema,
  type ConfirmSlideMediaInput,
  type CreateMediaUploadUrlInput,
  type DeleteSlideMediaInput,
  type Presentation,
  type ReorderSlideMediaInput,
  type UpdateSlideMediaInput,
  type UploadUrlResponse,
} from "../types";

const BASE_PATH = "/api/v1/app-update-presentations";

export async function createMediaUploadUrl(
  input: CreateMediaUploadUrlInput,
): Promise<UploadUrlResponse> {
  const { presentationId, slideId, ...body } = input;
  const response = await apiClient.post(
    `${BASE_PATH}/${presentationId}/slides/${slideId}/media/upload-url`,
    UploadUrlEnvelopeSchema,
    body,
  );
  return response.data;
}

export async function confirmSlideMedia(input: ConfirmSlideMediaInput): Promise<Presentation> {
  const { presentationId, slideId, ...body } = input;
  const response = await apiClient.post(
    `${BASE_PATH}/${presentationId}/slides/${slideId}/media`,
    PresentationEnvelopeSchema,
    body,
  );
  return response.data.presentation;
}

export async function updateSlideMedia(input: UpdateSlideMediaInput): Promise<Presentation> {
  const { presentationId, slideId, mediaId, ...body } = input;
  const response = await apiClient.patch(
    `${BASE_PATH}/${presentationId}/slides/${slideId}/media/${mediaId}`,
    PresentationEnvelopeSchema,
    body,
  );
  return response.data.presentation;
}

export async function deleteSlideMedia(input: DeleteSlideMediaInput): Promise<Presentation> {
  const response = await apiClient.delete(
    `${BASE_PATH}/${input.presentationId}/slides/${input.slideId}/media/${input.mediaId}`,
    PresentationEnvelopeSchema,
  );
  return response.data.presentation;
}

export async function reorderSlideMedia(input: ReorderSlideMediaInput): Promise<Presentation> {
  const { presentationId, slideId, ...body } = input;
  const response = await apiClient.post(
    `${BASE_PATH}/${presentationId}/slides/${slideId}/media/reorder`,
    PresentationEnvelopeSchema,
    body,
  );
  return response.data.presentation;
}
