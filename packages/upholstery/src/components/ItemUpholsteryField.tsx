import { ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cva } from "class-variance-authority";

import { cn } from "@beyo/lib";
import {
  BackendImage,
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

const itemUpholsteryFieldVariants = cva(
  "relative flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
);

type ItemUpholsteryFieldProps = {
  value?: string | null;
  onChange: (value: string | null) => void;
  /**
   * The item's `can_have_upholstery` flag. `undefined`/`null` means the backend
   * never recorded a choice, which reads the same as `true` — the item may have
   * upholstery, nobody has said either way yet.
   */
  canHaveUpholstery?: boolean | null;
  /**
   * Providing this is what turns the field into the split None/Select control.
   * Callers that cannot write the flag (wrong role, or a form that has no item
   * yet) simply omit it and keep the plain picker row.
   *
   * Emits `false` when None is picked, `null` when None is unpicked ("back to
   * never recorded"), and `true` when an upholstery is selected. Hosts decide
   * what `null` means for their transport: creation forms drop the key from the
   * payload, the detail page sends `true` (the column is non-nullable).
   */
  onCanHaveUpholsteryChange?: (next: boolean | null) => void;
  placeholder?: string;
  requirementState?: UpholsteryRequirementState | null;
  /** Disables the whole control, None segment included. */
  disabled?: boolean;
  /**
   * Disables only the picker half. Sellers can record the flag but cannot
   * create or swap the upholstery link, so the two capabilities are separate.
   */
  selectionDisabled?: boolean;
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
  canHaveUpholstery = null,
  onCanHaveUpholsteryChange,
  placeholder = "Select upholstery",
  requirementState = null,
  disabled = false,
  selectionDisabled = false,
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
  // A linked upholstery always wins the render: an item carrying one cannot
  // meaningfully be "no upholstery", whatever the flag says.
  const isNone = !hasSelection && canHaveUpholstery === false;
  const showNoneSegment = !hasSelection && Boolean(onCanHaveUpholsteryChange);

  function handlePress(): void {
    useSurfaceStore.getState().open(UPHOLSTERY_PICKER_SURFACE_ID, {
      currentClientId: value,
      onSelect: handlePickerSelect,
    });
  }

  function handlePickerSelect(clientId: string | null): void {
    onChange(clientId);
    // Selecting an upholstery is itself an assertion that the item can have
    // one; clearing returns the flag to unrecorded rather than to "None".
    onCanHaveUpholsteryChange?.(clientId === null ? null : true);
  }

  function handleNonePress(): void {
    onCanHaveUpholsteryChange?.(isNone ? null : false);
  }

  const requirementPill = requirementState ? (
    <div className="absolute -top-2 -right-2 z-10">
      <StatePill
        label={requirementState.replaceAll("_", " ")}
        variant={REQUIREMENT_VARIANT[requirementState]}
      />
    </div>
  ) : null;

  if (showNoneSegment) {
    return (
      <div
        className={cn(
          "relative flex w-full items-stretch overflow-hidden rounded-xl border border-border bg-card transition-colors duration-150",
          disabled && "pointer-events-none opacity-50",
        )}
        data-testid={testId}
      >
        {requirementPill}

        <button
          type="button"
          aria-pressed={isNone}
          className={cn(
            "shrink-0 px-5 py-3 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
            isNone
              ? "bg-primary text-card"
              : "border-r border-border text-muted-foreground",
          )}
          data-testid={testId ? `${testId}-none` : undefined}
          disabled={disabled}
          onClick={handleNonePress}
        >
          None
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:opacity-50"
          data-testid={testId ? `${testId}-select` : undefined}
          disabled={disabled || selectionDisabled}
          onClick={handlePress}
        >
          <span
            className={cn(
              "truncate text-sm",
              isNone ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {isNone ? "No upholstery" : placeholder}
          </span>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-icon" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      className={itemUpholsteryFieldVariants()}
      disabled={disabled || selectionDisabled}
      onClick={handlePress}
    >
      {requirementPill}

      {thumbnailUrl ? (
        <BackendImage
          alt={selectedUpholstery?.name ?? "Selected upholstery"}
          className="size-10 shrink-0 rounded-full object-cover"
          fallback={
            <div className="size-10 shrink-0 overflow-hidden rounded-full">
              <ImagePlaceholder />
            </div>
          }
          src={thumbnailUrl}
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
              <span className="min-w-0 text-sm font-medium text-foreground break-words">
                {selectedUpholstery.name}
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
