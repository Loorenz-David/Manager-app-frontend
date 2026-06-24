import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { cn } from "@beyo/lib";

import { useItemIssuesQuery } from "../api/use-item-issues-query";
import { useIssueTypesQuery } from "../api/use-issue-types-query";
import { useSaveItemIssues } from "../actions/use-save-item-issues";
import {
  buildInitialDraft,
  cycleIntensity,
  groupIssueTypesByPlacement,
} from "../lib/issue-selection";
import type { ItemIssueSelectionSheetSurfaceProps } from "../surface-ids";
import type { IssueIntensity, IssueSelectionDraft, IssueType } from "../types";

function renderIssueBox(
  issueType: IssueType,
  draft: IssueSelectionDraft,
  handleBoxTap: (issueTypeId: string) => void,
): React.JSX.Element {
  const intensity = (draft[issueType.client_id] ?? 0) as IssueIntensity;
  const isSwitchMode = issueType.issue_mode === "switch";
  const fillPercent =
    intensity === 0 ? 0 : intensity === 1 ? 33 : intensity === 2 ? 66 : 100;

  return (
    <button
      key={issueType.client_id}
      className={cn(
        "relative min-h-15 overflow-hidden rounded-2xl border border-dashed border-border shadow-xs p-4 text-left transition-colors duration-200 ease-out",
        isSwitchMode
          ? intensity > 0
            ? "bg-primary text-card"
            : "bg-card text-primary"
          : "bg-card text-primary",
      )}
      data-intensity={intensity}
      data-issue-type-id={issueType.client_id}
      data-testid="issue-type-box"
      type="button"
      onClick={() => handleBoxTap(issueType.client_id)}
    >
      {isSwitchMode ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none relative z-10 text-sm font-medium transition-colors",
          )}
        >
          {issueType.name}
        </span>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-200 ease-out"
            style={{ width: `${fillPercent}%` }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center p-4 text-sm font-medium text-primary"
            style={{ clipPath: `inset(0 0 0 ${fillPercent}%)` }}
          >
            {issueType.name}
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center p-4 text-sm font-medium text-card"
            style={{ clipPath: `inset(0 ${100 - fillPercent}% 0 0)` }}
          >
            {issueType.name}
          </span>
        </>
      )}
      <span className="sr-only">
        {issueType.name}
        {intensity > 0
          ? isSwitchMode
            ? ", selected"
            : `, intensity ${intensity}`
          : ""}
      </span>
    </button>
  );
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir >= 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export function ItemIssueSelectionSheet(): React.JSX.Element | null {
  const header = useSurfaceHeader();
  const { closeTop } = useSurface();
  const {
    itemId,
    workingSectionId,
    itemCategoryId,
    stepId,
    workerId,
    placementGroups,
    onSaved,
  } = useSurfaceProps<ItemIssueSelectionSheetSurfaceProps>();

  const resolvedItemId = itemId ?? "";
  const resolvedWorkingSectionId = workingSectionId ?? "";
  const resolvedItemCategoryId = itemCategoryId ?? null;
  const resolvedStepId = stepId ?? null;
  const resolvedWorkerId = workerId ?? null;

  useEffect(() => {
    header?.setTitle("Item issues");
    header?.setActions(null);
    header?.setHeaderHidden(true);
  }, [header]);

  const issueTypesQuery = useIssueTypesQuery({
    working_section_ids:
      resolvedItemCategoryId && resolvedWorkingSectionId
        ? [resolvedWorkingSectionId]
        : [],
    item_category_ids: resolvedItemCategoryId ? [resolvedItemCategoryId] : [],
  });
  const issuesQuery = useItemIssuesQuery(
    resolvedItemCategoryId ? resolvedItemId : null,
    {
      working_section_id: resolvedWorkingSectionId || undefined,
      item_category_id: resolvedItemCategoryId ?? undefined,
    },
  );
  const { saveIssues, isPending: isSaving } = useSaveItemIssues();

  const [draft, setDraft] = useState<IssueSelectionDraft>({});
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const directionRef = useRef(0);
  const draftInitializedRef = useRef(false);

  useEffect(() => {
    if (draftInitializedRef.current) {
      return;
    }

    const existingIssues = issuesQuery.data?.item_issues_pagination.items ?? [];
    if (issuesQuery.isSuccess || existingIssues.length > 0) {
      setDraft(buildInitialDraft(existingIssues));
      draftInitializedRef.current = true;
    }
  }, [issuesQuery.data, issuesQuery.isSuccess]);

  const groups = useMemo(
    () =>
      resolvedItemCategoryId
        ? groupIssueTypesByPlacement(
            issueTypesQuery.data?.issue_types ?? [],
            resolvedItemCategoryId,
            placementGroups,
          )
        : [],
    [
      issueTypesQuery.data?.issue_types,
      resolvedItemCategoryId,
      placementGroups,
    ],
  );

  useEffect(() => {
    if (activeTabIndex < groups.length) {
      return;
    }

    directionRef.current = 0;
    setActiveTabIndex(0);
  }, [activeTabIndex, groups.length]);

  if (issueTypesQuery.isSuccess && groups.length === 0) {
    return null;
  }

  function closeSheet() {
    if (header) {
      header.requestClose();
      return;
    }

    closeTop();
  }

  function handleTabChange(index: number) {
    directionRef.current = index > activeTabIndex ? 1 : -1;
    setActiveTabIndex(index);
  }

  function handleBoxTap(issueTypeId: string) {
    const issueType = issueTypesQuery.data?.issue_types.find(
      (candidate) => candidate.client_id === issueTypeId,
    );

    setDraft((previousDraft) => {
      const currentIntensity = (previousDraft[issueTypeId] ??
        0) as IssueIntensity;

      return {
        ...previousDraft,
        [issueTypeId]:
          issueType?.issue_mode === "switch"
            ? currentIntensity === 0
              ? 1
              : 0
            : cycleIntensity(currentIntensity),
      };
    });
  }

  async function handleSave() {
    try {
      await saveIssues({
        draft,
        existingIssues: issuesQuery.data?.item_issues_pagination.items ?? [],
        issueTypes: issueTypesQuery.data?.issue_types ?? [],
        context: {
          itemId: resolvedItemId,
          workingSectionId: resolvedWorkingSectionId,
          itemCategoryId: resolvedItemCategoryId,
          stepId: resolvedStepId,
          workerId: resolvedWorkerId,
        },
      });

      onSaved?.();
      closeSheet();
    } catch {
      // Mutation error handling already restores cache and shows feedback.
    }
  }

  const isLoading =
    (issueTypesQuery.isPending && issueTypesQuery.isFetching) ||
    (issuesQuery.isPending && issuesQuery.isFetching);
  const isError = issueTypesQuery.isError || issuesQuery.isError;
  const currentGroup = groups[activeTabIndex] ?? null;
  const currentSharedIssues =
    currentGroup?.issueTypes.filter((t) => t.is_shared) ?? [];
  const currentNonSharedIssues =
    currentGroup?.issueTypes.filter((t) => !t.is_shared) ?? [];
  const currentHasMixed =
    currentSharedIssues.length > 0 && currentNonSharedIssues.length > 0;

  if (!resolvedItemId || !resolvedWorkingSectionId || !resolvedItemCategoryId) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-4 p-4"
        data-testid="item-issue-selection-sheet"
      >
        <div className="h-8 w-40 animate-pulse rounded-full bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col gap-4 p-4"
        data-testid="item-issue-selection-sheet"
      >
        <p className="text-sm text-muted-foreground">
          Could not load issue options.
        </p>
        <button
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
          data-testid="cancel-issues-button"
          type="button"
          onClick={closeSheet}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex max-h-[85vh] flex-col bg-background"
      data-testid="item-issue-selection-sheet"
    >
      <h2 className="px-4 pb-1 pt-5 text-base font-semibold text-primary">
        Item issues
      </h2>

      {groups.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {groups.map((group, index) => (
            <button
              key={group.placement}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                index === activeTabIndex
                  ? "bg-primary text-card"
                  : "bg-secondary text-primary",
              )}
              data-active={String(index === activeTabIndex)}
              data-testid="issue-placement-tab"
              type="button"
              onClick={() => handleTabChange(index)}
            >
              {group.placement}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative overflow-hidden">
        {/* Phantom: all groups stacked in one grid cell so container = tallest group */}
        <div
          aria-hidden
          className="invisible pointer-events-none"
          style={{ display: "grid" }}
        >
          {groups.map((group) => {
            const shared = group.issueTypes.filter((t) => t.is_shared);
            const nonShared = group.issueTypes.filter((t) => !t.is_shared);
            const hasMixed = shared.length > 0 && nonShared.length > 0;
            return (
              <div key={group.placement} style={{ gridArea: "1 / 1" }}>
                <div
                  className={cn(
                    "grid grid-cols-2 gap-3 px-4 pt-4",
                    !hasMixed && "pb-4",
                  )}
                >
                  {hasMixed
                    ? shared.map((issueType) =>
                        renderIssueBox(issueType, draft, handleBoxTap),
                      )
                    : group.issueTypes.map((issueType) =>
                        renderIssueBox(issueType, draft, handleBoxTap),
                      )}
                </div>
                {hasMixed && (
                  <>
                    <div className="mx-4 mt-3 mb-3 h-px bg-border" />
                    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                      {nonShared.map((issueType) =>
                        renderIssueBox(issueType, draft, handleBoxTap),
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Animated layer absolutely overlays the phantom */}
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence
            custom={directionRef.current}
            initial={false}
            mode="wait"
          >
            {currentGroup ? (
              <motion.div
                key={currentGroup.placement}
                animate="center"
                className="relative h-full"
                custom={directionRef.current}
                data-testid="issue-type-box-group"
                exit="exit"
                initial="enter"
                transition={{ duration: 0.2, ease: "easeInOut" }}
                variants={slideVariants}
              >
                <div
                  className={cn(
                    "grid grid-cols-2 gap-3 px-4 pt-4",
                    !currentHasMixed && "pb-4",
                  )}
                >
                  {currentHasMixed
                    ? currentSharedIssues.map((issueType) =>
                        renderIssueBox(issueType, draft, handleBoxTap),
                      )
                    : currentGroup.issueTypes.map((issueType) =>
                        renderIssueBox(issueType, draft, handleBoxTap),
                      )}
                </div>
                {currentHasMixed && (
                  <div className="absolute inset-x-4 bottom-4">
                    <div className="mb-3 h-px bg-border" />
                    <div className="grid grid-cols-2 gap-3">
                      {currentNonSharedIssues.map((issueType) =>
                        renderIssueBox(issueType, draft, handleBoxTap),
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-background">
      <div className="flex gap-3 px-4 pb-4 pt-3">
        <button
          className="flex-1 rounded-xl border border-light-border bg-card px-4 py-3 text-sm font-semibold shadow-sm text-foreground disabled:opacity-50"
          data-testid="cancel-issues-button"
          disabled={isSaving}
          type="button"
          onClick={closeSheet}
        >
          Cancel
        </button>
        <button
          className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold shadow-sm text-card disabled:opacity-50"
          data-testid="save-issues-button"
          disabled={isSaving}
          type="button"
          onClick={() => {
            void handleSave();
          }}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
      </div>
    </div>
  );
}
