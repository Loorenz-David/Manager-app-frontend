import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  ItemCategoryOptionsPicker,
  useAllItemCategoryPickerOptionsQuery,
} from "@beyo/item-categories";
import { WorkingSectionPickerOptionSchema } from "@beyo/working-sections";
import { LoaderCircle } from "lucide-react";
import { z } from "zod";
import {
  STEP_CATEGORY_FILTER_SHEET_SURFACE_ID,
  STEP_STATE_FILTER_SHEET_SURFACE_ID,
  type StepCategoryFilterSheetSurfaceProps,
} from "@/features/task_steps/surface-ids";

const SectionEnvelope = ApiEnvelopeSchema(
  z.object({ working_section: WorkingSectionPickerOptionSchema }),
);

export function StepCategoryFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { requestCloseMany } = useSurface();
  const { workingSectionId, selectedCategoryIds, onSave } =
    useSurfaceProps<StepCategoryFilterSheetSurfaceProps>();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    selectedCategoryIds ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const sectionQuery = useQuery({
    queryKey: ["worker-step-category-filter", "section", workingSectionId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/v1/working-sections/${workingSectionId}`,
        SectionEnvelope,
      );
      return response.data.working_section;
    },
    enabled: Boolean(workingSectionId),
  });
  const categoriesQuery = useAllItemCategoryPickerOptionsQuery();
  const majorCategories = useMemo(
    () => new Set(
      sectionQuery.data?.item_categories.map((category) => category.major_category) ?? [],
    ),
    [sectionQuery.data],
  );
  const options = useMemo(
    () => (categoriesQuery.data ?? []).filter(
      (category) => majorCategories.has(category.major_category),
    ),
    [categoriesQuery.data, majorCategories],
  );
  const isLoading = sectionQuery.isPending || categoriesQuery.isPending;
  const isError = sectionQuery.isError || categoriesQuery.isError;

  useEffect(() => {
    header?.setTitle("Filter by category");
    header?.setActions(null);
  }, [header]);

  async function handleSave(): Promise<void> {
    if (isSaving) return;
    const allowedIds = new Set(options.map((category) => category.client_id));
    setIsSaving(true);
    setSaveError(false);
    try {
      if (!onSave) throw new Error("Category save callback is unavailable");
      await onSave(selectedIds.filter((id) => allowedIds.has(id)));
      requestCloseMany([
        STEP_CATEGORY_FILTER_SHEET_SURFACE_ID,
        STEP_STATE_FILTER_SHEET_SURFACE_ID,
      ]);
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2" data-testid="step-category-filter-sheet">
      <p className="text-sm text-muted-foreground">Choose any categories to include.</p>
      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading categories...</p>
      ) : isError ? (
        <div className="flex flex-col gap-3 py-4 text-sm">
          <p role="alert">Could not load categories.</p>
          <button type="button" className="rounded-xl border border-border px-4 py-2" onClick={() => {
            void sectionQuery.refetch();
            void categoriesQuery.refetch();
          }}>Retry</button>
        </div>
      ) : majorCategories.size === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No item categories are linked to this working section.</p>
      ) : options.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No categories are available for this section’s major categories.</p>
      ) : (
        <div inert={isSaving}>
          <ItemCategoryOptionsPicker
            mode="multiple"
            categories={options}
            value={selectedIds}
            onValueChange={setSelectedIds}
          />
        </div>
      )}
      {saveError ? (
        <p role="alert" className="text-sm text-destructive">Could not apply the category filter. Try again.</p>
      ) : null}
      <button
        type="button"
        className="w-full rounded-xl bg-primary py-3.5 text-md font-semibold text-card disabled:opacity-50"
        disabled={isLoading || isError || isSaving}
        onClick={() => { void handleSave(); }}
        data-testid="step-category-filter-save"
        aria-busy={isSaving}
      >
        {isSaving ? (
          <span className="inline-flex items-center justify-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            Saving...
          </span>
        ) : "Save"}
      </button>
    </div>
  );
}
