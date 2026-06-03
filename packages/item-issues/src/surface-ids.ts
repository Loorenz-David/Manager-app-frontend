export const ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID =
  "item-issue-selection-sheet";

export type ItemIssueSelectionSheetSurfaceProps = {
  itemId: string;
  workingSectionId: string;
  itemCategoryId: string | null;
  stepId?: string | null;
  workerId?: string | null;
  onSaved?: () => void;
};

export type ItemIssueSurfaceOpeners = {
  openIssueSelection?: () => void;
};
