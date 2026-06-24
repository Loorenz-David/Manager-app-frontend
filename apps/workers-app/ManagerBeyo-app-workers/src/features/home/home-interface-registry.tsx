import type { ComponentType } from "react";
import { WorkspaceRole, type WorkspaceRoleValue } from "@beyo/auth";
import { StandardWorkerHomeView } from "./components/variants/StandardWorkerHomeView";
import { WoodWorkerHomeView } from "./components/variants/WoodWorkerHomeView";

type HomeInterfaceKey = WorkspaceRoleValue | "default";

// `default` = null workspace role. Add one line per new interface.
export const homeInterfaceRegistry: Record<HomeInterfaceKey, ComponentType> = {
  default: StandardWorkerHomeView,
  [WorkspaceRole.WoodWorker]: WoodWorkerHomeView,
};
