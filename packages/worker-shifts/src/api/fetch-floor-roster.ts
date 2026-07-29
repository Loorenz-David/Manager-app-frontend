import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";
import { FloorRosterUserSchema, type FloorRoster } from "../types";
import type { FloorRosterParams } from "./worker-shift-keys";

export const FLOOR_ROSTER_PARAMS: FloorRosterParams = {
  role: "worker",
  compact: true,
  limit: 200,
};

const FloorRosterResponseSchema = ApiEnvelopeSchema(
  z.object({
    users: z.array(FloorRosterUserSchema),
  }),
);

export async function fetchFloorRoster(): Promise<FloorRoster> {
  const response = await apiClient.get(
    "/api/v1/users",
    FloorRosterResponseSchema,
    FLOOR_ROSTER_PARAMS,
  );
  const users = response.data.users;

  if (users.length === FLOOR_ROSTER_PARAMS.limit) {
    console.warn(
      "Floor roster reached the 200-worker response limit; the roster may be truncated.",
    );
  }

  return users;
}
