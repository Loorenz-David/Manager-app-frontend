import { memo } from "react";
import type { ReassignedStepItem } from "@beyo/task-working-sections";
import { useReassignedStepRowController } from "../controllers/use-reassigned-step-row.controller";
import { TaskStepCard } from "./TaskStepCard";

/**
 * The app-owned row injected into the package's reassigned-steps page. It is a
 * surface-injected root with no provider ancestor of its own, so it calls its
 * controller directly rather than reading one from context — every row owns its
 * own transition state, which is exactly why a component type (not a closure
 * bundle) is what the package receives.
 */
export const ReassignedStepRow = memo(function ReassignedStepRow({
  step,
}: {
  step: ReassignedStepItem;
}): React.JSX.Element {
  const {
    card,
    transitioningStepId,
    handleOpenTaskDetail,
    handleOpenTaskActions,
    handleOpenImageViewer,
    handleTransition,
  } = useReassignedStepRowController(step);

  return (
    <TaskStepCard
      card={card}
      transitioningStepId={transitioningStepId}
      onTapActions={handleOpenTaskActions}
      onTapCard={handleOpenTaskDetail}
      onTapImage={handleOpenImageViewer}
      onTransition={handleTransition}
    />
  );
});
