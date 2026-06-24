import { cn } from "@beyo/lib";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import type { WorkingSectionWorkerPickerSurfaceProps } from "../surfaces";

export function WorkingSectionWorkerPickerSheetPage(): React.JSX.Element {
  const { sectionName, members, currentWorkerId, onSelect } =
    useSurfaceProps<WorkingSectionWorkerPickerSurfaceProps>();
  const header = useSurfaceHeader();

  function handleSelect(workerId: string) {
    onSelect?.(workerId);
    header?.requestClose();
  }

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="working-section-worker-picker-sheet">
      <p className="text-base font-semibold text-foreground">{sectionName ?? "Select worker"}</p>

      <div className="flex flex-col gap-2" data-testid="working-section-worker-picker-list">
        {members?.map((member) => (
          <button
            key={member.client_id}
            aria-pressed={member.client_id === currentWorkerId}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              member.client_id === currentWorkerId
                ? "border-primary bg-primary text-card"
                : "border-border bg-card text-foreground",
            )}
            data-testid={`worker-option-${member.client_id}`}
            type="button"
            onClick={() => handleSelect(member.client_id)}
          >
            {member.profile_picture ? (
              <img
                alt=""
                aria-hidden="true"
                className="size-8 shrink-0 rounded-full object-cover"
                src={member.profile_picture}
              />
            ) : (
              <div aria-hidden="true" className="size-8 shrink-0 rounded-full bg-muted" />
            )}
            <span className="truncate text-sm font-medium">{member.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
