# PLAN_cases_refactor_pills_20260622

## Metadata

- Plan ID: `PLAN_cases_refactor_pills_20260622`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-22T00:00:00Z`
- Last updated at (UTC): `2026-06-22T12:02:34Z`
- Related issue/ticket: Cases main page refactor - pill-based state filtering
- Intention plan: `docs/architecture/under_construction/intention/upholstery_changes.txt` (cases section)

## Goal and intent

- **Goal**: Refactor the CasesView from a three-section layout (new, active, resolving) into a single unified list with quick-filter pills below the search bar, matching the TasksView pattern. Unify the UI layout, improve discoverability of case states, and enable concurrent data loading for responsive interactions.
- **Business/user intent**: Users should be able to quickly switch between case states (unread, active, in-progress) via horizontal pills without waiting for data to load. The "unread" view provides a shortcut to cases with new messages from both active and in-progress states. The interface aligns with the established tasks page pattern, reducing cognitive load.
- **Non-goals**: 
  - Creating new API endpoints
  - Changing case state enum values on the backend (only UI label changes: "resolving" → "in-progress" in presentation)
  - Implementing real-time filtering updates
  - Adding new case states

## Scope

- **In scope**:
  - Refactor `CasesView.tsx` to use absolute positioning, scroll visibility, and pull-to-refresh with offset body (matching TasksView)
  - Create new `CasesHeader.tsx` component with searchbar + quick-filter pills (unread, active, in-progress)
  - Update `useCasesViewController` controller to track active filter state, direction for slide animation, and concurrent queries
  - Implement "unread" filter as client-side aggregation of active + in-progress cases with unread messages
  - Update `CaseConversationHeader.tsx` to show "In-Progress" button label instead of "Resolving"
  - Add slide transition animation on pill selection (using Framer Motion, direction-aware)
  - Update `CaseFilterSheet` to remove open/resolving filter options, keep resolved + for-me only
  - When resolved filter is selected, hide pills and show only resolved cases
  - Concurrent API calls for active and in-progress cases on page load (both queries ready when user taps pill)
  - Date label stays above searchbar, responds to scroll visibility (hides/shows with pills)
  - Search always filters by open and resolving states; resolved state requires explicit filter selection

- **Out of scope**:
  - Migrating filter logic to URL query parameters
  - Implementing infinite scroll pagination within pill views
  - Real-time typing indicator updates for the new layout
  - Testing in legacy browsers
  - Changing the case state enum names in backend schemas

- **Assumptions**:
  - `useScrollVisibility` hook is available and proven in TasksView context
  - Framer Motion is available and configured for transitions (already used in upholstery picker)
  - BoxPicker component can be reused for single-select pills with visual="pill" variant
  - Current `useListCasesQuery` accepts case_state as comma-separated string
  - Unread counts are fetched via `useUnreadCountsQuery` (already wired in current controller)
  - All target files exist and are editable
  - CasesViewProvider/Controller wiring is not changing; refactor is contained within component and controller behavior

## Clarifications required

- [ ] **Unread counts logic**: Should the "unread" pill show only cases where the current user has unread *messages* (last_message_seq > last_read_message_seq), or unread *notifications*? — Affects how we filter the merged active + in-progress list; blocks accurate unread count display.
- [ ] **Search with resolved filter**: When the user has the "resolved" filter enabled, should search still apply only to open + resolving states, or search across all states? — Affects how search query interacts with resolved filter; blocks search UX decision.
- [ ] **Scroll offset on resolved filter**: When "resolved" filter is active and pills are hidden, should the scroll container still have the same `pt-44` offset as TasksView, or should it be reduced since the header is collapsed? — Affects visual spacing; blocks layout finalization.

## Acceptance criteria

1. CasesView renders a single list of cases with horizontal filter pills below the searchbar (unread, active, in-progress)
2. Exactly one pill is selected at a time; selecting a pill updates the visible case list
3. On page load, API queries for active and in-progress cases are issued concurrently so data is ready when user taps the pill
4. "Unread" pill shows cases from both active and in-progress queries that have unread messages for the current user
5. Slide transition animates the list when switching pills, with direction based on pill position (left/right)
6. Date label hides/shows in sync with pills and searchbar as user scrolls (scroll visibility pattern)
7. Search bar always searches across open + resolving states unless "resolved" filter is selected
8. CaseConversationHeader displays "In-Progress" button label instead of "Resolving" for cases in the resolving state
9. Filter sheet no longer displays open/resolving filter options; only resolved + for-me toggles remain
10. When "resolved" filter is selected, pill row is hidden and only resolved cases are shown
11. Pull-to-refresh works with proper scroll container offset and indicator positioning
12. All TypeScript types compile with zero errors
13. Playwright e2e tests pass on mobile and desktop for case filtering and pill interaction flows
14. No regression in case detail view, messaging, or other downstream features

## Contracts and skills

### Contracts loaded

Read order (canonical first, then local extension):
- `../architecture/01_architecture.md` (baseline)
- `../architecture/01_architecture_local.md` (app-specific route entry pattern)
- `../architecture/05_server_state.md` (baseline)
- `../architecture/06_client_state.md` (baseline)
- `../architecture/07_components.md` (baseline)
- `../architecture/08_hooks.md` (baseline — action hooks, optimistic updates, cache snapshot)
- `../architecture/13_errors.md` (baseline)
- `../architecture/15_feature_structure.md` (baseline)
- `../architecture/27_responsive.md` (baseline — breakpoint-driven layout patterns)
- `../architecture/28_surfaces.md` (baseline)
- `../architecture/28_surfaces_local.md` (app-specific: active surface types are slide/sheet/modal, drawer excluded)
- `../architecture/31_animations.md` (baseline — Framer Motion patterns)
- `../architecture/36_scroll_visibility.md` (baseline — hide-on-scroll pattern, scroll-driven visibility)

**Rationale**: 
- Core contracts establish the layer architecture and data flow patterns
- `07_components.md` + `08_hooks.md` ensure the controller/component split is correct
- `27_responsive.md` handles breakpoint-aware layout (mobile vs. desktop)
- `28_surfaces.md` + `28_surfaces_local.md` define surface patterns (filter sheet is a surface)
- `31_animations.md` provides Framer Motion transition patterns (slide animation on pill change)
- `36_scroll_visibility.md` is mandatory here — scroll visibility + hide-on-scroll are the primary UX patterns for this refactor

### Local extensions loaded

- `../architecture/01_architecture_local.md`: App-specific primary tab route entry pattern (affects how CasesView is mounted)
- `../architecture/28_surfaces_local.md`: Active surface types (sheet for filter, slide for case detail) — no drawer

### File read intent — pattern vs. relational

**Prohibited pattern reads** (contract defines these):
- Reading another view controller to understand case grouping → `08_hooks.md` covers controller shape
- Reading another header component to understand BoxPicker setup → `28_surfaces_local.md` + existing task/upholstery examples are relational reads

**Permitted relational reads** (understanding what exists):
- `src/features/tasks/components/TasksView.tsx` and `TasksHeader.tsx` — proven reference for absolute positioning + scroll visibility + pills
- `src/features/upholstery/components/UpholsteryPickerSlidePage.tsx` and `UpholsteryPickerHeader.tsx` — proven reference for slide animation + direction tracking
- `packages/cases/src/types.ts` — establish actual case state enum values and filter state shape
- `packages/cases/src/controllers/use-cases-view.controller.ts` (current) — verify existing query shapes and group logic before refactoring
- `packages/cases/src/api/use-list-cases.ts` — verify query parameters and response shape
- `packages/cases/src/api/use-unread-counts.ts` — verify unread count data structure
- Cases filter sheet implementation (if it exists) — understand current filter UI before modifying

### Skill selection

- Primary skill: Architecture + Component Refactor
- Trigger terms: "absolute positioning", "scroll visibility", "pill animation", "concurrent queries", "controller state"
- Excluded alternatives: "feature workflow" skill (this is refactor of existing feature, not new feature build)

## Domain grounding

Domain schemas consulted:
- `packages/cases/src/types.ts`: Established case state enum is `["open", "resolving", "resolved"]`; `CASE_STATE` type; `CasesFilterState` has `caseStates: (typeof CASE_STATE)[number][]` and `onlyForMe: boolean`; `DEFAULT_CASES_FILTER = { caseStates: ["open", "resolving"], onlyForMe: true }`
- Current state labels: "Open" (API: "open"), "Active" (UI grouping of old "open"), "Resolving" (API: "resolving" → display as "In-Progress"), "Resolved" (API: "resolved")

**Entity names and field names for this plan**:
- Case states: `open`, `resolving`, `resolved` (backend enum; never change)
- Pill display names: "Unread" (client-side), "Active" (state=open, created > today), "In-Progress" (state=resolving)
- Controller field: `activeFilter` (type: `"unread" | "active" | "in-progress"`)
- API: `case_state` param accepts comma-separated values; search uses `q` param
- Filter state: `caseStates: ["open", "resolving"]` (default); `caseStates: ["resolved"]` (when resolved filter selected)

## Implementation plan

### Phase 1: Controller Refactoring (useCasesViewController)

1. **Add state tracking**:
   - Add `activeFilter` state: `"unread" | "active" | "in-progress"`
   - Add `direction` state: `1 | -1` to track pill slide direction
   - Add `previousFilterIndexRef` to track filter index changes (like upholstery picker)
   - Keep existing `activeFilters` (CasesFilterState) for resolved/for-me toggles

2. **Concurrent query setup**:
   - Modify query setup to issue two parallel queries on mount:
     - Query 1: `case_state: "open"` (active cases)
     - Query 2: `case_state: "resolving"` (in-progress cases)
   - These queries run independently of user pill selection; data is pre-fetched
   - Current `listQuery` remains as primary; it's controlled by `activeFilter` + `activeFilters` (resolved/for-me)

3. **Compute unread cases**:
   - Merge active + in-progress query results
   - Filter to cases where `unreadCounts[caseId] > 0`
   - Return as `unreadCases: CaseListCardViewModel[]`

4. **Update controller return type**:
   - Replace group-based return (newGroup, activeGroup, etc.) with:
     - `activeFilter: "unread" | "active" | "in-progress"`
     - `cases: CaseListCardViewModel[]` (single list)
     - `onFilterChange: (filter) => void` to handle pill selection and direction tracking
   - Keep: `isLoading`, `searchQuery`, `setSearchQuery`, `openCase`, `openFilters`, `activeFilterCount`, `unreadCounts`, `refetch`

5. **Filter logic**:
   - `activeFilter === "unread"` → show merged active + in-progress cases with unread counts
   - `activeFilter === "active"` → show only open cases (created today, per current logic)
   - `activeFilter === "in-progress"` → show only resolving cases
   - When `activeFilters.caseStates === ["resolved"]` → override pill selection, show resolved cases only (pills hidden in view)
   - Search applies to active/in-progress (open + resolving); resolved requires explicit filter toggle

### Phase 2: CasesView Component Refactoring

1. **Restructure layout to match TasksView**:
   - Wrapper: `relative flex-1 min-h-0`
   - Absolutely positioned header (z-10): contains date + searchbar + pills
   - PullToRefresh wrapper: `absolute inset-0` with scroll ref
   - Scroll container: `pt-44` (offset for header); list in center

2. **Remove old section rendering**:
   - Delete CasesSectionGroup imports and rendering
   - Replace with flat `TaskListCard`-style rendering of `controller.cases`

3. **Add scroll visibility**:
   - Use `useScrollVisibility({ mode: "relative" })` to track scroll state
   - Pass `isCompact` to header to hide date + pills on scroll

### Phase 3: Create CasesHeader Component

1. **Component structure** (follows TasksHeader pattern):
   - Wrapper: `flex flex-col bg-background`
   - Top section: Date (conditionally shown based on isCompact, with collapse animation)
   - Middle section: SearchBar (always visible)
   - Bottom section: Horizontal pill row with BoxPicker (conditionally shown based on isCompact or resolved filter)

2. **Props**:
   - `isCompact: boolean` (from scroll visibility)
   - `activeFilter: "unread" | "active" | "in-progress"`
   - `onFilterChange: (filter) => void`
   - `q: string`, `onQChange: (value: string) => void`
   - `isLoading: boolean`
   - `activeFilterCount: number`
   - `onFilterPress: () => void`
   - `onSortPress: () => void`
   - `showPills: boolean` (hide when resolved filter active)
   - `todayLabel: string`

3. **Pill implementation**:
   - Use BoxPicker with `mode="single"`, `visualVariant="pill"`
   - Options: `[{ label: "Unread", value: "unread" }, { label: "Active", value: "active" }, { label: "In-Progress", value: "in-progress" }]`
   - Styling: Use selected/unselected className (match upholstery picker pattern)
   - Wrap in HorizontalScrollArea for mobile overflow

4. **Animations**:
   - Date section: Grid collapse/expand on isCompact change (cubic-bezier timing, like TasksHeader)
   - Pills section: Grid collapse/expand on isCompact or showPills change
   - List body: Framer Motion slide animation (direction-aware, like UpholsteryPickerSlidePage)

### Phase 4: List Body Slide Animation

1. **Wrap case list in AnimatePresence + motion.div**:
   ```
   bodyVariants = {
     enter: (direction: number) => ({
       x: direction > 0 ? "100%" : "-100%",
       opacity: 0,
     }),
     center: {
       x: 0,
       opacity: 1,
       transition: transitions.slide,
     },
     exit: (direction: number) => ({
       x: direction > 0 ? "-100%" : "100%",
       opacity: 0,
       transition: transitions.slide,
     }),
   }
   ```

2. **Key the list by activeFilter** so AnimatePresence detects change and re-mounts

3. **Custom direction logic** (like upholstery picker):
   - Filter index map: `{ unread: 0, active: 1, in-progress: 2 }`
   - On filter change, compare current index to previous index
   - If next > previous → direction = 1 (slide left to right)
   - If next < previous → direction = -1 (slide right to left)

### Phase 5: Update CaseConversationHeader

1. **Change state button label mapping**:
   - `state === "resolving"` → button label: "In-Progress" (was "Resolving")
   - Preserve all other logic (button click, disabled state, etc.)

2. **File**: `packages/cases/src/components/CaseConversationHeader.tsx`
   - Update state label map or derive label from state enum

### Phase 6: Update Filter Sheet Logic

1. **Remove open/resolving filter options**:
   - Current sheet likely has checkboxes for each case state
   - Remove "Open" and "Resolving" toggles
   - Keep "Resolved" toggle and "For Me" toggle only

2. **Filter logic**:
   - When "Resolved" selected: `caseStates = ["resolved"]`, pills hidden
   - When "Resolved" deselected: `caseStates = ["open", "resolving"]`, pills shown
   - "For Me" toggle: current logic unchanged

3. **Search behavior**:
   - Maintain current search logic: always applies to active case states
   - If resolved is selected, search applies only to resolved; when deselected, search applies to open + resolving

### Phase 7: Remove Dead Code & Types

1. **CasesView.tsx**:
   - Remove `CasesSectionGroup` import and component usage
   - Remove `getOrdinalSuffix`, `formatHeaderDate` functions (move to CasesHeader if needed)
   - Simplify to absolute layout pattern

2. **useCasesViewController**:
   - Remove group-building logic (newGroup, activeGroup, resolvingGroup, resolvedGroup)
   - Remove showActiveGroup, showResolvingGroup, showResolvedGroup booleans
   - Keep case grouping logic only if needed for unread calculation

3. **Types** (`types.ts`):
   - Add new types: `type CaseFilterPill = "unread" | "active" | "in-progress"`
   - State labels may remain unchanged (backend still uses "resolving")

## Risks and mitigations

- **Risk**: Concurrent queries for active + in-progress may increase initial network load.
  - Mitigation: Both queries are small and necessary regardless; queries are deduplicated by TanStack Query if issued simultaneously. On slower networks, cache persists data between pill taps.

- **Risk**: Unread count calculation may be expensive if cases list is large.
  - Mitigation: Unread counts are already fetched via `useUnreadCountsQuery`; filtering on client is O(n) and negligible. Memoize the unread merge logic to prevent re-computation.

- **Risk**: Slide animation with direction tracking may be fragile if direction state desynchronizes.
  - Mitigation: Use `previousFilterIndexRef` like upholstery picker; test by rapidly tapping different pills and verify animation direction is correct.

- **Risk**: Hiding pills when resolved filter is active may confuse users about why pills disappeared.
  - Mitigation: Behavior aligns with resolved vs. unresolved case dichotomy — users understand that resolved cases are a separate filter. Consider subtle visual feedback (e.g., pill area shows placeholder text "Resolved Cases").

- **Risk**: Scroll offset (`pt-44`) may not align visually on resolved filter if header shrinks.
  - Mitigation: Calculate offset dynamically based on header height; or use fixed offset and accept minor spacing difference on resolved view.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in cases package and managers app
- `npm run test -- --grep "cases" --run`: Unit tests pass for controller logic (filter transitions, unread calculation)
- `npm run test -- --grep "CasesView" --run`: Component snapshot/visual tests pass (header collapse, pill styling)
- `npx playwright test --grep "cases.*pill" --project=mobile`: Mobile e2e test for pill taps, slide animation, scroll visibility behavior
- `npx playwright test --grep "cases.*pill" --project=desktop`: Desktop e2e test for same flows at desktop viewport
- `npx playwright test --grep "cases.*filter.*resolved" --project=mobile`: Mobile e2e test for resolved filter logic (pills hide, only resolved shown)
- Manual verification: Tap pills rapidly, verify slide direction is correct and no animation glitches; scroll on list, verify header collapses in sync with pills

## Review log

- `2026-06-22` `Claude Code`: Initial plan created from intention document; awaiting user clarifications on unread logic, search with resolved, and scroll offset behavior.

## Lifecycle transition

- Current state: `archived`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_cases_refactor_pills_20260622.md`
- Archive location: `docs/architecture/archives/implementation/PLAN_cases_refactor_pills_20260622.md`
- Transition owner: `Codex`
