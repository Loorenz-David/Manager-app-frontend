import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  UserCompactSchema,
  type ListUsersParams,
  type UserCompact,
} from "../types";

const ListUsersResponseSchema = ApiEnvelopeSchema(
  z.object({
    users: z.array(UserCompactSchema),
    users_pagination: z.object({
      has_more: z.boolean(),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type ListUsersResult = {
  users: UserCompact[];
  total: number;
};

export async function listUsers(
  params: ListUsersParams = {},
): Promise<ListUsersResult> {
  const queryParams: Record<string, string | number | boolean> = {
    compact: params.compact ?? true,
  };

  if (params.limit != null) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;
  if (params.q) queryParams.q = params.q;

  const parsed = await apiClient.get(
    "/api/v1/users",
    ListUsersResponseSchema,
    queryParams,
  );

  return {
    users: parsed.data.users,
    total: parsed.data.users_pagination.total,
  };
}
