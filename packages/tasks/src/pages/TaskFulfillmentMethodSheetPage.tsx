import { useEffect } from "react";
import { Store as StoreIcon, Truck as TruckIcon } from "lucide-react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker, type BoxPickerOptionType } from "@beyo/ui";

import { useUpdatePostHandling } from "../actions/use-update-post-handling";
import { useGetTaskQuery } from "../api/use-get-task-query";
import type { TaskFulfillmentMethod } from "../types";
import type { TaskFulfillmentMethodSheetSurfaceProps } from "../surface-ids";

const OPTIONS: BoxPickerOptionType<TaskFulfillmentMethod>[] = [
  {
    value: "pickup_at_store",
    label: "Pickup at store",
    icon: StoreIcon,
    testId: "task-fulfillment-method-pickup-at-store-option",
  },
  {
    value: "delivery",
    label: "Delivery",
    icon: TruckIcon,
    testId: "task-fulfillment-method-delivery-option",
  },
];

export function TaskFulfillmentMethodSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskFulfillmentMethodSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updatePostHandling = useUpdatePostHandling();
  const fulfillmentMethod = taskQuery.data?.task.fulfillment_method ?? null;

  useEffect(() => {
    header?.setTitle("Fulfillment");
    header?.setActions(null);
  }, [header]);

  function handleValueChange(value: TaskFulfillmentMethod) {
    if (!taskId) {
      return;
    }

    header?.requestClose();
    updatePostHandling.mutate({
      taskId,
      fulfillment_method: value,
    });
  }

  return (
    <div
      className="px-4 pb-4 pt-2"
      data-testid="task-fulfillment-method-sheet-page"
    >
      <BoxPicker
        mode="single"
        value={fulfillmentMethod}
        options={OPTIONS}
        onValueChange={handleValueChange}
        layout="grid"
        visualVariant="default"
        columns={2}
        data-testid="task-fulfillment-method-picker"
      />
    </div>
  );
}
