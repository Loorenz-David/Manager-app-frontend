import { StatePill } from "@beyo/ui";

import {
  STEP_STATE_VARIANT,
  humanizeStepState,
  type StepState,
} from "../../lib/step-state-variants";

const TASK_STEP_DESCRIPTION_RE = /^(.+?) marked (.+?) on working section (.+)$/;

type TaskStepFlowDescriptionProps = {
  description: string;
};

export function TaskStepFlowDescription({
  description,
}: TaskStepFlowDescriptionProps): React.JSX.Element {
  const match = TASK_STEP_DESCRIPTION_RE.exec(description);

  if (!match) {
    return <span>{description}</span>;
  }

  const [, username, rawState, sectionName] = match;
  const variant = STEP_STATE_VARIANT[rawState as StepState] ?? "neutral";

  return (
    <span>
      <span className="font-bold capitalize">{username}</span>
      {" marked "}
      <StatePill
        label={humanizeStepState(rawState)}
        variant={variant}
        style="text"
      />
      {" on working section "}
      <span className="font-bold capitalize">{sectionName}</span>
    </span>
  );
}
