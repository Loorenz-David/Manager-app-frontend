export const issueTypeKeys = {
  all: () => ["issue-types"] as const,
  list: (params: {
    working_section_ids?: string[];
    item_category_ids?: string[];
  }) =>
    [
      "issue-types",
      "list",
      {
        working_section_ids: [...(params.working_section_ids ?? [])].sort(),
        item_category_ids: [...(params.item_category_ids ?? [])].sort(),
      },
    ] as const,
};
