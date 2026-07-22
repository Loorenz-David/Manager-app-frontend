import { apiClient } from "@beyo/api-client";
import {
  PresentationEnvelopeSchema,
  PresentationListEnvelopeSchema,
  PresentationPreviewEnvelopeSchema,
  type CreatePresentationInput,
  type Presentation,
  type PresentationListFilters,
  type PresentationPagination,
  type PresentationPreview,
  type UpdatePresentationMetadataInput,
} from "../types";

const BASE_PATH = "/api/v1/app-update-presentations";

export async function createPresentation(input: CreatePresentationInput): Promise<Presentation> {
  const response = await apiClient.put(BASE_PATH, PresentationEnvelopeSchema, input);
  return response.data.presentation;
}

export async function fetchPresentationsList(
  filters: PresentationListFilters = {},
): Promise<PresentationPagination> {
  const params: Record<string, string | number | boolean | undefined> = { ...filters };
  const response = await apiClient.get(BASE_PATH, PresentationListEnvelopeSchema, params);
  return response.data.app_update_presentations_pagination;
}

export async function fetchPresentationDetail(id: string): Promise<Presentation> {
  const response = await apiClient.get(`${BASE_PATH}/${id}`, PresentationEnvelopeSchema);
  return response.data.presentation;
}

export async function updatePresentationMetadata(
  input: UpdatePresentationMetadataInput,
): Promise<Presentation> {
  const { id, ...body } = input;
  const response = await apiClient.patch(`${BASE_PATH}/${id}`, PresentationEnvelopeSchema, body);
  return response.data.presentation;
}

export async function publishPresentation(id: string): Promise<Presentation> {
  const response = await apiClient.post(`${BASE_PATH}/${id}/publish`, PresentationEnvelopeSchema, {});
  return response.data.presentation;
}

export async function archivePresentation(id: string): Promise<Presentation> {
  const response = await apiClient.post(`${BASE_PATH}/${id}/archive`, PresentationEnvelopeSchema, {});
  return response.data.presentation;
}

export async function createNewVersion(id: string): Promise<Presentation> {
  const response = await apiClient.post(`${BASE_PATH}/${id}/new-version`, PresentationEnvelopeSchema, {});
  return response.data.presentation;
}

export async function fetchPresentationPreview(id: string): Promise<PresentationPreview> {
  const response = await apiClient.get(`${BASE_PATH}/${id}/preview`, PresentationPreviewEnvelopeSchema);
  return response.data.presentation;
}
