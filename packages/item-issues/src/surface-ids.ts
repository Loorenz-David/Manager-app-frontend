export const ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID =
  "item-issue-selection-sheet";

export type ItemIssueSelectionSheetSurfaceProps = {
  itemId: string;
  workingSectionId: string;
  itemCategoryId: string | null;
  stepId?: string | null;
  workerId?: string | null;
  /** Each tuple merges its placements into one tab. Unlisted placements remain as individual tabs. */
  placementGroups?: [string, ...string[]][];
  onSaved?: () => void;
};

export type ItemIssueSurfaceOpeners = {
  openIssueSelection?: () => void;
};
