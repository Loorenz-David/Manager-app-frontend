/**
 * The backend's refusal reasons are a closed vocabulary. Keep the user-facing
 * copy here so a preview block and an assignment 422 describe the same cause.
 */
const REFUSAL_MESSAGES: Record<string, string> = {
  duplicate_item_in_batch: "The item was included more than once.",
  duplicate_task_in_batch: "The task was included more than once.",
  stock_report_item_not_found: "This stock need is no longer available.",
  task_not_found: "The created task could not be found.",
  item_not_found: "The created item could not be found.",
  item_not_task_primary: "Only the task's primary item can be assigned.",
  already_processed_by_scanner: "This item has already been processed.",
  task_failed_or_cancelled: "A failed or cancelled task cannot be assigned.",
  item_already_assigned: "This item is already assigned to a stock need.",
  item_has_no_category: "This item needs a category before it can be assigned.",
  category_mismatch: "The item category does not match this stock need.",
};

export function stockAssignmentRefusalMessage(
  reason: string | null | undefined,
): string {
  return (
    (reason && REFUSAL_MESSAGES[reason]) ??
    "This item cannot be added to this stock need."
  );
}
