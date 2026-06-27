import { EyebrowLabel, InfoPill } from "@beyo/ui";
import { cn } from "@beyo/lib";

import { useTaskNotesQuery } from "../api/use-task-notes-query";

type TaskNotePillProps = {
  taskId: string;
  onPress: () => void;
  hideWhenEmpty?: boolean;
  labelFormatter?: (count: number) => string;
  testId?: string;
};

export function TaskNotePill({
  taskId,
  onPress,
  hideWhenEmpty = false,
  labelFormatter,
  testId = "task-note-pill",
}: TaskNotePillProps): React.JSX.Element | null {
  const query = useTaskNotesQuery(taskId);
  const count = query.data?.length ?? 0;

  if (hideWhenEmpty && !query.isPending && count === 0) {
    return null;
  }

  const label =
    query.isPending || count === 0
      ? "--"
      : (labelFormatter?.(count) ?? `${count} notes`);

  return (
    <div className="flex flex-col gap-1.5">
      <EyebrowLabel>Notes</EyebrowLabel>
      <button
        className={cn(
          "inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        )}
        data-testid={testId}
        type="button"
        onClick={onPress}
      >
        <InfoPill>{label}</InfoPill>
      </button>
    </div>
  );
}
