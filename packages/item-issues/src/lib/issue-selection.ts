import type {
  IssueIntensity,
  IssueSelectionDraft,
  IssueType,
  IssueTypeGroup,
  ItemIssue,
} from "../types";

export function buildInitialDraft(
  existingIssues: ItemIssue[],
): IssueSelectionDraft {
  const draft: IssueSelectionDraft = {};

  for (const issue of existingIssues) {
    if (issue.issue_type_id) {
      draft[issue.issue_type_id] = issue.intensity as IssueIntensity;
    }
  }

  return draft;
}

export function cycleIntensity(current: IssueIntensity): IssueIntensity {
  if (current >= 3) {
    return 0;
  }

  return (current + 1) as IssueIntensity;
}

export function groupIssueTypesByPlacement(
  issueTypes: IssueType[],
  itemCategoryId: string,
): IssueTypeGroup[] {
  const groupMap = new Map<string, IssueType[]>();

  for (const issueType of issueTypes) {
    const link = issueType.linked_item_category_ids.find(
      (candidate) => candidate.item_category_id === itemCategoryId,
    );
    if (!link) {
      continue;
    }

    const current = groupMap.get(link.placement_of_issue) ?? [];
    current.push(issueType);
    groupMap.set(link.placement_of_issue, current);
  }

  return Array.from(groupMap.entries()).map(([placement, issueTypes]) => ({
    placement,
    issueTypes,
  }));
}

export function hasIssueTypesForContext(
  issueTypes: IssueType[] | undefined,
  workingSectionId: string,
  itemCategoryId: string | null,
): boolean {
  if (!issueTypes || issueTypes.length === 0 || !itemCategoryId) {
    return false;
  }

  return issueTypes.some(
    (issueType) =>
      issueType.linked_working_section_ids.includes(workingSectionId) &&
      issueType.linked_item_category_ids.some(
        (link) => link.item_category_id === itemCategoryId,
      ),
  );
}
