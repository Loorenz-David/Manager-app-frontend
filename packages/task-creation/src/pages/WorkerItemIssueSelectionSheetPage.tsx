import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  cycleIntensity,
  groupIssueTypesByPlacement,
  useIssueTypesQuery,
  type IssueIntensity,
  type IssueType,
} from "@beyo/item-issues";
import { cn } from "@beyo/lib";

import type { WorkerItemIssueSelectionDraft } from "../types";

type WorkerItemIssueSelectionSheetSurfaceProps = {
  itemCategoryId: string | null;
  workingSectionId: string | null;
  draft: WorkerItemIssueSelectionDraft;
  placementGroups?: [string, ...string[]][];
  onSave: (draft: WorkerItemIssueSelectionDraft) => void;
};

function renderIssueBox(
  issueType: IssueType,
  draft: WorkerItemIssueSelectionDraft,
  handleBoxTap: (issueTypeId: string) => void,
): React.JSX.Element {
  const intensity = ((draft ?? {})[issueType.client_id] ?? 0) as IssueIntensity;
  const isSwitchMode = issueType.issue_mode === "switch";
  const fillPercent =
    intensity === 0 ? 0 : intensity === 1 ? 33 : intensity === 2 ? 66 : 100;

  return (
    <button
      key={issueType.client_id}
      className={cn(
        "relative min-h-15 overflow-hidden rounded-2xl border border-dashed border-border p-4 text-left shadow-xs transition-colors duration-200 ease-out",
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
        <span className="pointer-events-none relative z-10 text-sm font-medium transition-colors">
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

export function WorkerItemIssueSelectionSheetPage(): React.JSX.Element | null {
  const header = useSurfaceHeader();
  const { closeTop } = useSurface();
  const {
    itemCategoryId,
    workingSectionId,
    draft,
    placementGroups,
    onSave,
  } = useSurfaceProps<WorkerItemIssueSelectionSheetSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Item issues");
    header?.setActions(null);
    header?.setHeaderHidden(true);
  }, [header]);

  const issueTypesQuery = useIssueTypesQuery(
    {
      working_section_ids: workingSectionId ? [workingSectionId] : [],
      item_category_ids: itemCategoryId ? [itemCategoryId] : [],
    },
  );

  const [localDraft, setLocalDraft] = useState<WorkerItemIssueSelectionDraft>(
    draft ?? {},
  );
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const directionRef = useRef(0);

  useEffect(() => {
    setLocalDraft(draft ?? {});
  }, [draft]);

  const groups = useMemo(
    () =>
      itemCategoryId
        ? groupIssueTypesByPlacement(
            issueTypesQuery.data?.issue_types ?? [],
            itemCategoryId,
            placementGroups,
          )
        : [],
    [issueTypesQuery.data?.issue_types, itemCategoryId, placementGroups],
  );

  useEffect(() => {
    if (activeTabIndex < groups.length) {
      return;
    }

    directionRef.current = 0;
    setActiveTabIndex(0);
  }, [activeTabIndex, groups.length]);

  function closeSheet(): void {
    if (header) {
      header.requestClose();
      return;
    }

    closeTop();
  }

  function handleTabChange(index: number): void {
    directionRef.current = index > activeTabIndex ? 1 : -1;
    setActiveTabIndex(index);
  }

  function handleBoxTap(issueTypeId: string): void {
    const issueType = issueTypesQuery.data?.issue_types.find(
      (candidate) => candidate.client_id === issueTypeId,
    );

    setLocalDraft((previousDraft) => {
      const nextDraft = previousDraft ?? {};
      const currentIntensity = (nextDraft[issueTypeId] ?? 0) as IssueIntensity;

      return {
        ...nextDraft,
        [issueTypeId]:
          issueType?.issue_mode === "switch"
            ? currentIntensity === 0
              ? 1
              : 0
            : cycleIntensity(currentIntensity),
      };
    });
  }

  const isLoading = issueTypesQuery.isPending && issueTypesQuery.isFetching;
  const isError = issueTypesQuery.isError;
  const currentGroup = groups[activeTabIndex] ?? null;
  const currentSharedIssues =
    currentGroup?.issueTypes.filter((issueType) => issueType.is_shared) ?? [];
  const currentNonSharedIssues =
    currentGroup?.issueTypes.filter((issueType) => !issueType.is_shared) ?? [];
  const currentHasMixed =
    currentSharedIssues.length > 0 && currentNonSharedIssues.length > 0;

  if (!itemCategoryId || !workingSectionId) {
    return (
      <div
        className="flex flex-col gap-4 p-4"
        data-testid="worker-item-issue-selection-sheet"
      >
        <p className="text-sm text-muted-foreground">
          Select a category before adding issues.
        </p>
        <button
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
          type="button"
          onClick={closeSheet}
        >
          Close
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-4 p-4"
        data-testid="worker-item-issue-selection-sheet"
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
        data-testid="worker-item-issue-selection-sheet"
      >
        <p className="text-sm text-muted-foreground">
          Could not load issue options.
        </p>
        <button
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
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
      data-testid="worker-item-issue-selection-sheet"
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
        <div
          aria-hidden="true"
          className="invisible pointer-events-none"
          style={{ display: "grid" }}
        >
          {groups.map((group) => {
            const shared = group.issueTypes.filter((issueType) => issueType.is_shared);
            const nonShared = group.issueTypes.filter(
              (issueType) => !issueType.is_shared,
            );
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
                        renderIssueBox(issueType, localDraft, handleBoxTap),
                      )
                    : group.issueTypes.map((issueType) =>
                        renderIssueBox(issueType, localDraft, handleBoxTap),
                      )}
                </div>
                {hasMixed ? (
                  <>
                    <div className="mx-4 mb-3 mt-3 h-px bg-border" />
                    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                      {nonShared.map((issueType) =>
                        renderIssueBox(issueType, localDraft, handleBoxTap),
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>

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
                        renderIssueBox(issueType, localDraft, handleBoxTap),
                      )
                    : currentGroup.issueTypes.map((issueType) =>
                        renderIssueBox(issueType, localDraft, handleBoxTap),
                      )}
                </div>
                {currentHasMixed ? (
                  <div className="absolute inset-x-4 bottom-4">
                    <div className="mb-3 h-px bg-border" />
                    <div className="grid grid-cols-2 gap-3">
                      {currentNonSharedIssues.map((issueType) =>
                        renderIssueBox(issueType, localDraft, handleBoxTap),
                      )}
                    </div>
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-background">
      <div className="flex gap-3 px-4 pb-4 pt-3">
        <button
          className="flex-1 rounded-xl border border-light-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm"
          type="button"
          onClick={closeSheet}
        >
          Cancel
        </button>
        <button
          className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card shadow-sm"
          data-testid="worker-save-issues-button"
          type="button"
          onClick={() => {
            onSave?.(localDraft ?? {});
            closeSheet();
          }}
        >
          Save
        </button>
      </div>
      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
      </div>
    </div>
  );
}
