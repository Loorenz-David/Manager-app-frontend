export const pinKeys = {
  all: ["notification-pins"] as const,
  byMajor: (majorClientEntityId: string) =>
    [...pinKeys.all, "major", majorClientEntityId] as const,
  byEntities: (entityClientIds: readonly string[]) =>
    [...pinKeys.all, "entities", [...entityClientIds].sort()] as const,
};
