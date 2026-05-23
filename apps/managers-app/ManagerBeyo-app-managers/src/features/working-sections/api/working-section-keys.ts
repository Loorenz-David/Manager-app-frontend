export const workingSectionKeys = {
  all: ['working-sections'] as const,
  lists: () => [...workingSectionKeys.all, 'list'] as const,
  list: (params: { limit?: number; offset?: number } = {}) =>
    [...workingSectionKeys.lists(), params] as const,
};
