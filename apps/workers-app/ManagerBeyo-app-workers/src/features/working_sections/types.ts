import { z } from "zod";
import type { WorkingSectionId } from "@beyo/lib";

const WorkingSectionIdSchema = z
  .string()
  .transform((value) => value as WorkingSectionId);

export const TaskStepStateCountsSchema = z.object({
  pending: z.number(),
  working: z.number(),
  paused: z.number(),
  // The backend has begun removing `ended_shift` from the step-state
  // vocabulary and no longer emits this bucket. Defaulting keeps the response
  // parseable both before and during that migration — without it the whole
  // sections list fails validation and home renders its error state.
  ended_shift: z.number().default(0),
  blocked: z.number(),
  completed: z.number(),
  skipped: z.number(),
  failed: z.number(),
});
export type TaskStepStateCounts = z.infer<typeof TaskStepStateCountsSchema>;

export const WorkerWorkingSectionSchema = z.object({
  client_id: WorkingSectionIdSchema,
  name: z.string(),
  image: z.string().nullable(),
  allows_batch_working: z.boolean(),
  allows_shopify_product_modifications: z.boolean(),
  task_steps_counts: TaskStepStateCountsSchema,
  ready_and_pending_count: z.number(),
});
export type WorkerWorkingSection = z.infer<typeof WorkerWorkingSectionSchema>;

export const WorkerWorkingSectionsResponseSchema = z.object({
  working_sections: z.array(WorkerWorkingSectionSchema),
});

/**
 * `GET /api/v1/working-sections` — every section in the workspace, not just the
 * caller's. Home uses it for the "show more" list, so it only models the fields
 * that list needs plus the two flags the steps pane reads once a section is
 * entered. Deliberately a different type from `WorkerWorkingSection`: that one
 * carries the caller's own counts, this one carries the section's members.
 */
export const WorkingSectionMemberSchema = z.object({
  client_id: z.string(),
  username: z.string(),
  profile_picture: z.string().nullable(),
});
export type WorkingSectionMember = z.infer<typeof WorkingSectionMemberSchema>;

export const WorkspaceWorkingSectionSchema = z.object({
  client_id: WorkingSectionIdSchema,
  name: z.string(),
  image: z.string().nullable(),
  allows_batch_working: z.boolean(),
  allows_shopify_product_modifications: z.boolean(),
  members: z.array(WorkingSectionMemberSchema),
});
export type WorkspaceWorkingSection = z.infer<
  typeof WorkspaceWorkingSectionSchema
>;

export const WorkspaceWorkingSectionsResponseSchema = z.object({
  working_sections: z.array(WorkspaceWorkingSectionSchema),
  working_sections_pagination: z.object({
    has_more: z.boolean(),
    limit: z.number(),
    offset: z.number(),
  }),
});

export type WorkingSectionMemberViewModel = {
  userId: string;
  username: string;
  profilePictureUrl: string | null;
};

export type WorkingSectionViewModel = {
  sectionId: WorkingSectionId;
  name: string;
  imageUrl: string | null;
  allowsBatchWorking: boolean;
  allowsShopifyProductModifications: boolean;
  counts: TaskStepStateCounts;
  activeCount: number;
  readyAndPendingCount: number;
  todayDoneCount: number;
  /**
   * Only populated for sections sourced from the workspace list — `/me` does
   * not return members, and the caller's own cards show totals instead.
   */
  members: WorkingSectionMemberViewModel[];
};

const EMPTY_COUNTS: TaskStepStateCounts = {
  pending: 0,
  working: 0,
  paused: 0,
  ended_shift: 0,
  blocked: 0,
  completed: 0,
  skipped: 0,
  failed: 0,
};

export function toWorkingSectionViewModel(
  section: WorkerWorkingSection,
): WorkingSectionViewModel {
  const c = section.task_steps_counts;

  return {
    sectionId: section.client_id,
    name: section.name,
    imageUrl: section.image,
    allowsBatchWorking: section.allows_batch_working,
    allowsShopifyProductModifications: section.allows_shopify_product_modifications,
    counts: c,
    activeCount: section.ready_and_pending_count + c.working + c.paused + c.ended_shift,
    readyAndPendingCount: section.ready_and_pending_count,
    todayDoneCount: c.completed + c.skipped + c.failed,
    members: [],
  };
}

/**
 * Maps a workspace section the caller is *not* a member of. The counts are
 * zeroed rather than omitted so entering the section reuses the exact same
 * steps pane as an own section — the card for these never renders totals,
 * because they would be another worker's numbers, not the caller's.
 */
export function toWorkspaceWorkingSectionViewModel(
  section: WorkspaceWorkingSection,
): WorkingSectionViewModel {
  return {
    sectionId: section.client_id,
    name: section.name,
    imageUrl: section.image,
    allowsBatchWorking: section.allows_batch_working,
    allowsShopifyProductModifications:
      section.allows_shopify_product_modifications,
    counts: EMPTY_COUNTS,
    activeCount: 0,
    readyAndPendingCount: 0,
    todayDoneCount: 0,
    members: section.members.map((member) => ({
      userId: member.client_id,
      username: member.username,
      profilePictureUrl: member.profile_picture,
    })),
  };
}
