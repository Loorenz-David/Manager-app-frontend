import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';
import type { WorkingSectionMember } from './types';

export const WORKING_SECTION_WORKER_PICKER_SURFACE_ID = 'working-section-worker-picker';

export type WorkingSectionWorkerPickerSurfaceProps = {
  sectionName: string;
  members: WorkingSectionMember[];
  currentWorkerId: string | null;
  onSelect: (workerId: string) => void;
};

const preloadedWorkingSectionSurfaces = new Set<string>();

function loadWorkingSectionWorkerPickerSheetPage() {
  return import('@/features/working-sections/pages/WorkingSectionWorkerPickerSheetPage').then(
    (module) => ({ default: module.WorkingSectionWorkerPickerSheetPage }),
  );
}

export function preloadWorkingSectionWorkerPickerSurface(): Promise<unknown> {
  if (preloadedWorkingSectionSurfaces.has(WORKING_SECTION_WORKER_PICKER_SURFACE_ID)) {
    return Promise.resolve();
  }

  preloadedWorkingSectionSurfaces.add(WORKING_SECTION_WORKER_PICKER_SURFACE_ID);
  return loadWorkingSectionWorkerPickerSheetPage();
}

export const workingSectionSurfaces: SurfaceRegistrations = {
  [WORKING_SECTION_WORKER_PICKER_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(loadWorkingSectionWorkerPickerSheetPage),
  },
};
