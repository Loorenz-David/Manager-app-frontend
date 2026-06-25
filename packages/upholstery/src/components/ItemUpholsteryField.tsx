import { ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@beyo/lib";
import {
  ImagePlaceholder,
  StatePill,
  type StatePillVariant,
  useSurfaceStore,
} from "@beyo/ui";

import { useUpholsteryPickerOptionQuery } from "../api/use-upholstery-picker-option";
import { getUpholsteryImageUrl } from "../image-url";
import { upholsteryKeys } from "../api/upholstery-keys";
import { UPHOLSTERY_PICKER_SURFACE_ID } from "../surfaces";
import type {
  ListUpholsteryPickerParams,
  UpholsteryPickerOption,
} from "../types";
import type { UpholsteryRequirementState } from "../requirement-state";

type ItemUpholsteryFieldProps = {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  requirementState?: UpholsteryRequirementState | null;
  disabled?: boolean;
  testId?: string;
};

const REQUIREMENT_VARIANT: Record<UpholsteryRequirementState, StatePillVariant> = {
  missing_quantity: "warning",
  available: "success",
  needs_ordering: "warning",
  ordered: "active",
  in_use: "active",
  completed: "success",
  failed: "danger",
};

export function ItemUpholsteryField({
  value,
  onChange,
  placeholder = "Select upholstery",
  requirementState = null,
  disabled = false,
  testId,
}: ItemUpholsteryFieldProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const cachedSelection = value
    ? ((
        queryClient.getQueriesData<{
          upholsteries: UpholsteryPickerOption[];
          has_more: boolean;
        }>({
          queryKey: upholsteryKeys.pickerLists(),
        }) as Array<
          [
            readonly [
              "upholsteries",
              "picker",
              "list",
              ListUpholsteryPickerParams,
            ],
            (
              | { upholsteries: UpholsteryPickerOption[]; has_more: boolean }
              | undefined
            ),
          ]
        >
      )
        .flatMap(([, data]) => data?.upholsteries ?? [])
        .find((entry) => entry.client_id === value) ?? null)
    : null;

  const { data: fetchedOption, isPending } = useUpholsteryPickerOptionQuery(
    cachedSelection === null ? value : null,
  );
  const selectedUpholstery = cachedSelection ?? fetchedOption ?? null;
  const thumbnailUrl = getUpholsteryImageUrl(selectedUpholstery?.image_url, {
    width: 64,
    height: 64,
  });
  const hasSelection = value !== null && value !== undefined;
  const isLoadingSelection =
    hasSelection && selectedUpholstery === null && isPending;

  function handlePress(): void {
    useSurfaceStore.getState().open(UPHOLSTERY_PICKER_SURFACE_ID, {
      currentClientId: value,
      onSelect: onChange,
    });
  }

  return (
    <button
      type="button"
      data-testid={testId}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      disabled={disabled}
      onClick={handlePress}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={selectedUpholstery?.name ?? "Selected upholstery"}
          className="size-10 shrink-0 rounded-full object-cover"
          decoding="async"
          loading="lazy"
        />
      ) : selectedUpholstery ? (
        <div className="size-10 shrink-0 overflow-hidden rounded-full">
          <ImagePlaceholder />
        </div>
      ) : null}
      <span className="min-w-0 flex-1">
        {hasSelection ? (
          selectedUpholstery ? (
            <span className="flex min-w-0 flex-col">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {selectedUpholstery.name}
                </span>
                {requirementState ? (
                  <StatePill
                    label={requirementState.replaceAll("_", " ")}
                    variant={REQUIREMENT_VARIANT[requirementState]}
                  />
                ) : null}
              </span>
              {selectedUpholstery.code !== null ? (
                <span className="truncate text-xs text-muted-foreground">
                  {selectedUpholstery.code}
                </span>
              ) : null}
            </span>
          ) : isLoadingSelection ? (
            <span className="truncate text-sm text-muted-foreground">
              Loading upholstery...
            </span>
          ) : (
            <span className="truncate text-sm text-foreground">{value}</span>
          )
        ) : (
          <span className="truncate text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
      </span>
      <ChevronRight
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0",
          hasSelection ? "text-muted-foreground" : "text-icon",
        )}
      />
    </button>
  );
}
