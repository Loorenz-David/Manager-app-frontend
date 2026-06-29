import type { ComponentType } from "react";
import {
  WorkspaceSpecialization,
  type WorkspaceSpecialization as WorkspaceSpecializationValue,
} from "@beyo/auth";
import { StandardWorkerHomeView } from "./components/variants/StandardWorkerHomeView";
import { WoodWorkerHomeView } from "./components/variants/WoodWorkerHomeView";

type HomeInterfaceKey = WorkspaceSpecializationValue | "default";

// `default` = no workspace specialization. Add one line per new interface.
export const homeInterfaceRegistry: Record<HomeInterfaceKey, ComponentType> = {
  default: StandardWorkerHomeView,
  [WorkspaceSpecialization.WoodWorker]: WoodWorkerHomeView,
  [WorkspaceSpecialization.UpholsteryWorker]: StandardWorkerHomeView,
  [WorkspaceSpecialization.QualityControl]: StandardWorkerHomeView,
};
