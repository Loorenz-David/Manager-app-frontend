import { z } from 'zod';

import { ClientIdSchema } from '@/lib/client-id';
import type { UserId, WorkingSectionId } from '@/types/common';

export const WorkingSectionSchema = z.object({
  id: z.string().transform((v) => v as WorkingSectionId),
  name: z.string(),
  image: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string().transform((v) => v as UserId).nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  updated_by_id: z.string().transform((v) => v as UserId).nullable(),
});
export type WorkingSection = z.infer<typeof WorkingSectionSchema>;

export const WorkingSectionMemberSchema = z.object({
  user_id: z.string().transform((v) => v as UserId),
  working_section_id: z.string().transform((v) => v as WorkingSectionId),
  assigned_at: z.string().datetime({ offset: true }),
  assigned_by_id: z.string(),
  removed_at: z.string().datetime({ offset: true }).nullable(),
  removed_by_id: z.string().nullable(),
});
export type WorkingSectionMember = z.infer<typeof WorkingSectionMemberSchema>;

export const CreateWorkingSectionInputSchema = z.object({
  client_id: ClientIdSchema,
  name: z.string().min(1, 'Section name is required.').max(255),
  image: z.string().optional(),
});
export type CreateWorkingSectionInput = z.infer<typeof CreateWorkingSectionInputSchema>;

export const UpdateWorkingSectionInputSchema = z.object({
  id: z.string().transform((v) => v as WorkingSectionId),
  name: z.string().min(1, 'Section name is required.').max(255).optional(),
  image: z.string().nullable().optional(),
});
export type UpdateWorkingSectionInput = z.infer<typeof UpdateWorkingSectionInputSchema>;

export type ListWorkingSectionsParams = {
  limit?: number;
  offset?: number;
};

export type WorkingSectionViewModel = WorkingSection & {
  has_image: boolean;
};

export function toWorkingSectionViewModel(
  section: WorkingSection,
): WorkingSectionViewModel {
  return {
    ...section,
    has_image: Boolean(section.image),
  };
}

export function toOptimisticWorkingSection(
  input: CreateWorkingSectionInput,
): WorkingSection {
  return WorkingSectionSchema.parse({
    id: input.client_id,
    name: input.name,
    image: input.image ?? null,
    created_at: new Date().toISOString(),
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  });
}
