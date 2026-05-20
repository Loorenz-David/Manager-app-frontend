export const accountKeys = {
  all: ['account'] as const,
  profile: () => [...accountKeys.all, 'profile'] as const,
  viewRecords: () => [...accountKeys.all, 'view-records'] as const,
  currentView: () => [...accountKeys.all, 'current-view'] as const,
};
