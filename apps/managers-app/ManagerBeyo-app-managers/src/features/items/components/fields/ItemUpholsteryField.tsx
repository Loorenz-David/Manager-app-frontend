import { useQueryClient } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { ChevronRight } from "lucide-react";

import { ImagePlaceholder } from "@/components/primitives";
import { upholsteryKeys } from "@/features/upholstery/api/upholstery-keys";
import { UPHOLSTERY_PICKER_SLIDE_ID } from "@/features/upholstery/surfaces";
import type {
  ListUpholsteryPickerParams,
  UpholsteryPickerOption,
} from "@/features/upholstery/types";

import { useUpholsteryPickerOptionQuery } from "@/features/upholstery";
import { useSurface } from "@/hooks/use-surface";
import { cn } from "@/lib/utils";
import { StatePill, type StatePillVariant } from "@/components/primitives";
import type { ItemUpholsteryRequirementState } from "@/features/items/types";

const itemUpholsteryFieldVariants = cva(
  "relative flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
);

type ItemUpholsteryFieldProps = {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  requirementState?: ItemUpholsteryRequirementState | null;
  disabled?: boolean;
  testId?: string;
};

const REQUIREMENT_VARIANT: Record<
  ItemUpholsteryRequirementState,
  StatePillVariant
> = {
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
  const surface = useSurface();
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
  const hasSelection = value !== null && value !== undefined;
  const isLoadingSelection =
    hasSelection && selectedUpholstery === null && isPending;

  function handlePress(): void {
    surface.open(UPHOLSTERY_PICKER_SLIDE_ID, {
      currentClientId: value,
      onSelect: onChange,
    });
  }

  return (
    <button
      type="button"
      data-testid={testId}
      className={itemUpholsteryFieldVariants()}
      disabled={disabled}
      onClick={handlePress}
    >
      {requirementState ? (
        <div className="absolute -top-2 -right-2">
          <StatePill
            label={requirementState.replaceAll("_", " ")}
            variant={REQUIREMENT_VARIANT[requirementState]}
          />
        </div>
      ) : null}

      {selectedUpholstery?.image_url ? (
        <img
          src={selectedUpholstery.image_url}
          alt={selectedUpholstery.name}
          className="size-10 shrink-0 rounded-full object-cover"
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
              Loading upholstery…
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
