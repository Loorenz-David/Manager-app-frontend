import type { ReactNode } from "react";

import { SurfaceSkeleton } from "@beyo/ui";

import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";

type TaskCreationFormInitializationGateProps = {
  children: ReactNode;
};

export function TaskCreationFormInitializationGate({
  children,
}: TaskCreationFormInitializationGateProps): React.JSX.Element {
  const { isSkuInitializationPending } = useTaskCreationFormContext();

  if (isSkuInitializationPending) {
    return <SurfaceSkeleton surface="slide" />;
  }

  return <>{children}</>;
}
