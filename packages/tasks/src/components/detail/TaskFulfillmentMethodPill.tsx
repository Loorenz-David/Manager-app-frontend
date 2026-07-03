import { EyebrowLabel, InfoPill } from "@beyo/ui";

import type { TaskFulfillmentMethod } from "../../types";

const FULFILLMENT_METHOD_LABEL: Record<TaskFulfillmentMethod, string> = {
  pickup_at_store: "Pickup at store",
  delivery: "Delivery",
};

type TaskFulfillmentMethodPillProps = {
  fulfillmentMethod: TaskFulfillmentMethod | null;
  onPress?: () => void;
};

export function TaskFulfillmentMethodPill({
  fulfillmentMethod,
  onPress,
}: TaskFulfillmentMethodPillProps): React.JSX.Element {
  const label =
    fulfillmentMethod === null ? "—" : FULFILLMENT_METHOD_LABEL[fulfillmentMethod];
  const pill = <InfoPill>{label}</InfoPill>;

  if (onPress) {
    return (
      <div className="flex flex-col gap-1.5">
        <EyebrowLabel>Fulfillment</EyebrowLabel>
        <button
          className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-fulfillment-method-pill"
          type="button"
          onClick={onPress}
        >
          {pill}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <EyebrowLabel>Fulfillment</EyebrowLabel>
      <span data-testid="task-fulfillment-method-pill">{pill}</span>
    </div>
  );
}
