export const ITEM_FAST_ISSUE_SHEET_SURFACE_ID = "item-fast-issue-sheet";

export type ItemFastIssueSheetSurfaceProps = {
  taskId: string;
  itemId: string;
  itemCategoryId: string | null;
};

export type TaskIssueSurfaceOpeners = {
  openFastIssueSheet?: () => void;
};
