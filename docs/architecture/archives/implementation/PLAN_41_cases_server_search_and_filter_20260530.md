# PLAN_41_cases_server_search_and_filter_20260530

## Metadata

- Plan ID: `PLAN_41_cases_server_search_and_filter_20260530`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-30T00:00:00Z`
- Last updated at (UTC): `2026-05-30T12:02:35Z`
- Related issue/ticket: `-`
- Intention plan: `N/A — design discussed and approved in conversation`

## Goal and intent

- Goal: Replace client-side search in `CasesView` with server-side `q` filtering; add a filter bottom sheet (case state + "only for me" participant filter) that opens from the `SearchBar` filter button; wire both apps (workers + managers).
- Business/user intent: Workers and managers need to search cases by content/article/SKU (which requires server-side search), and need quick filters for case state and personal case ownership without leaving the cases list view.
- Non-goals: Sort button (remains no-op); History / resolved cases pagination; real-time filter updates; `participants` any-match filter (only `includes_participants` all-match used for "only for me").

## Scope

- In scope:
  - `packages/cases` — `CasesFilterState` type; `CASE_FILTER_SHEET_SURFACE_ID`, `CaseFilterSheetSurfaceProps`, `CasesViewSurfaceOpeners` added to `surface-ids.ts`; new `CaseFilterSheetRouteEntry.tsx` component; controller updates (debounced server-side `q`, filter state, `resolvedGroup`, `openFilters`, `activeFilterCount`); `CasesViewProvider` and `CasesRouteEntry` updated to thread `viewSurfaceOpeners`; `CasesView.tsx` wired to `openFilters` and `activeFilterCount`; `index.ts` exports updated
  - `apps/workers-app` — register `CASE_FILTER_SHEET_SURFACE_ID` in `surfaces.ts`; pass `viewSurfaceOpeners` from `CasesPage`
  - `apps/managers-app` — register `CASE_FILTER_SHEET_SURFACE_ID` in `surfaces.ts`; pass `viewSurfaceOpeners` from `CasesPage`

- Out of scope:
  - Sort functionality (sort button remains visible but no-op)
  - Pagination (current `limit: 50` default applies to filtered results)
  - The "History" button in `CasesView` header (existing no-op, unchanged)
  - `participants` any-match filter (only `includes_participants` used)

- Assumptions:
  - `GET /api/v1/cases` supports `q`, `case_state`, and `includes_participants` — confirmed via `HANDOFF_TO_FRONTEND_list_cases_route_contract_20260530.md` and current `list-cases.ts`
  - `ListCasesParams` already has `q` and `includes_participants` fields — confirmed in `packages/cases/src/types.ts` lines 360–370
  - `list-cases.ts` already passes `q` and `includes_participants` to the API — confirmed lines 17, 21
  - `useAuthStore` and `selectUser` are exported from `@beyo/auth` — confirmed in `use-case-conversation.controller.ts` line 8
  - `lazyWithPreload` and `SurfaceRegistrations` are exported from `@beyo/ui` — confirmed in both `surfaces.ts` files
  - `BoxPicker` is exported from `@beyo/ui` — confirmed in `packages/ui/src/index.ts`

## Clarifications required

None — all design decisions resolved.

## Acceptance criteria

1. Typing in the search bar sends `q` to `GET /api/v1/cases` after a 300 ms debounce; the results shown are server-filtered, not client-filtered.
2. Tapping the filter button opens a bottom sheet with two sections: case state picker and "Only for me" toggle.
3. Case state picker shows `open`, `resolving`, `resolved` as multi-select options; default selection is `["open", "resolving"]`.
4. "Only for me" is a single-option `BoxPicker` (multiple mode); when selected, `includes_participants=<currentUserId>` is sent.
5. Tapping Apply closes the sheet and updates the cases list query.
6. `SearchBar` filter button badge count reflects the number of active non-default filter conditions (0–2).
7. When `resolved` is included in the selected states, a "Resolved" group section appears in the list below the "Resolving" group.
8. Both workers app and managers app cases pages reflect all the above.
9. `npm run typecheck` passes with zero errors in both apps.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: `useQuery`, `queryKey` factory, `staleTime`. The `q` and `includes_participants` params are already in `ListCasesParams` and passed by `list-cases.ts` — no API layer changes needed.
- `architecture/07_components.md`: Component structure for `CaseFilterSheetRouteEntry` — reads surface props, manages local draft state, renders UI.
- `architecture/14_styling.md`: Tailwind utility classes; `cn()` for composition; section headers with `text-sm font-medium text-muted-foreground`.
- `architecture/23_providers.md`: `viewSurfaceOpeners` threads through provider → controller exactly like `surfaceOpeners` already does.
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md`: Filter sheet is a `"sheet"` surface type. Registration uses `lazyWithPreload` in `surfaces.ts`. No `path` field for sheets.
- `architecture/35_shared_packages.md §13`: **This is the primary pattern for the filter opener.** Package declares `CasesViewSurfaceOpeners` and `CaseFilterSheetSurfaceProps`; package provides `CaseFilterSheetRouteEntry`; apps inject `openCaseFilters: (props) => openSurface(CASE_FILTER_SHEET_SURFACE_ID, props)` via `CasesRouteEntry` → `viewSurfaceOpeners`.

### Local extensions loaded

- `architecture/04_api_client_local.md`: Envelope shape `{ ok: true, data: { cases: [...] } }` — already handled by existing `list-cases.ts`.
- `architecture/28_surfaces_local.md`: Active surface types: `slide`, `sheet`, `modal`. `sheet` is correct for the filter panel.

### File read intent — pattern vs. relational

Permitted relational reads before implementation:
- `packages/cases/src/types.ts` — to confirm `ListCasesParams` fields (`q`, `includes_participants`, `case_state`) and `CASE_STATE` values — **done**
- `packages/cases/src/api/list-cases.ts` — to confirm `q` and `includes_participants` are already forwarded to `apiClient.get` — **done**
- `packages/cases/src/surface-ids.ts` — to understand existing surface ID conventions before adding new ones — **done**
- `packages/cases/src/controllers/use-cases-view.controller.ts` — to understand current query wiring and grouping logic before changing it — **done**
- `packages/ui/src/components/primitives/box-picker/box-picker.types.ts` — to confirm `BoxPickerProps` mode/value/onValueChange API — **done**
- `apps/workers-app/.../features/cases/surfaces.ts` — to confirm `lazyWithPreload` / `SurfaceRegistrations` registration pattern — **done**
- `apps/managers-app/.../features/cases/surfaces.ts` — same — **done**

Prohibited (use contracts instead):
- Reading another filter sheet to understand form layout → `07_components.md` + `14_styling.md`
- Reading another query hook to understand TanStack Query pattern → `05_server_state.md`

### Skill selection

- Primary skill: `skills/server-state/SKILL.md` (existing query params extension)
- Secondary skill: `skills/surfaces/SKILL.md` (sheet registration + surfaceOpeners pattern)

## Implementation plan

### Step 1 — `packages/cases/src/types.ts`

Add `CasesFilterState` type after `ListCasesParams`. Do not change `ListCasesParams` — it already has all needed fields.

```ts
export type CasesFilterState = {
  caseStates: (typeof CASE_STATE)[number][];
  onlyForMe: boolean;
};

export const DEFAULT_CASES_FILTER: CasesFilterState = {
  caseStates: ["open", "resolving"],
  onlyForMe: false,
};
```

---

### Step 2 — `packages/cases/src/surface-ids.ts`

Add three new items after `CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID`. Import `CasesFilterState` from `./types`.

```ts
import type { CasesFilterState } from './types';

export const CASE_FILTER_SHEET_SURFACE_ID = "case-filter-sheet";

export type CaseFilterSheetSurfaceProps = {
  currentFilters: CasesFilterState;
  onApply: (filters: CasesFilterState) => void;
};

export type CasesViewSurfaceOpeners = {
  openCaseFilters?: (props: CaseFilterSheetSurfaceProps) => void;
};
```

---

### Step 3 — `packages/cases/src/components/CaseFilterSheetRouteEntry.tsx` (new file)

This is the filter sheet content. It reads surface props, holds draft state, and calls `onApply` on submit. The surface header close button uses `useSurfaceHeader` from `@beyo/hooks`.

```tsx
import { useState } from "react";
import {
  CheckSquare,
  Circle,
  CircleCheck,
  MessageCircle,
  RefreshCw,
  User,
} from "lucide-react";
import { BoxPicker } from "@beyo/ui";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { BoxPickerOption } from "@beyo/ui";
import { CASE_STATE, DEFAULT_CASES_FILTER } from "../types";
import type { CasesFilterState } from "../types";
import type { CaseFilterSheetSurfaceProps } from "../surface-ids";

const STATE_OPTIONS: BoxPickerOption<(typeof CASE_STATE)[number]>[] = [
  { value: "open", label: "Open", icon: Circle, testId: "filter-state-open" },
  {
    value: "resolving",
    label: "Resolving",
    icon: RefreshCw,
    testId: "filter-state-resolving",
  },
  {
    value: "resolved",
    label: "Resolved",
    icon: CircleCheck,
    testId: "filter-state-resolved",
  },
];

const ONLY_ME_OPTIONS: BoxPickerOption<"only_for_me">[] = [
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

  const onlyForMeValue: "only_for_me"[] = draft.onlyForMe ? ["only_for_me"] : [];

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
          columns={3}
          data-testid="case-filter-state-picker"
          mode="multiple"
          options={STATE_OPTIONS}
          showDescription={false}
          size="xs"
          value={draft.caseStates}
          onValueChange={(caseStates) =>
            setDraft((prev) => ({ ...prev, caseStates }))
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Participants</p>
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
        className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
        data-testid="case-filter-apply"
        type="button"
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  );
}
```

**Notes:**
- `BoxPicker mode="multiple"` with a single option is the correct way to implement a boolean toggle using the existing primitive.
- `useSurfaceProps<T>()` returns `Partial<T>` — always guard with `?.` or `?? default`.
- `header?.requestClose()` closes the sheet after applying — graceful when called outside a surface context.
- Icons for state options: pick the closest semantic match from `lucide-react`; the exact icons may be adjusted during review.

---

### Step 4 — `packages/cases/src/controllers/use-cases-view.controller.ts`

**Read the current file in full before editing.** This step is the most extensive. Several changes:

#### 4a — New imports

Add these imports:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore, selectUser } from "@beyo/auth";
import type { UserId } from "@beyo/lib";
import type { CasesViewSurfaceOpeners } from "../surface-ids";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_FILTER_SHEET_SURFACE_ID,
} from "../surface-ids";
import {
  CASE_LINK_ENTITY_TYPE,
  CASE_STATE,
  DEFAULT_CASES_FILTER,
  getCaseTypeName,
  toCaseListCardViewModel,
  type CaseListCardViewModel,
  type CasesFilterState,
} from "../types";
```

Remove the import of `ENABLE_TYPING_STUB` only if `typingByCaseId` stub is also removed (see §4d). Otherwise keep it.

#### 4b — Remove client-side `matchesSearch`

Delete the `matchesSearch()` function entirely — it is replaced by server-side `q`.

#### 4c — Update `CasesViewController` return type

Add `resolvedGroup`, `openFilters`, and `activeFilterCount`; remove `searchQuery`/`setSearchQuery` from the list (they are now `rawSearchQuery`/`setRawSearchQuery` but exposed as `searchQuery`/`setSearchQuery` in the return — the input name is unchanged so `CasesView` needs no edit for the input binding).

```ts
export type CasesViewController = {
  newGroup: CasesGroup;
  activeGroup: CasesGroup;
  resolvingGroup: CasesGroup;
  resolvedGroup: CasesGroup;         // NEW
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  openCase: (caseClientId: CaseId) => void;
  openFilters: () => void;            // NEW
  activeFilterCount: number;          // NEW
  unreadCounts: Record<string, number>;
  typingByCaseId: Record<string, string>;
};
```

#### 4d — Update `CasesViewControllerParams`

```ts
export type CasesViewControllerParams = {
  entityClientId?: string;
  entityType?: (typeof CASE_LINK_ENTITY_TYPE)[number];
  surfaceOpeners?: CaseConversationSurfaceOpeners;
  viewSurfaceOpeners?: CasesViewSurfaceOpeners;    // NEW
};
```

#### 4e — Replace hook body

Replace the inside of `useCasesViewController` with the following logic. Preserve `typingByCaseId` unchanged.

```ts
export function useCasesViewController(
  params: CasesViewControllerParams = {},
): CasesViewController {
  const surface = useSurface();
  const currentUserId = (useAuthStore(selectUser)?.id ?? null) as UserId | null;

  // Raw search query (bound to input)
  const [searchQuery, setSearchQuery] = useState("");
  // Debounced query sent to the API (300 ms)
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Active filter state — default matches current API behaviour (open + resolving)
  const [activeFilters, setActiveFilters] =
    useState<CasesFilterState>(DEFAULT_CASES_FILTER);

  const listQuery = useListCasesQuery({
    case_state:
      activeFilters.caseStates.length > 0
        ? activeFilters.caseStates.join(",")
        : "open,resolving",
    q: debouncedQ || undefined,
    includes_participants:
      activeFilters.onlyForMe && currentUserId ? currentUserId : undefined,
    ...(params.entityClientId
      ? { entity_client_id: params.entityClientId }
      : {}),
    ...(params.entityType ? { entity_type: params.entityType } : {}),
  });

  const viewModels = useMemo(
    () =>
      (listQuery.data ?? [])
        .map(toCaseListCardViewModel)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [listQuery.data],
  );

  const caseClientIds = useMemo(
    () => viewModels.map((item) => item.client_id),
    [viewModels],
  );
  const unreadCountsQuery = useUnreadCountsQuery(caseClientIds);

  // Grouping — server already filters; just partition locally by state
  const groupedCases = useMemo(() => {
    const newCases: CaseListCardViewModel[] = [];
    const activeCases: CaseListCardViewModel[] = [];
    const resolvingCases: CaseListCardViewModel[] = [];
    const resolvedCases: CaseListCardViewModel[] = [];

    for (const card of viewModels) {
      if (card.state === "resolved") {
        resolvedCases.push(card);
        continue;
      }

      if (card.state === "resolving") {
        resolvingCases.push(card);
        continue;
      }

      if (card.state === "open" && isCreatedToday(card.created_at)) {
        newCases.push(card);
        continue;
      }

      if (card.state === "open") {
        activeCases.push(card);
      }
    }

    return { newCases, activeCases, resolvingCases, resolvedCases };
  }, [viewModels]);

  // Active filter count: 1 for non-default states selection, 1 for onlyForMe
  const activeFilterCount = useMemo(() => {
    const defaultSet = new Set(DEFAULT_CASES_FILTER.caseStates);
    const currentSet = new Set(activeFilters.caseStates);
    const statesChanged =
      currentSet.size !== defaultSet.size ||
      [...defaultSet].some((s) => !currentSet.has(s));
    return (statesChanged ? 1 : 0) + (activeFilters.onlyForMe ? 1 : 0);
  }, [activeFilters]);

  function openCase(caseClientId: CaseId): void {
    surface.open(CASE_CONVERSATION_SURFACE_ID, {
      caseClientId,
      surfaceOpeners: params.surfaceOpeners,
    });
  }

  function openFilters(): void {
    params.viewSurfaceOpeners?.openCaseFilters?.({
      currentFilters: activeFilters,
      onApply: setActiveFilters,
    });
  }

  // --- typingByCaseId stub (unchanged) ---
  const typingByCaseId = useMemo<Record<string, string>>(() => {
    if (!ENABLE_TYPING_STUB) {
      return {};
    }
    const firstOpenCase = viewModels.find((card) => card.state === "open");
    if (!firstOpenCase) {
      return {};
    }
    return { [firstOpenCase.client_id]: "Writing" };
  }, [viewModels]);

  return {
    newGroup: {
      label: "New",
      count: groupedCases.newCases.length,
      cases: groupedCases.newCases,
    },
    activeGroup: {
      label: "Active",
      count: groupedCases.activeCases.length,
      cases: groupedCases.activeCases,
    },
    resolvingGroup: {
      label: "Resolving",
      count: groupedCases.resolvingCases.length,
      cases: groupedCases.resolvingCases,
    },
    resolvedGroup: {
      label: "Resolved",
      count: groupedCases.resolvedCases.length,
      cases: groupedCases.resolvedCases,
    },
    isLoading: listQuery.isPending,
    searchQuery,
    setSearchQuery,
    openCase,
    openFilters,
    activeFilterCount,
    unreadCounts: unreadCountsQuery.data ?? {},
    typingByCaseId,
  };
}
```

**Notes:**
- `isCreatedToday` helper is unchanged — keep it.
- `getLocalDateKey` helper is unchanged — keep it.
- `ENABLE_TYPING_STUB` import is unchanged — keep it.
- `CaseConversationSurfaceOpeners` import is still needed for `openCase` — keep it.
- The `useCallback` on `openFilters` is not needed since this function is only called from a UI event handler.

---

### Step 5 — `packages/cases/src/providers/CasesViewProvider.tsx`

Add `viewSurfaceOpeners?: CasesViewSurfaceOpeners` to the `Props` type and thread it to `useCasesViewController`.

```tsx
import type { CasesViewSurfaceOpeners } from "../surface-ids";

type Props = {
  children: ReactNode;
  entityClientId?: string;
  entityType?: (typeof CASE_LINK_ENTITY_TYPE)[number];
  surfaceOpeners?: CaseConversationSurfaceOpeners;
  viewSurfaceOpeners?: CasesViewSurfaceOpeners;   // NEW
};

export function CasesViewProvider({
  children,
  entityClientId,
  entityType,
  surfaceOpeners,
  viewSurfaceOpeners,                              // NEW
}: Props): React.JSX.Element {
  const controller = useCasesViewController({
    entityClientId,
    entityType,
    surfaceOpeners,
    viewSurfaceOpeners,                            // NEW
  });
  return (
    <CasesViewContext.Provider value={controller}>
      {children}
    </CasesViewContext.Provider>
  );
}
```

---

### Step 6 — `packages/cases/src/route-entry.tsx`

Add `viewSurfaceOpeners` prop and forward it to `CasesViewProvider`.

```tsx
import { CasesView } from './components/CasesView';
import { CasesViewProvider } from './providers/CasesViewProvider';
import type { CaseConversationSurfaceOpeners } from './surface-ids';
import type { CasesViewSurfaceOpeners } from './surface-ids';

type CasesRouteEntryProps = {
  surfaceOpeners?: CaseConversationSurfaceOpeners;
  viewSurfaceOpeners?: CasesViewSurfaceOpeners;
};

export function CasesRouteEntry({
  surfaceOpeners,
  viewSurfaceOpeners,
}: CasesRouteEntryProps = {}): React.JSX.Element {
  return (
    <CasesViewProvider
      surfaceOpeners={surfaceOpeners}
      viewSurfaceOpeners={viewSurfaceOpeners}
    >
      <CasesView />
    </CasesViewProvider>
  );
}
```

---

### Step 7 — `packages/cases/src/components/CasesView.tsx`

Two changes:
1. Pass `activeFilterCount={controller.activeFilterCount}` and `onFilterPress={controller.openFilters}` to `SearchBar`.
2. Render `resolvedGroup` below `resolvingGroup` (conditionally — only when `resolvedGroup.count > 0`).

```tsx
<SearchBar
  activeFilterCount={controller.activeFilterCount}   // was 0
  data-testid="cases-search-bar"
  isLoading={controller.isLoading}
  placeholder="Search cases, articles, or people"
  value={controller.searchQuery}
  onChange={controller.setSearchQuery}
  onFilterPress={controller.openFilters}             // was () => {}
  onSortPress={() => {}}
/>
```

Add `resolvedGroup` render after `resolvingGroup`:

```tsx
{controller.resolvedGroup.count > 0 ? (
  <CasesSectionGroup
    group={controller.resolvedGroup}
    sectionTestId="cases-section-resolved"
    unreadCounts={controller.unreadCounts}
    typingByCaseId={controller.typingByCaseId}
    onOpenCase={controller.openCase}
  />
) : null}
```

---

### Step 8 — `packages/cases/src/index.ts`

Add these exports in the appropriate blocks:

In the **types** export block, add:
```ts
export type { CasesFilterState } from './types';
export { DEFAULT_CASES_FILTER } from './types';
```

In the **surface-ids** export block, add:
```ts
export { CASE_FILTER_SHEET_SURFACE_ID } from './surface-ids';
export type { CaseFilterSheetSurfaceProps, CasesViewSurfaceOpeners } from './surface-ids';
```

Add a new **components** export line:
```ts
export { CaseFilterSheetRouteEntry } from './components/CaseFilterSheetRouteEntry';
```

---

### Step 9 — `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts`

Read the current file before editing. Add the filter sheet registration.

Add loader function:
```ts
function loadCaseFilterSheetPage() {
  return import("@beyo/cases").then((module) => ({
    default: module.CaseFilterSheetRouteEntry,
  }));
}
```

Add `lazyWithPreload` call:
```ts
const caseFilterSheet = lazyWithPreload(loadCaseFilterSheetPage);
```

Add to imports from `@beyo/cases`:
```ts
CASE_FILTER_SHEET_SURFACE_ID,
```

Add to `caseSurfaces` registration:
```ts
[CASE_FILTER_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: caseFilterSheet.Component,
},
```

No `path` field — sheets do not use path routing.

---

### Step 10 — `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CasesPage.tsx`

Read the current file. Add `useSurface` from `@beyo/hooks`, import `CASE_FILTER_SHEET_SURFACE_ID` and `CasesViewSurfaceOpeners` from `@beyo/cases`, and pass `viewSurfaceOpeners` to `CasesRouteEntry`.

```tsx
import { lazy, Suspense } from "react";
import { useSurface } from "@beyo/hooks";
import {
  CASE_FILTER_SHEET_SURFACE_ID,
  type CasesViewSurfaceOpeners,
} from "@beyo/cases";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const CasesRouteEntry = lazy(() =>
  import("@beyo/cases").then((module) => ({
    default: module.CasesRouteEntry,
  })),
);

export function CasesPage(): React.JSX.Element {
  const { open: openSurface } = useSurface();

  const viewSurfaceOpeners: CasesViewSurfaceOpeners = {
    openCaseFilters: (props) =>
      openSurface(CASE_FILTER_SHEET_SURFACE_ID, props),
  };

  return (
    <Suspense fallback={<PageSkeleton />}>
      <CasesRouteEntry viewSurfaceOpeners={viewSurfaceOpeners} />
    </Suspense>
  );
}
```

Workers app `CasesPage` does not pass `surfaceOpeners` (no `renderLinkedTaskCard` needed in the workers app) — this is unchanged from before.

---

### Step 11 — `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`

Same change as Step 9, mirrored for the managers app. Read the current file before editing.

Add loader:
```ts
function loadCaseFilterSheetPage() {
  return import("@beyo/cases").then((module) => ({
    default: module.CaseFilterSheetRouteEntry,
  }));
}
```

Add `lazyWithPreload` call:
```ts
const caseFilterSheet = lazyWithPreload(loadCaseFilterSheetPage);
```

Add `CASE_FILTER_SHEET_SURFACE_ID` to the imports from `@beyo/cases`.

Add to `caseSurfaces`:
```ts
[CASE_FILTER_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: caseFilterSheet.Component,
},
```

---

### Step 12 — `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CasesPage.tsx`

Same change as Step 10, keeping the existing `surfaceOpeners` for `renderLinkedTaskCard` and adding `viewSurfaceOpeners`.

```tsx
import { lazy, Suspense } from "react";
import { useSurface } from "@beyo/hooks";
import {
  CASE_FILTER_SHEET_SURFACE_ID,
  type CasesViewSurfaceOpeners,
} from "@beyo/cases";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CaseTaskInfoSheetContent } from "@/components/cases/CaseTaskInfoSheetContent";

const CasesRouteEntry = lazy(() =>
  import("@beyo/cases").then((module) => ({
    default: module.CasesRouteEntry,
  })),
);

export function CasesPage(): React.JSX.Element {
  const { open: openSurface } = useSurface();

  const viewSurfaceOpeners: CasesViewSurfaceOpeners = {
    openCaseFilters: (props) =>
      openSurface(CASE_FILTER_SHEET_SURFACE_ID, props),
  };

  return (
    <Suspense fallback={<PageSkeleton />}>
      <CasesRouteEntry
        surfaceOpeners={{
          renderLinkedTaskCard: (taskId) => (
            <CaseTaskInfoSheetContent taskId={taskId} />
          ),
        }}
        viewSurfaceOpeners={viewSurfaceOpeners}
      />
    </Suspense>
  );
}
```

---

## Risks and mitigations

- Risk: `debouncedQ` changes cause a new `queryKey` every 300 ms even for empty input.
  Mitigation: `q: debouncedQ || undefined` — when `debouncedQ` is `""`, `q` is `undefined` and the key matches the pre-search key exactly. No extra request fires for empty search.

- Risk: `activeFilters.caseStates` being `[]` (user deselects all) might send no `case_state` and return all states including resolved, creating unexpected UX.
  Mitigation: The controller falls back to `"open,resolving"` when `caseStates.length === 0` — preserving current default behavior when nothing is selected.

- Risk: `CaseFilterSheetRouteEntry` runs outside a surface context during unit tests.
  Mitigation: `useSurfaceProps` returns `Partial<T>`; all accesses use optional chaining (`onApply?.()`, `currentFilters ?? DEFAULT_CASES_FILTER`). The component renders safely with no props.

- Risk: `BoxPicker mode="multiple"` with a single "Only for me" option looks visually sparse.
  Mitigation: Use `columns={2}` — the single option occupies one cell in a 2-column grid, leaving one cell empty. This is intentional; the layout matches the visual rhythm of the state picker above. Adjust `columns` during visual review if needed.

- Risk: Both apps create a new `viewSurfaceOpeners` object on every render of `CasesPage`.
  Mitigation: `openCase` in the controller reads `params.viewSurfaceOpeners` directly from closure on each call — not in a dependency array. The object identity change causes no re-renders or stale closures.

## Validation plan

1. `npm run typecheck` in `apps/workers-app/ManagerBeyo-app-workers`: zero errors.
2. `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`: zero errors.
3. Manual smoke (workers app): type "ART-100" in search bar → wait 300 ms → network tab shows `GET /api/v1/cases?q=ART-100&case_state=open%2Cresolving`.
4. Manual smoke: clear search → network tab shows `GET /api/v1/cases?case_state=open%2Cresolving` (no `q`).
5. Manual smoke: tap filter button → bottom sheet opens with state picker and "Only for me" option.
6. Manual smoke: select "Resolved" + Apply → network shows `case_state=open%2Cresolving%2Cresolved`; resolved cases appear in list; filter badge shows `1`.
7. Manual smoke: select "Only for me" + Apply → network shows `includes_participants=<userId>`; filter badge shows `1`.
8. Manual smoke: both filter conditions active → filter badge shows `2`.
9. Manual smoke: tap Clear in sheet + Apply → badge resets to `0`.
10. Repeat smoke tests in managers app.

## Review log

_(empty — awaiting first review)_

## Lifecycle transition

- Current state: `archived`
- Next state: `-`
- Transition owner: `David`
