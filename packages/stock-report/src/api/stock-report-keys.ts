import {
  stockReportVersionScope,
  type StockReportBoardBucket,
  type StockReportListFilter,
  type StockReportVersionScope,
  type StockReportVersionState,
} from "../stock-report.types";

/** The key segment for "no major-category filter" — never a real category. */
export const STOCK_REPORT_FILTER_ALL = "all";

/** The mode segment of a list key: the priority board or the missing list. */
export const STOCK_REPORT_LIST_MODE = { board: "board", missing: "missing" } as const;

/** The states segment of a versions-list key when no state filter is sent. */
const ANY_VERSION_STATE = "any";

export const stockReportKeys = {
  all: ["stock-report"] as const,
  lists: () => [...stockReportKeys.all, "items", "list"] as const,
  /**
   * Prefix of every list of one version scope — `"active"` for the board, a
   * version id for a draft — so one version's lists can be restarted or removed
   * without touching the others (plan §3.1).
   */
  versionLists: (scope: StockReportVersionScope) => [...stockReportKeys.lists(), scope] as const,
  /** Prefix of every list of one bucket inside one scope, whatever its filter. */
  bucketLists: (scope: StockReportVersionScope, bucket: StockReportBoardBucket) =>
    [...stockReportKeys.versionLists(scope), bucket] as const,
  list: (bucket: StockReportBoardBucket, filter: StockReportListFilter) =>
    [
      ...stockReportKeys.bucketLists(stockReportVersionScope(filter.versionId), bucket),
      filter.majorCategory ?? STOCK_REPORT_FILTER_ALL,
      filter.missingOnly ? STOCK_REPORT_LIST_MODE.missing : STOCK_REPORT_LIST_MODE.board,
    ] as const,
  /** The version scope a list key was built for — never read it positionally from the end. */
  versionScopeOfListKey: (key: readonly unknown[]) =>
    key[stockReportKeys.lists().length] as StockReportVersionScope | undefined,
  /** The bucket a list key was built for. */
  bucketOfListKey: (key: readonly unknown[]) =>
    key[stockReportKeys.lists().length + 1] as StockReportBoardBucket | undefined,
  /** The major-category segment of a list key: a category or `STOCK_REPORT_FILTER_ALL`. */
  filterOfListKey: (key: readonly unknown[]) =>
    key[stockReportKeys.lists().length + 2] as string | undefined,
  /** Whether a list key belongs to the missing-stock mode (`missing_only=true`). */
  isMissingListKey: (key: readonly unknown[]) =>
    key[stockReportKeys.lists().length + 3] === STOCK_REPORT_LIST_MODE.missing,
  /**
   * One row on its own, for the detail page. There is no single-row endpoint:
   * the entry is seeded from a list when the page opens and kept true by the
   * mutations and socket handlers, so the page stays reactive after its row
   * leaves every list (a fully-missing row leaves the board's default read; a
   * cleared one leaves the missing list).
   *
   * The scope comes **last** so `itemAll(id)` is the prefix of that row's entry
   * in every version — what a deleted row's cleanup removes (projection R5).
   */
  items: () => [...stockReportKeys.all, "items", "detail"] as const,
  itemAll: (stockNeedId: string) => [...stockReportKeys.items(), stockNeedId] as const,
  item: (stockNeedId: string, scope: StockReportVersionScope) =>
    [...stockReportKeys.itemAll(stockNeedId), scope] as const,
  assignments: () => [...stockReportKeys.all, "assignments"] as const,
  assignmentList: (stockNeedId: string) => [...stockReportKeys.assignments(), stockNeedId] as const,
  versions: () => [...stockReportKeys.all, "versions"] as const,
  /**
   * The paginated versions list (v7 §5.9, v10 §5.9). `states` is the state
   * filter the read sends as a comma list (empty = every state); `progressPriority`
   * is the wire form of the progress filter (`high,medium,low` / `all`).
   * Omitted, the key is the prefix every invalidation targets.
   */
  versionList: (scope?: { states: readonly StockReportVersionState[]; progressPriority: string }) =>
    scope === undefined
      ? ([...stockReportKeys.versions(), "list"] as const)
      : ([
          ...stockReportKeys.versions(),
          "list",
          scope.states.length > 0 ? scope.states.join(",") : ANY_VERSION_STATE,
          scope.progressPriority,
        ] as const),
  /** The active version with its live progress (§5.12); `null` before the first one. */
  activeVersion: (progressPriority?: string) =>
    progressPriority === undefined
      ? ([...stockReportKeys.versions(), "active"] as const)
      : ([...stockReportKeys.versions(), "active", progressPriority] as const),
  /** One version by id with its progress (v7 §5.13); the prefix without the filter. */
  version: (versionId: string, progressPriority?: string) =>
    progressPriority === undefined
      ? ([...stockReportKeys.versions(), "one", versionId] as const)
      : ([...stockReportKeys.versions(), "one", versionId, progressPriority] as const),
  /** The hub badge's count of drafts (v10 §5.23). */
  draftCount: () => [...stockReportKeys.versions(), "draft-count"] as const,
  missingSummary: () => [...stockReportKeys.all, "missing-summary"] as const,
};

/**
 * Mutation keys for the version commands (edit, activate, refresh, delete).
 * A page that shows one version reads the mutation cache under this key to
 * tell its own command from a remote change (plan §C.4, projection R11).
 */
export const stockReportMutationKeys = {
  versionCommand: (versionId: string) => [...stockReportKeys.all, "version-command", versionId] as const,
};
