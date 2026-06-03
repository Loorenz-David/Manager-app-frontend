import type { TaskFlowRecord } from "../../types";
import { ItemUpholsteryHistoryFlowDescription } from "./ItemUpholsteryHistoryFlowDescription";
import { TaskStepFlowDescription } from "./TaskStepFlowDescription";
import { TaskStepGroupFlowDescription } from "./TaskStepGroupFlowDescription";

type DescriptionRenderer = (description: string) => React.ReactNode;

const FLOW_DESCRIPTION_RENDERERS: Partial<Record<string, DescriptionRenderer>> =
  {
    task_step: (description) => (
      <TaskStepFlowDescription description={description} />
    ),
    task_step_group: (description) => (
      <TaskStepGroupFlowDescription description={description} />
    ),
    "history_record:item_upholstery": (description) => (
      <ItemUpholsteryHistoryFlowDescription description={description} />
    ),
  };

type FlowRecordDescriptionProps = {
  record: TaskFlowRecord;
};

export function FlowRecordDescription({
  record,
}: FlowRecordDescriptionProps): React.JSX.Element {
  if (record.description == null) {
    return <span>{record.type}</span>;
  }

  const compoundKey = `${record.type}:${record.entity_type}`;
  const renderer =
    FLOW_DESCRIPTION_RENDERERS[compoundKey] ??
    FLOW_DESCRIPTION_RENDERERS[record.type];

  if (!renderer) {
    return <span>{record.description}</span>;
  }

  return <>{renderer(record.description)}</>;
}
