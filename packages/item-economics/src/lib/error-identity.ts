/**
 * Item economics errors carry no `code` field. The machine-readable identity
 * is the leading token of `error`, up to the first colon; the sentence after
 * it is display copy that may be reworded without notice.
 *
 *   "ITEM_COST_GROUP_NAME_TAKEN: that name is already used"
 *   → identity "ITEM_COST_GROUP_NAME_TAKEN"
 */
export function parseErrorIdentity(error: string | null | undefined): string | null {
  if (!error) return null;
  const identity = error.split(":")[0]?.trim();
  return identity ? identity : null;
}
