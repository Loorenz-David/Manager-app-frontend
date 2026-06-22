import { useState } from "react";
import { CircleCheck, User } from "lucide-react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker, type BoxPickerOptionType } from "@beyo/ui";

import type { CaseFilterSheetSurfaceProps } from "../surface-ids";
import { DEFAULT_CASES_FILTER, type CasesFilterState } from "../types";

const RESOLVED_OPTIONS: BoxPickerOptionType<"resolved">[] = [
  {
    value: "resolved",
    label: "Resolved",
    icon: CircleCheck,
    testId: "filter-state-resolved",
  },
];

const ONLY_ME_OPTIONS: BoxPickerOptionType<"only_for_me">[] = [
  {
    value: "only_for_me",
    label: "Only for me",
    icon: User,
    testId: "filter-only-for-me",
  },
];

export function CaseFilterSheetRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { currentFilters, onApply } =
    useSurfaceProps<CaseFilterSheetSurfaceProps>();

  const [draft, setDraft] = useState<CasesFilterState>(
    currentFilters ?? DEFAULT_CASES_FILTER,
  );

  function handleApply(): void {
    onApply?.(draft);
    header?.requestClose();
  }

  function handleClear(): void {
    setDraft(DEFAULT_CASES_FILTER);
  }

  const resolvedValue: "resolved"[] = draft.caseStates.includes("resolved")
    ? ["resolved"]
    : [];
  const onlyForMeValue: "only_for_me"[] = draft.onlyForMe
    ? ["only_for_me"]
    : [];

  return (
    <div
      className="flex flex-col gap-6 px-4 pb-6 pt-4"
      data-testid="case-filter-sheet"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Filters</h2>
        <button
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          data-testid="case-filter-clear"
          type="button"
          onClick={handleClear}
        >
          Clear
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Case state</p>
        <BoxPicker
          columns={2}
          data-testid="case-filter-state-picker"
          mode="multiple"
          options={RESOLVED_OPTIONS}
          showDescription={false}
          size="xs"
          value={resolvedValue}
          onValueChange={(caseStates) =>
            setDraft((prev) => ({
              ...prev,
              caseStates: caseStates.includes("resolved")
                ? ["resolved"]
                : DEFAULT_CASES_FILTER.caseStates,
            }))
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Participants
        </p>
        <BoxPicker
          columns={2}
          data-testid="case-filter-participants-picker"
          mode="multiple"
          options={ONLY_ME_OPTIONS}
          showDescription={false}
          size="xs"
          value={onlyForMeValue}
          onValueChange={(vals) =>
            setDraft((prev) => ({
              ...prev,
              onlyForMe: vals.includes("only_for_me"),
            }))
          }
        />
      </div>

      <button
        className="mt-4 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card"
        data-testid="case-filter-apply"
        type="button"
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  );
}
