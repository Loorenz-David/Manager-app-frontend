type PlacementGroups = [string, ...string[]][];

// Add new entries here as working sections need custom issue tab groupings.
const PLACEMENT_GROUPS_BY_SECTION: Record<string, PlacementGroups> = {
  "structural repair": [["missing", "frame"]],
};

export function getIssuePlacementGroups(
  sectionName: string | null | undefined,
): PlacementGroups | undefined {
  if (!sectionName) return undefined;
  return PLACEMENT_GROUPS_BY_SECTION[sectionName.toLowerCase().trim()];
}
