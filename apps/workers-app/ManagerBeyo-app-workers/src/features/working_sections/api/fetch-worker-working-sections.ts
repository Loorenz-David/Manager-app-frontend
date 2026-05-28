import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  WorkerWorkingSectionsResponseSchema,
  type WorkerWorkingSection,
} from "../types";

function getTodayStartIso(): string {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
}

export async function fetchWorkerWorkingSections(): Promise<
  WorkerWorkingSection[]
> {
  const envelope = await apiClient.get(
    "/api/v1/working-sections/me",
    ApiEnvelopeSchema(WorkerWorkingSectionsResponseSchema),
    { today_start: getTodayStartIso() },
  );

  return envelope.data.working_sections;
}
