import { z } from "zod";

export const IssueTypeLinkSchema = z.object({
  item_category_id: z.string(),
  placement_of_issue: z.string(),
});
export type IssueTypeLink = z.infer<typeof IssueTypeLinkSchema>;

export const IssueModeSchema = z.enum(["graded", "switch"]).catch("graded");
export type IssueMode = "graded" | "switch";

export const IssueTypeSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  source: z.string(),
  issue_mode: IssueModeSchema,
  is_shared: z.boolean(),
  linked_working_section_ids: z.array(z.string()),
  linked_item_category_ids: z.array(IssueTypeLinkSchema),
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string().nullable(),
});
export type IssueType = z.infer<typeof IssueTypeSchema>;

export const IssueTypesPaginationSchema = z.object({
  has_more: z.boolean(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const ListIssueTypesResponseSchema = z.object({
  issue_types: z.array(IssueTypeSchema),
  issue_types_pagination: IssueTypesPaginationSchema,
});
export type ListIssueTypesResponse = z.infer<
  typeof ListIssueTypesResponseSchema
>;

export const ItemIssueSchema = z.object({
  client_id: z.string(),
  workspace_id: z.string(),
  item_id: z.string(),
  step_id: z.string().nullable(),
  worker_id: z.string().nullable(),
  working_section_id: z.string().nullable(),
  item_category_id: z.string().nullable(),
  issue_type_id: z.string().nullable(),
  issue_type_snapshot: z.string(),
  issue_mode_snapshot: z.enum(["graded", "switch"]).nullable().catch(null),
  placement_of_issue_snapshot: z.string(),
  intensity: z.number().int().min(1).max(3),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }).nullable(),
});
export type ItemIssue = z.infer<typeof ItemIssueSchema>;

export const ItemIssuesPaginationSchema = z.object({
  items: z.array(ItemIssueSchema),
  limit: z.number().int(),
  offset: z.number().int(),
  has_more: z.boolean(),
});

export const ListItemIssuesResponseSchema = z.object({
  item_issues_pagination: ItemIssuesPaginationSchema,
});
export type ListItemIssuesResponse = z.infer<
  typeof ListItemIssuesResponseSchema
>;

export const CreateItemIssueInputSchema = z.object({
  client_id: z.string().optional(),
  issue_type_id: z.string().nullable(),
  step_id: z.string().nullable(),
  worker_id: z.string().nullable(),
  working_section_id: z.string().nullable(),
  item_category_id: z.string().nullable(),
  issue_type_snapshot: z.string(),
  placement_of_issue_snapshot: z.string(),
  intensity: z.number().int().min(1).max(3),
});
export type CreateItemIssueInput = z.infer<typeof CreateItemIssueInputSchema>;

export const CreateItemIssuesResponseSchema = z.object({
  item_issue_ids: z.array(z.string()),
});
export type CreateItemIssuesResponse = z.infer<
  typeof CreateItemIssuesResponseSchema
>;

export type DeleteItemIssueInput = {
  item_issue_id: string;
};

export type ListIssueTypesParams = {
  working_section_ids?: string[];
  item_category_ids?: string[];
  q?: string;
  limit?: number;
  offset?: number;
};

export type ListItemIssuesParams = {
  working_section_id?: string;
  item_category_id?: string;
  issue_type_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export type IssueIntensity = 0 | 1 | 2 | 3;

export type IssueSelectionDraft = Record<string, IssueIntensity>;

export type IssueTypeGroup = {
  placement: string;
  issueTypes: IssueType[];
};
