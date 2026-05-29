import { Tag } from "lucide-react";
import { BoxPicker } from "@beyo/ui";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useListCaseTypesQuery } from "../api/use-list-case-types";
import {
  toCaseTypePickerOption,
  toCaseTypeSelectedDisplay,
} from "../lib/case-type-view-model";
import type { CaseTypePickerSheetSurfaceProps } from "../surface-ids";

export function CaseTypePickerSheetContent(): React.JSX.Element {
  const surfaceHeader = useSurfaceHeader();
  const { entityTypes, currentCaseTypeId, onSelect } =
    useSurfaceProps<CaseTypePickerSheetSurfaceProps>();

  const listParams = {
    entity_type: entityTypes?.join(","),
    limit: 50,
  };

  const {
    data: caseTypes,
    isPending,
    isError,
  } = useListCaseTypesQuery(listParams);

  const options = (caseTypes ?? []).map(toCaseTypePickerOption);

  function handleValueChange(value: string): void {
    const caseType = (caseTypes ?? []).find(
      (ct) => (ct.client_id as string) === value,
    );
    if (!caseType) {
      return;
    }

    onSelect?.(toCaseTypeSelectedDisplay(caseType));
    surfaceHeader?.requestClose();
  }

  if (isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (isError || options.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2">
        <Tag className="size-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {isError ? "Could not load case types." : "No case types available."}
        </span>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <BoxPicker
        mode="single"
        value={currentCaseTypeId ?? null}
        onValueChange={handleValueChange}
        options={options}
        layout="grid"
        visualVariant="default"
        columns={2}
        showIcon
        showLabel
        showDescription={false}
        data-testid="case-type-picker-grid"
      />
    </div>
  );
}
