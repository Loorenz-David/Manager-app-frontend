import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  WorkspaceWorkingSectionsResponseSchema,
  type WorkspaceWorkingSection,
} from "../types";

const PAGE_SIZE = 200;
/** Backstop so a runaway `has_more` cannot spin the request loop forever. */
const MAX_PAGES = 5;

/**
 * Every non-deleted working section in the workspace, members inlined.
 *
 * The endpoint is offset-paginated with no total count, so pages are walked
 * until `has_more` clears — home shows the full list at once and a workspace
 * has far fewer sections than the 1000-row ceiling this loop allows.
 */
export async function fetchWorkspaceWorkingSections(): Promise<
  WorkspaceWorkingSection[]
> {
  const sections: WorkspaceWorkingSection[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const envelope = await apiClient.get(
      "/api/v1/working-sections",
      ApiEnvelopeSchema(WorkspaceWorkingSectionsResponseSchema),
      { limit: PAGE_SIZE, offset },
    );

    sections.push(...envelope.data.working_sections);

    const pagination = envelope.data.working_sections_pagination;
    if (!pagination.has_more) break;

    offset += pagination.limit;
  }

  return sections;
}
