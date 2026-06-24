import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";

import type { WorkingSectionMember } from "./types";

export const WORKING_SECTION_WORKER_PICKER_SURFACE_ID =
  "working-section-worker-picker";

export type WorkingSectionWorkerPickerSurfaceProps = {
  sectionName: string;
  members: WorkingSectionMember[];
  currentWorkerId: string | null;
  onSelect: (workerId: string) => void;
};

function loadWorkingSectionWorkerPickerSheetPage() {
  return import("./pages/WorkingSectionWorkerPickerSheetPage").then(
    (module) => ({ default: module.WorkingSectionWorkerPickerSheetPage }),
  );
}

const workingSectionWorkerPicker = lazyWithPreload(
  loadWorkingSectionWorkerPickerSheetPage,
);

export const preloadWorkingSectionWorkerPickerSurface =
  workingSectionWorkerPicker.preload;

export const workingSectionSurfaces: SurfaceRegistrations = {
  [WORKING_SECTION_WORKER_PICKER_SURFACE_ID]: {
    surface: "sheet",
    component: workingSectionWorkerPicker.Component,
  },
};
