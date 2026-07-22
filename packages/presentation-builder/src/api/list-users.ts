import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const UserCompactRoleSchema = z.object({
  client_id: z.string(),
  name: z.string(),
});

export const PresentationUserCompactSchema = z.object({
  client_id: z.string(),
  username: z.string(),
  profile_picture: z.string().nullable(),
  role: UserCompactRoleSchema.nullable().optional(),
});

const ListUsersResponseSchema = ApiEnvelopeSchema(
  z.object({
    users: z.array(PresentationUserCompactSchema),
    users_pagination: z.object({
      has_more: z.boolean(),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type PresentationUserCompact = z.infer<typeof PresentationUserCompactSchema>;
export type ListPresentationUsersParams = {
  q?: string;
  limit?: number;
  offset?: number;
  compact?: boolean;
};

export type ListPresentationUsersResult = {
  users: PresentationUserCompact[];
  total: number;
};

export async function listPresentationUsers(
  params: ListPresentationUsersParams = {},
): Promise<ListPresentationUsersResult> {
  const queryParams: Record<string, string | number | boolean> = {
    compact: params.compact ?? true,
  };
  if (params.limit != null) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;
  if (params.q) queryParams.q = params.q;

  const parsed = await apiClient.get("/api/v1/users", ListUsersResponseSchema, queryParams);
  return {
    users: parsed.data.users,
    total: parsed.data.users_pagination.total,
  };
}
