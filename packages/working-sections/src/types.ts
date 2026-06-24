import { z } from "zod";

export const WorkingSectionMemberSchema = z.object({
  client_id: z.string(),
  username: z.string(),
  profile_picture: z.string().nullable(),
});
export type WorkingSectionMember = z.infer<typeof WorkingSectionMemberSchema>;

export const WorkingSectionDependencySchema = z.object({
  client_id: z.string(),
  name: z.string(),
});
export type WorkingSectionDependency = z.infer<typeof WorkingSectionDependencySchema>;

export const WorkingSectionItemCategorySchema = z.object({
  client_id: z.string(),
  name: z.string(),
  major_category: z.string(),
});
export type WorkingSectionItemCategory = z.infer<typeof WorkingSectionItemCategorySchema>;

export const WorkingSectionSupportedIssueTypeSchema = z.object({
  client_id: z.string(),
  name: z.string(),
});
export type WorkingSectionSupportedIssueType = z.infer<
  typeof WorkingSectionSupportedIssueTypeSchema
>;

export const WorkingSectionPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  dependencies: z.array(WorkingSectionDependencySchema),
  item_categories: z.array(WorkingSectionItemCategorySchema),
  supported_issue_types: z.array(WorkingSectionSupportedIssueTypeSchema),
  members: z.array(WorkingSectionMemberSchema),
});
export type WorkingSectionPickerOption = z.infer<typeof WorkingSectionPickerOptionSchema>;
export type WorkingSectionOption = WorkingSectionPickerOption;

export const WorkingSectionAssignmentSchema = z.object({
  working_section_id: z.string(),
  assigned_worker_id: z.string().nullable(),
});
export type WorkingSectionAssignment = z.infer<typeof WorkingSectionAssignmentSchema>;

export const WorkingSectionPickerFieldsSchema = z.object({
  working_section_assignments: z.array(WorkingSectionAssignmentSchema).default([]),
  needs_cleaning_assignment: WorkingSectionAssignmentSchema.nullable().optional(),
  oiling_treatment_assignment: WorkingSectionAssignmentSchema.nullable().optional(),
});
export type WorkingSectionPickerFields = z.input<typeof WorkingSectionPickerFieldsSchema>;

export type WorkingSectionShortcutCandidate = {
  workingSectionId: string;
  member: WorkingSectionMember;
};

export type WorkingSectionShortcutConfig = Record<string, string[]>;
