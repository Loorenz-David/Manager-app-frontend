export const workerWorkingSectionKeys = {
  all: ["worker-working-sections"] as const,
  mine: () => [...workerWorkingSectionKeys.all, "mine"] as const,
  workspace: () => [...workerWorkingSectionKeys.all, "workspace"] as const,
};
