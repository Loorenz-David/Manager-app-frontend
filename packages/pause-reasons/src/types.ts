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

export const ConfiguredPauseReasonSchema = PauseReasonSchema.extend({
  linked_user_ids: z.array(z.string()),
  linked_working_section_ids: z.array(z.string()),
});
export type ConfiguredPauseReason = z.infer<
  typeof ConfiguredPauseReasonSchema
>;

export const PauseReasonsPaginationSchema = z.object({
  has_more: z.boolean(),
  limit: z.number(),
  offset: z.number(),
});

export const PauseReasonsListSchema = z.object({
  pause_reasons: z.array(ConfiguredPauseReasonSchema),
  pause_reasons_pagination: PauseReasonsPaginationSchema,
});
export type PauseReasonsList = z.infer<typeof PauseReasonsListSchema>;

export type ListPauseReasonsParams = {
  limit?: number;
  offset?: number;
  pause_type?: PauseType;
  user_ids?: string[];
  working_section_ids?: string[];
};

export type CreatePauseReasonInput = {
  name: string;
  image_url?: string;
  pause_type: PauseType;
  description?: string;
  requires_description: boolean;
  linked_user_ids?: string[];
  linked_working_section_ids?: string[];
};

export type UpdatePauseReasonInput = {
  name?: string;
  image_url?: string | null;
  pause_type?: PauseType;
  description?: string | null;
  requires_description?: boolean;
  linked_user_ids?: string[];
  linked_working_section_ids?: string[];
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
