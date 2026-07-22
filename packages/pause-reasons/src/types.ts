import { z } from "zod";
import type { PauseReasonId } from "@beyo/lib";

export const PauseReasonIdSchema = z
  .string()
  .transform((value) => value as PauseReasonId);

export const PauseTypeSchema = z.enum(["personal", "blocker"]);
export type PauseType = z.infer<typeof PauseTypeSchema>;

export const PauseReasonSchema = z.object({
  client_id: PauseReasonIdSchema,
  name: z.string(),
  image_url: z.string().nullable(),
  pause_type: PauseTypeSchema,
  description: z.string().nullable(),
  requires_description: z.boolean(),
  is_system_managed: z.boolean(),
  slug: z.string(),
  created_at: z.string(),
  created_by_id: z.string().nullable(),
  updated_at: z.string().nullable(),
  updated_by_id: z.string().nullable(),
});
export type PauseReason = z.infer<typeof PauseReasonSchema>;

export const PauseReasonsPaginationSchema = z.object({
  has_more: z.boolean(),
  limit: z.number(),
  offset: z.number(),
});

export const PauseReasonsListSchema = z.object({
  pause_reasons: z.array(PauseReasonSchema),
  pause_reasons_pagination: PauseReasonsPaginationSchema,
});
export type PauseReasonsList = z.infer<typeof PauseReasonsListSchema>;

export type ListPauseReasonsParams = {
  limit?: number;
  offset?: number;
  pause_type?: PauseType;
};

export type CreatePauseReasonInput = {
  name: string;
  image_url?: string;
  pause_type: PauseType;
  description?: string;
  requires_description: boolean;
};

export type UpdatePauseReasonInput = {
  name?: string;
  image_url?: string | null;
  pause_type?: PauseType;
  description?: string | null;
  requires_description?: boolean;
};

export type PauseReasonPickerOption = {
  value: PauseReasonId;
  label: string;
  image: string | null;
  imageClassName: string;
  slug: string;
  requires_description: boolean;
  pause_type: PauseType;
  testId: string;
};
