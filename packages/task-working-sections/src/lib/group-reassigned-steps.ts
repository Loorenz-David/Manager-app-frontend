import type { ReassignedStepItem, WorkingSectionCompact } from "../types";

export type ReassignedStepGroup = {
  workingSectionId: string;
  name: string;
  imageUrl: string | null;
  orderList: number | null;
  items: ReassignedStepItem[];
};

/**
 * Handoff §7. The server orders items chronologically, not by section, so a
 * section can span pages — group by `working_section_id` over the already
 * flattened, de-duped item array and merge rather than creating a second
 * container.
 *
 * Group order: `order_list` ASC with nulls last, then `name` ASC. Item order
 * inside a group is the server's (newest reassignment first).
 */
export function groupReassignedSteps(
  items: ReassignedStepItem[],
  workingSections: Record<string, WorkingSectionCompact>,
): ReassignedStepGroup[] {
  const groups = new Map<string, ReassignedStepGroup>();

  for (const item of items) {
    const sectionId = item.working_section_id;
    let group = groups.get(sectionId);

    if (group === undefined) {
      // `working_sections[working_section_id]` is guaranteed present for every
      // item on every page — the snapshot is a defensive fallback only.
      const section = workingSections[sectionId];
      group = {
        workingSectionId: sectionId,
        name: section?.name ?? item.working_section_name_snapshot,
        imageUrl: section?.image ?? null,
        orderList: section?.order_list ?? null,
        items: [],
      };
      groups.set(sectionId, group);
    }

    group.items.push(item);
  }

  return [...groups.values()].sort(compareGroups);
}

function compareGroups(
  a: ReassignedStepGroup,
  b: ReassignedStepGroup,
): number {
  if (a.orderList !== b.orderList) {
    if (a.orderList === null) return 1;
    if (b.orderList === null) return -1;
    return a.orderList - b.orderList;
  }

  return a.name.localeCompare(b.name);
}
