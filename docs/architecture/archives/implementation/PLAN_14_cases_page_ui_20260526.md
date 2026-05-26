# PLAN_14_cases_page_ui_20260526

## Metadata

- Plan ID: `PLAN_14_cases_page_ui_20260526`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T07:29:40Z`
- Related issue/ticket: `—`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Build the full Cases page UI — three-row header, three-section case list (New / Active / Resolving), `CaseCard` component, search bar wiring, unread count display — and register the cases surface (with a stub conversation slide) so tapping a card opens the surface without breaking the app.
- Business/user intent: Users need a scannable list of open and in-progress cases grouped by urgency, with quick access to unread counts and the ability to tap into a conversation.
- Non-goals: The case conversation slide page is a stub in this plan (implemented in PLAN_15). No optimistic mutations, no message fetching.

## Scope

- In scope:
  - `src/features/cases/api/use-list-cases.ts` — new TanStack Query hook
  - `src/features/cases/api/use-unread-counts.ts` — new TanStack Query hook
  - `src/features/cases/controllers/use-cases-view.controller.ts` — full implementation (grouping, search, open-case handler)
  - `src/features/cases/providers/CasesViewProvider.tsx` — update context type
  - `src/features/cases/components/CaseCard.tsx` — new
  - `src/features/cases/components/CasesSectionGroup.tsx` — new
  - `src/features/cases/components/CasesView.tsx` — full implementation
  - `src/features/cases/surfaces.ts` — new (case conversation slide surface ID + stub page reference)
  - `src/pages/cases/CaseConversationSlidePage.tsx` — new stub (just title "Conversation")
  - `src/app/surface-registry.ts` — add `caseSurfaces`
  - `src/features/cases/index.ts` — export `caseSurfaces`

- Out of scope: case detail content, message list, composer, state transitions, info sheet.

- Assumptions:
  - PLAN_13 is implemented. `CaseListCardRaw`, `toCaseListCardViewModel`, API functions, and case-keys all exist.
  - The `SearchBar` primitive at `src/components/primitives/search-bar/SearchBar.tsx` accepts standard input props.
  - The `useSurface` hook and surface system are identical to the tasks feature.
  - `useCurrentUser` or equivalent exists for getting the current user ID; if not, check `src/features/auth` or `src/features/users`.
  - Date formatting uses `date-fns` (already a project dependency).

## Clarifications required

_(none)_

## Acceptance criteria

1. The Cases page renders three sections: New, Active, Resolving with correct counts.
2. Cases created today with state `open` appear only in New (not duplicated in Active).
3. Cases with state `resolving` appear only in Resolving.
4. Tapping a case card opens a slide surface showing the stub conversation page title.
5. Unread count badge displays on cards where unread > 0.
6. The search bar filters the visible list client-side (q param wiring to backend is a future step).
7. `npm run typecheck` passes.

## Runtime validation (Playwright)

### Build rules

- Add or update `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/cases-page.spec.ts`.
- Import `test` and `expect` from `../../fixtures/app-fixture`, never directly from `@playwright/test`.
- Use `data-testid` selectors for all feature-critical cases targets.
- Mock cases/unread endpoints with `page.route()`; this plan does not require a real backend.

### Required test IDs

- `cases-page`
- `cases-header`
- `cases-search-bar`
- `cases-section-new`
- `cases-section-active`
- `cases-section-resolving`
- `case-card-<caseClientId>`

### Required scenarios

1. Cases page renders the three groups with mocked data and the expected cards appear in the correct section.
2. A same-day `open` case appears in `New` and does not also appear in `Active`.
3. Unread badge renders when unread count is greater than zero.
4. Typing in the search input filters visible cards client-side.
5. Tapping a case card opens the stub conversation slide.

### Runtime assertions

- Validate no `console.error` or `pageerror` via the shared fixture.
- Validate the slide surface becomes visible after tapping a card.
- Run at minimum `npm run test:e2e:mobile -- --grep "cases page"` after implementation.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: TanStack Query hook shape, `useQuery` pattern
- `architecture/07_components.md`: feature component conventions
- `architecture/08_hooks.md`: controller and context hook patterns
- `architecture/23_providers.md`: context provider pattern
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: surface ID registration, `useSurface`
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload`
- `architecture/14_styling.md`: Tailwind tokens, design conventions

### File read intent — pattern vs. relational

Permitted reads (what exists, not how to write):
- `src/features/tasks/api/` — query hook examples
- `src/features/tasks/components/TaskListCard.tsx` — how to structure an interactive card
- `src/features/tasks/surfaces.ts` — exact `lazyWithPreload` pattern
- `src/app/surface-registry.ts` — how to add a new feature's surfaces
- `src/components/primitives/search-bar/SearchBar.tsx` — props interface
- `src/features/auth` or `src/hooks/use-current-user*` — to find current user ID hook

## Implementation plan

### Step 1 — Query hooks

**`src/features/cases/api/use-list-cases.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { listCases } from './list-cases';
import { caseKeys } from './case-keys';
import type { ListCasesParams } from '../types';

export function useListCasesQuery(params: ListCasesParams) {
  return useQuery({
    queryKey: caseKeys.list(params),
    queryFn: () => listCases(params),
  });
}
```

**`src/features/cases/api/use-unread-counts.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { getUnreadCounts } from './get-unread-counts';
import { caseKeys } from './case-keys';

export function useUnreadCountsQuery(caseClientIds?: string[]) {
  return useQuery({
    queryKey: caseKeys.unreadCounts(),
    queryFn: () => getUnreadCounts(caseClientIds),
    // unread counts are cheap to refresh
    staleTime: 30_000,
  });
}
```

### Step 2 — Controller

**`src/features/cases/controllers/use-cases-view.controller.ts`**

The controller:
- Fetches `case_state=open,resolving` (both at once, no pagination — the page shows all active cases)
- Groups into New / Active / Resolving
- Holds search query state (client-side filter for now)
- Provides `openCase(caseClientId)` that calls `surface.open(CASE_CONVERSATION_SURFACE_ID, { caseClientId })`

```ts
import { useMemo, useState } from 'react';
import { useSurface } from '@/hooks/use-surface';
import { useListCasesQuery } from '../api/use-list-cases';
import { useUnreadCountsQuery } from '../api/use-unread-counts';
import { toCaseListCardViewModel, type CaseListCardViewModel } from '../types';
import { CASE_CONVERSATION_SURFACE_ID, type CaseConversationSurfaceProps } from '../surfaces';

function isCreatedToday(isoString: string): boolean {
  const created = new Date(isoString);
  const now = new Date();
  return (
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth() &&
    created.getDate() === now.getDate()
  );
}

export type CasesGroup = {
  label: string;
  count: number;
  cases: CaseListCardViewModel[];
};

export type CasesViewController = {
  newGroup: CasesGroup;
  activeGroup: CasesGroup;
  resolvingGroup: CasesGroup;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  openCase: (caseClientId: string) => void;
  unreadCounts: Record<string, number>;
};

export function useCasesViewController(): CasesViewController {
  const surface = useSurface();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: rawCases = [], isPending } = useListCasesQuery({ case_state: 'open,resolving' });
  const { data: unreadCounts = {} } = useUnreadCountsQuery();

  const viewModels = useMemo(() => rawCases.map(toCaseListCardViewModel), [rawCases]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return viewModels;
    const q = searchQuery.toLowerCase();
    return viewModels.filter((c) => {
      const typeLabel = (c.type_label ?? '').toLowerCase();
      const articleNumber = (c.task?.item?.article_number ?? '').toLowerCase();
      const sku = (c.task?.item?.sku ?? '').toLowerCase();
      const username = (c.created_by.username ?? '').toLowerCase();
      return (
        typeLabel.includes(q) ||
        articleNumber.includes(q) ||
        sku.includes(q) ||
        username.includes(q)
      );
    });
  }, [viewModels, searchQuery]);

  // Grouping rules:
  // New = open AND created today
  // Active = open AND NOT created today
  // Resolving = resolving (any date)
  const { newCases, activeCases, resolvingCases } = useMemo(() => {
    const newCases: CaseListCardViewModel[] = [];
    const activeCases: CaseListCardViewModel[] = [];
    const resolvingCases: CaseListCardViewModel[] = [];

    for (const c of filtered) {
      if (c.state === 'resolving') {
        resolvingCases.push(c);
      } else if (c.state === 'open') {
        if (isCreatedToday(c.created_at)) {
          newCases.push(c);
        } else {
          activeCases.push(c);
        }
      }
    }
    return { newCases, activeCases, resolvingCases };
  }, [filtered]);

  function openCase(caseClientId: string) {
    surface.open(CASE_CONVERSATION_SURFACE_ID, {
      caseClientId,
    } satisfies CaseConversationSurfaceProps);
  }

  return {
    newGroup: { label: 'New', count: newCases.length, cases: newCases },
    activeGroup: { label: 'Active', count: activeCases.length, cases: activeCases },
    resolvingGroup: { label: 'Resolving', count: resolvingCases.length, cases: resolvingCases },
    isLoading: isPending,
    searchQuery,
    setSearchQuery,
    openCase,
    unreadCounts,
  };
}
```

### Step 3 — Update provider context type

**`src/features/cases/providers/CasesViewProvider.tsx`**

Update `CasesViewController` import from the updated controller. The provider shell stays the same.

### Step 4 — CaseCard component

**`src/features/cases/components/CaseCard.tsx`**

Layout follows the intention:
```
[Avatar] [Case type label]        [Unread badge]
         [Username • Article/SKU]
                             [Created time] [>]
```

Time formatting rules:
- Created today → time only (`HH:mm`)
- Created this week (within 7 days) → "N days ago"
- Older → `yy-MM-dd HH:mm`

Props:
```ts
type CaseCardProps = {
  caseCard: CaseListCardViewModel;
  unreadCount: number;
  onTap: (caseClientId: string) => void;
};
```

Implementation notes:
- Avatar: if `created_by.profile_picture` is non-null, render `<img>`. Otherwise render a circle with the first letter of `username`.
- Use `date-fns` `format`, `isToday`, `differenceInCalendarDays` for time formatting.
- Bold `ChevronRight` icon on the right.
- Unread badge: small pill with count, hidden if `unreadCount === 0`.
- `data-testid="case-card-{caseCard.client_id}"`
- `data-testid="case-card-unread-badge-{caseCard.client_id}"`
- Card background: `bg-card` rounded, light border.

```tsx
export function CaseCard({ caseCard, unreadCount, onTap }: CaseCardProps): React.JSX.Element {
  const displayTime = formatCaseCreatedTime(caseCard.created_at);
  const articleOrSku = caseCard.task?.item?.article_number ?? caseCard.task?.item?.sku ?? null;

  return (
    <button
      type="button"
      className="flex w-full items-start gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-sm active:opacity-75"
      data-testid={`case-card-${caseCard.client_id}`}
      onClick={() => onTap(caseCard.client_id)}
    >
      {/* Avatar */}
      <div className="mt-0.5 shrink-0">
        {/* 40px avatar circle */}
        <CaseUserAvatar user={caseCard.created_by} size={40} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Row 1: type label + unread badge */}
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {caseCard.type_label ?? 'Case'}
          </span>
          {unreadCount > 0 && (
            <span
              className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground"
              data-testid={`case-card-unread-badge-${caseCard.client_id}`}
            >
              {unreadCount}
            </span>
          )}
        </div>

        {/* Row 2: username • article/sku */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate">{caseCard.created_by.username}</span>
          {articleOrSku ? (
            <>
              <span>•</span>
              <span className="truncate font-medium text-foreground">{articleOrSku}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Right: time + chevron */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">{displayTime}</span>
        <ChevronRight className="size-4 font-bold text-foreground" />
      </div>
    </button>
  );
}
```

Extract `CaseUserAvatar` as a small sub-component in the same file or as a separate file in `components/`:
```tsx
function CaseUserAvatar({ user, size }: { user: CaseUserSnapshot; size: number }): React.JSX.Element {
  if (user.profile_picture) {
    return (
      <img
        alt={user.username}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        src={user.profile_picture}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-primary-foreground"
      style={{ width: size, height: size }}
    >
      {user.username.charAt(0)}
    </div>
  );
}
```

Time formatting helper (put in a `lib/format-case-time.ts` or inline):
```ts
function formatCaseCreatedTime(isoString: string): string {
  const date = new Date(isoString);
  if (isToday(date)) return format(date, 'HH:mm');
  const daysAgo = differenceInCalendarDays(new Date(), date);
  if (daysAgo < 7) return `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
  return format(date, 'yy-MM-dd HH:mm');
}
```

### Step 5 — CasesSectionGroup component

**`src/features/cases/components/CasesSectionGroup.tsx`**

```tsx
type CasesSectionGroupProps = {
  group: CasesGroup;
  unreadCounts: Record<string, number>;
  onTapCase: (caseClientId: string) => void;
};

export function CasesSectionGroup({ group, unreadCounts, onTapCase }: CasesSectionGroupProps): React.JSX.Element | null {
  if (group.cases.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm font-semibold text-foreground">{group.label}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {group.count}
        </span>
      </div>
      {group.cases.map((c) => (
        <CaseCard
          key={c.client_id}
          caseCard={c}
          unreadCount={unreadCounts[c.client_id] ?? 0}
          onTap={onTapCase}
        />
      ))}
    </div>
  );
}
```

### Step 6 — CasesView full implementation

**`src/features/cases/components/CasesView.tsx`**

Three-row header:
- Row 1: "Cases" title (left) + History button (right, `bg-card shadow-md`)
- Row 2: friendly date (`25th December, Thursday` format)
- Row 3: `<SearchBar>` from primitives

Below the header: scrollable list with three section groups.

```tsx
import { useCasesViewContext } from '../providers/CasesViewProvider';
import { SearchBar } from '@/components/primitives/search-bar/SearchBar';
import { CasesSectionGroup } from './CasesSectionGroup';
import { History } from 'lucide-react';
import { format, getDate } from 'date-fns';

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function formatFriendlyDate(date: Date): string {
  const day = getDate(date);
  const ordinal = getOrdinalSuffix(day);
  return `${day}${ordinal} ${format(date, 'MMMM')}, ${format(date, 'EEEE')}`;
}

export function CasesView(): React.JSX.Element {
  const {
    newGroup,
    activeGroup,
    resolvingGroup,
    isLoading,
    searchQuery,
    setSearchQuery,
    openCase,
    unreadCounts,
  } = useCasesViewContext();

  const today = new Date();

  return (
    <div className="flex h-full flex-col bg-background" data-testid="cases-view">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 pb-3 pt-[calc(var(--safe-top)+1rem)]">
        {/* Row 1: title + history */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Cases</h1>
          <button
            type="button"
            aria-label="Case history"
            className="flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-medium shadow-md"
            data-testid="cases-history-button"
            onClick={() => {/* TODO: open history in a later plan */}}
          >
            <History className="size-4" />
            History
          </button>
        </div>

        {/* Row 2: friendly date */}
        <p className="text-sm text-muted-foreground" data-testid="cases-date-label">
          {formatFriendlyDate(today)}
        </p>

        {/* Row 3: search */}
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cases…"
          data-testid="cases-search-bar"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-[calc(var(--safe-bottom)+1rem)]">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-muted"
                data-testid={`cases-skeleton-${i}`}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6" data-testid="cases-section-list">
            <CasesSectionGroup
              group={newGroup}
              unreadCounts={unreadCounts}
              onTapCase={openCase}
            />
            <CasesSectionGroup
              group={activeGroup}
              unreadCounts={unreadCounts}
              onTapCase={openCase}
            />
            <CasesSectionGroup
              group={resolvingGroup}
              unreadCounts={unreadCounts}
              onTapCase={openCase}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 7 — Cases surfaces

**`src/features/cases/surfaces.ts`**

```ts
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';
import { lazyWithPreload } from '@/utils/lazy-with-preload';

export const CASE_CONVERSATION_SURFACE_ID = 'case-conversation-slide';
export const CASE_TASK_INFO_SHEET_SURFACE_ID = 'case-task-info-sheet';

export type CaseConversationSurfaceProps = {
  caseClientId: string;
};

function loadCaseConversationSlidePage() {
  return import('@/pages/cases/CaseConversationSlidePage').then((m) => ({
    default: m.CaseConversationSlidePage,
  }));
}

const caseConversationSlide = lazyWithPreload(loadCaseConversationSlidePage);

export const preloadCaseConversationSurface = caseConversationSlide.preload;

export const caseSurfaces: SurfaceRegistrations = {
  [CASE_CONVERSATION_SURFACE_ID]: {
    surface: 'slide',
    component: caseConversationSlide.Component,
  },
};
```

### Step 8 — Stub conversation page

**`src/pages/cases/CaseConversationSlidePage.tsx`** (stub — fully implemented in PLAN_15)

```tsx
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import type { CaseConversationSurfaceProps } from '@/features/cases/surfaces';

export function CaseConversationSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { caseClientId } = useSurfaceProps<CaseConversationSurfaceProps>();

  // Stub — will be replaced in PLAN_15
  return (
    <div className="flex h-full flex-col items-center justify-center bg-background p-6" data-testid="case-conversation-stub">
      <p className="text-sm text-muted-foreground">Conversation for {caseClientId}</p>
    </div>
  );
}
```

### Step 9 — Register in surface registry

**`src/app/surface-registry.ts`** — add:

```ts
import { caseSurfaces } from '@/features/cases/surfaces';
// ...
export const surfaceRegistry: SurfaceRegistrations = {
  ...caseSurfaces,         // ← add
  ...testSurfaces,
  ...calendarSurfaces,
  // ... rest unchanged
};
```

### Step 10 — Update `src/features/cases/index.ts`

Add exports for surfaces and new components:
```ts
export { caseSurfaces, CASE_CONVERSATION_SURFACE_ID } from './surfaces';
export type { CaseConversationSurfaceProps } from './surfaces';
```

## Risks and mitigations

- Risk: `SearchBar` props API may differ from assumed `value/onChange/placeholder` signature.
  Mitigation: Read `SearchBar.tsx` props interface before implementing and adapt accordingly.

- Risk: `useSurface` hook import path may differ from what's used in tasks.
  Mitigation: Copy the exact import from `features/tasks/components/TaskListCard.tsx`.

- Risk: Date-fns `isToday`/`differenceInCalendarDays` may not be in the installed version.
  Mitigation: Check `package.json` for date-fns version. If v3+, use `import { isToday } from 'date-fns'`. If tree-shaking issues arise, use a simple date comparison.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Visual check: Cases page shows three sections with correct grouping
- Tap a case card: slide surface opens with stub content
- `npm run test -- --grep cases`: any existing tests pass

## Review log

_(none yet)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
