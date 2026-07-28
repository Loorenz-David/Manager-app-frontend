import { ArrowLeft } from "lucide-react";

import { cn } from "@beyo/lib";
import { WorkingSectionShortcutBar } from "@beyo/ui";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "@beyo/working-sections";

type AvailableSection = {
  client_id: string;
  name: string;
};

type QuickTaskAssignFooterProps = {
  activeStepId: string;
  selectedCount: number;
  selectionMode: "single" | "multi";
  isSelectionValidForSubmit: boolean;
  onClose: () => void;
  onAssign: () => void;
  onBack: () => void;
  onItemContinue?: () => void;
  onSaveAndClose?: () => Promise<void>;
  isAdvancing?: boolean;
  isPatching?: boolean;
  hasItem?: boolean;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  availableSections?: AvailableSection[];
  selectedSectionIds?: string[];
  onShortcutPress?: (matchedIds: string[]) => void;
};

export function QuickTaskAssignFooter({
  activeStepId,
  selectedCount,
  selectionMode,
  isSelectionValidForSubmit,
  onClose,
  onAssign,
  onBack,
  onItemContinue,
  onSaveAndClose,
  isAdvancing = false,
  isPatching = false,
  hasItem = false,
  isSaving = false,
  hasUnsavedChanges = false,
  availableSections = [],
  selectedSectionIds = [],
  onShortcutPress,
}: QuickTaskAssignFooterProps): React.JSX.Element {
  return (
    <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
      {activeStepId === "assign" &&
      availableSections.length > 0 &&
      onShortcutPress ? (
        <div className="px-4 pt-3">
          <WorkingSectionShortcutBar
            shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
            availableSections={availableSections}
            selectedSectionIds={selectedSectionIds}
            onShortcutPress={onShortcutPress}
            animationMode="translate"
            data-testid="quick-task-assign-shortcut-bar"
            className="py-2"
            trackClassName="mt-3"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
        {activeStepId === "list" ? (
          <button
            className="rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
            data-testid="quick-task-list-back-button"
            type="button"
            onClick={onClose}
          >
            Close & Back
          </button>
        ) : (
          <button
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
            data-testid="quick-task-assign-back-button"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
            Back
          </button>
        )}

        {activeStepId === "list" ? (
          <button
            className={cn(
              "rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed",
              isSelectionValidForSubmit
                ? "bg-(--color-primary) text-card"
                : "bg-muted text-muted-foreground opacity-50",
            )}
            data-testid="quick-task-list-assign-button"
            disabled={!isSelectionValidForSubmit}
            type="button"
            onClick={onAssign}
          >
            {selectionMode === "single"
              ? "Continue"
              : selectedCount > 0
                ? `Assign (${selectedCount})`
                : "Assign"}
          </button>
        ) : activeStepId === "item" && onItemContinue ? (
          <button
            className="rounded-2xl bg-(--color-primary) px-5 py-3.5 text-md font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="quick-task-item-continue-button"
            disabled={isAdvancing || isPatching || !hasItem}
            type="button"
            onClick={onItemContinue}
          >
            Continue
          </button>
        ) : activeStepId === "assign" && onSaveAndClose ? (
          <button
            className="rounded-2xl bg-(--color-primary) px-5 py-3.5 text-md font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="quick-task-assign-save-button"
            disabled={
              isSaving || isPatching || !hasUnsavedChanges || !isSelectionValidForSubmit
            }
            type="button"
            onClick={() => {
              void onSaveAndClose();
            }}
          >
            {isSaving || isPatching ? "Saving..." : "Save"}
          </button>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="h-(--safe-bottom,0px) bg-background"
      />
    </div>
  );
}
