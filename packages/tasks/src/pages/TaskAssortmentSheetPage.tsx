import { useEffect, useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { FieldLabelRow, NumericKeyboardBar, TextInput } from "@beyo/ui";

import { useUpdatePostHandling } from "../actions/use-update-post-handling";
import { useGetTaskQuery } from "../api/use-get-task-query";
import type { TaskAssortmentSheetSurfaceProps } from "../surface-ids";

export function TaskAssortmentSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskAssortmentSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updatePostHandling = useUpdatePostHandling();
  const assortment = taskQuery.data?.task.assortment ?? "";
  const [value, setValue] = useState(assortment);
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = value != null ? String(value) : "";

  useEffect(() => {
    header?.setTitle("Assortment Position");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    setValue(assortment);
  }, [assortment]);

  function handleSave() {
    if (!taskId) {
      return;
    }

    header?.requestClose();
    updatePostHandling.mutate({
      taskId,
      assortment: value.trim() || null,
    });
  }

  return (
    <div
      className="flex flex-col gap-4 p-6"
      data-testid="task-assortment-sheet-page"
    >
      <div className="flex flex-col gap-1.5">
        <FieldLabelRow
          htmlFor="task-assortment-sheet-input"
          label="Assortment Position"
        />
        <TextInput
          data-testid="task-assortment-sheet-input"
          id="task-assortment-sheet-input"
          type="text"
          placeholder="e.g. A3"
          value={displayValue}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
        />
        <NumericKeyboardBar
          hasFocus={isFocused}
          value={displayValue}
          onChange={setValue}
        />
      </div>
      <button
        type="button"
        className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
        data-testid="task-assortment-save-button"
        disabled={updatePostHandling.isPending || !taskId}
        onClick={handleSave}
      >
        Save
      </button>
    </div>
  );
}
