# PLAN_coordination_inbox_search_and_filter_20260706

## Metadata

- Plan ID: `PLAN_coordination_inbox_search_and_filter_20260706`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-06T00:00:00Z`
- Last updated at (UTC): `2026-07-06T10:49:17Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/making_seller_app_2.txt`

## Goal and intent

- Goal: Turn the coordination email inbox search bar into a **server-side** query (`q` param) against `GET /api/v1/tasks/customer-coordination/threads`, and add a filter button that opens a **bottom-sheet surface** for picking the `coordination_states` query param. Applying the filter re-queries the inbox immediately.
- Business/user intent: A seller working the Follow-up inbox needs to find threads by typing a term (matched server-side across many columns, same as the Tasks page `q`) and to narrow the list by coordination state (pending / coordinating / completed / failed) instead of being locked to the hardcoded `coordinating` state.
- Non-goals:
  - No backend changes. The `q` and `coordination_states` params are assumed already supported by the endpoint (see Clarifications).
  - No pagination / infinite scroll changes (the inbox stays a single `limit: 50, offset: 0` page).
  - No new visual design, colors, spacing tokens, or component styling. All new UI reuses existing primitives (`BoxPicker`, `SearchBar`) and copies class strings verbatim from the reference file.
  - No changes to the managers app (it does not register the inbox surface — verified).

## Scope

- In scope:
  - `@beyo/emails` — thread `onFilterPress` / `showFilterButton` / `activeFilterCount` pass-through props on `EmailInboxView` + `EmailInboxHeader`.
  - `@beyo/task-customer-coordination` — add `q` to the inbox query params + API function; new coordination-inbox filter sheet surface (state type, surface-id, props, page component, load fn, opener); controller wiring (debounced `q`, filter state, `activeFilterCount`, `openFilterSheet`).
  - Sellers app — register the new filter sheet surface and provide the `openFilterSheet` opener in `HomeView`.
- Out of scope: All other apps, packages, and the endpoint contract itself.
- Assumptions:
  - The inbox endpoint accepts `q` (string) and honors a comma-joined `coordination_states` value with any subset of `CUSTOMER_COORDINATION_STATE`.
  - The generic `SearchBar` filter button (already implemented in `@beyo/ui`) is the intended UI — nothing new is drawn.

## Clarifications required

- [x] Confirm the inbox endpoint (`GET /api/v1/tasks/customer-coordination/threads`) accepts `q` — **RESOLVED 2026-07-06 (David): endpoint accepts `q`.** (`coordination_states` is already sent by the current code.)
- [x] Confirm the desired **default** coordination-state filter — **RESOLVED 2026-07-06 (David): default is `["coordinating"]`.** Plan keeps `DEFAULT_COORDINATION_INBOX_FILTER = { coordinationStates: ["coordinating"] }`.

## Acceptance criteria

1. Typing in the inbox search bar updates the list via a **new network request** to the threads endpoint with `q=<term>` (debounced ~300ms), not a client-side `.filter()`.
2. The search bar shows a filter button; tapping it opens a bottom **sheet** surface titled "Filters" with a `BoxPicker` (multi-select) of the four coordination states.
3. Selecting states + tapping "Apply" closes the sheet and immediately re-queries the inbox with `coordination_states=<comma-joined selection>`; the list reflects the new states without a manual refresh.
4. When the active filter differs from the default, the search bar filter button shows the count badge (`activeFilterCount`).
5. `npm run typecheck` passes with zero errors; no new colors/utility classes are introduced beyond those copied from `CaseFilterSheetRouteEntry` / existing inbox components.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer boundaries (package vs app, controller/page split).
- `architecture/02_types.md`: param/type definitions for the new filter state and query params.
- `architecture/04_api_client.md` (+ `04_api_client_local.md`): how query params are appended to an `apiClient.get` call and the local error/envelope shape.
- `architecture/05_server_state.md`: TanStack query hook + query-key-driven refetch when params change (the `q` / `coordination_states` change must flow through the query key).
- `architecture/06_client_state.md`: local component/controller state for `q` and the filter draft.
- `architecture/07_components.md`: extending a feature/package presentational component (`EmailInboxView` / `EmailInboxHeader`) with new pass-through props only.
- `architecture/08_hooks.md`: controller aggregation shape (no cache-snapshot/rollback here; read-only).
- `architecture/13_errors.md`: error surface stays as-is; no new error paths.
- `architecture/15_feature_structure.md`: file placement inside the package.
- `architecture/28_surfaces.md` (+ `28_surfaces_local.md`): the new filter surface is a **`sheet`** (`slide`/`sheet`/`modal` are the active surface types; `drawer` excluded — use a registered sheet, not vaul).
- `architecture/30_dynamic_loading.md` (+ `30_dynamic_loading_local.md`): `loadXxxSheetPage` export + `lazyWithPreload` registration in the app surfaces map.
- `architecture/35_shared_packages.md §13`: package field/page opens a picker surface via an injected `surfaceOpeners.openFilterSheet` callback — the package never imports the app surface system.
- `architecture/35_shared_packages.md §14`: expose the sheet page from the package (`loadCustomerCoordinationInboxFilterSheetPage`) for surface registration; keep the dynamic import effective (no static re-export that pulls it into the main chunk).

### Local extensions loaded

- `architecture/04_api_client_local.md`: flat-string backend error shape, response envelope — no change, only confirms the existing `getCoordinationInboxThreads` envelope handling stays valid when `q` is added.
- `architecture/28_surfaces_local.md`: active surface types = `slide | sheet | modal`; register the filter page as `sheet`.
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path + StagedForm hoisting rule (not triggered here; confirms the `load*` + `lazyWithPreload` registration convention).

### File read intent — pattern vs. relational

Applied the test from `task_system/frontend_contract_goal_mapping_guide.md`. Relational reads already performed (understanding what exists, permitted):

- `packages/task-customer-coordination/src/types.ts` — exact `CUSTOMER_COORDINATION_STATE`, `CoordinationInboxThreadsParams` shape.
- `packages/task-customer-coordination/src/api/get-coordination-inbox-threads.ts` — how params map to `queryParams`.
- `packages/task-customer-coordination/src/api/customer-coordination-email-keys.ts` — `inboxThreads(params)` key already keys off the params object.
- `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts` — current `INBOX_QUERY_PARAMS` + client-side search filter to replace.
- `packages/task-customer-coordination/src/surface-ids.ts` + `index.ts` — existing surface-id / opener / `load*` export conventions to mirror.
- `packages/emails/src/components/EmailInboxView.tsx` + `EmailInboxHeader.tsx` — current prop flow to `SearchBar`.
- `packages/cases/src/components/CaseFilterSheetRouteEntry.tsx` — **the styling/structure reference to copy verbatim** for the new sheet page.
- `packages/tasks/src/flows/use-tasks-page.flow.ts` — the exact 300ms `q` debounce pattern to mirror.

No prohibited pattern reads are needed.

### Skill selection

- Primary skill: none required (documentation/implementation plan only).
- Trigger terms: `surface`, `sheet`, `surfaceOpeners`, `package page`, `loadXxx`, `server state`.
- Excluded alternatives: `33_vaul_drawer` — excluded because the filter is a **registered sheet surface**, not a vaul drawer.

## Implementation plan

> STYLING GUARDRAIL (read first): Do **not** invent colors, background classes, radii, or spacing. The new sheet page must copy its wrapper/heading/clear-button/apply-button class strings **verbatim** from `packages/cases/src/components/CaseFilterSheetRouteEntry.tsx`. The `BoxPicker` must be configured exactly as in that file (`columns={2}`, `mode="multiple"`, `size="xs"`, `showDescription={false}`). No other visual changes anywhere.

### Part A — `@beyo/emails`: expose filter pass-through props (generic boundary)

1. `packages/emails/src/components/EmailInboxHeader.tsx`:
   - Add to `EmailInboxHeaderProps`: `showFilterButton?: boolean;`, `activeFilterCount?: number;`, `onFilterPress?: () => void;`.
   - Replace the hardcoded `showFilterButton={false}` and `activeFilterCount={0}` on `<SearchBar>` with `showFilterButton={showFilterButton ?? false}`, `activeFilterCount={activeFilterCount ?? 0}`, and add `onFilterPress={onFilterPress}`. Keep `showSortButton={false}`. Do not change any class names or the placeholder.
2. `packages/emails/src/components/EmailInboxView.tsx`:
   - Add the same three optional props to `EmailInboxViewProps`.
   - Thread them through to `<EmailInboxHeader ... showFilterButton={showFilterButton} activeFilterCount={activeFilterCount} onFilterPress={onFilterPress} />`. No layout changes.

### Part B — `@beyo/task-customer-coordination`: query param `q`

3. `packages/task-customer-coordination/src/types.ts`:
   - Add `q?: string;` to `CoordinationInboxThreadsParams` (it already has `coordination_states?`, `limit?`, `offset?`).
   - Add a filter-state type + default near `CUSTOMER_COORDINATION_STATE`:
     ```ts
     export type CoordinationInboxFilterState = {
       coordinationStates: CustomerCoordinationState[];
     };
     export const DEFAULT_COORDINATION_INBOX_FILTER: CoordinationInboxFilterState = {
       coordinationStates: ["coordinating"],
     };
     ```
     (`CustomerCoordinationState` is already exported from this file.)
4. `packages/task-customer-coordination/src/api/get-coordination-inbox-threads.ts`:
   - After the existing `coordination_states` line, add: `if (params.q) queryParams.q = params.q;`. No other change (the query key already varies by the full params object, so `q` changes trigger refetch).

### Part C — new coordination-inbox filter sheet surface

5. `packages/task-customer-coordination/src/surface-ids.ts`:
   - Add: `export const CUSTOMER_COORDINATION_EMAIL_INBOX_FILTER_SHEET_SURFACE_ID = "customer-coordination-email-inbox-filter-sheet";`
   - Add props type (mirror `CaseFilterSheetSurfaceProps`):
     ```ts
     export type CustomerCoordinationInboxFilterSheetSurfaceProps = {
       currentFilters: CoordinationInboxFilterState;
       onApply: (filters: CoordinationInboxFilterState) => void;
     };
     ```
     Import `CoordinationInboxFilterState` from `./types`.
   - Extend `CustomerCoordinationEmailInboxSurfaceOpeners` with:
     `openFilterSheet?: (props: CustomerCoordinationInboxFilterSheetSurfaceProps) => void;`
6. New file `packages/task-customer-coordination/src/pages/CustomerCoordinationInboxFilterSheetPage.tsx` — **structurally identical to `CaseFilterSheetRouteEntry.tsx`**, adapted to coordination states:
   - Imports: `useState` from `react`; `useSurfaceHeader, useSurfaceProps` from `@beyo/hooks`; `BoxPicker, type BoxPickerOptionType` from `@beyo/ui`; the props type + `CustomerCoordinationInboxFilterSheetSurfaceProps` from `../surface-ids`; `DEFAULT_COORDINATION_INBOX_FILTER, type CoordinationInboxFilterState, CUSTOMER_COORDINATION_STATE` from `../types`; lucide icons.
   - Define one options array covering all four states, typed `BoxPickerOptionType<CustomerCoordinationState>[]`:
     ```ts
     const STATE_OPTIONS: BoxPickerOptionType<CustomerCoordinationState>[] = [
       { value: "pending",      label: "Pending",      icon: Clock,       testId: "coordination-filter-state-pending" },
       { value: "coordinating", label: "Coordinating", icon: Mail,        testId: "coordination-filter-state-coordinating" },
       { value: "completed",    label: "Completed",    icon: CircleCheck, testId: "coordination-filter-state-completed" },
       { value: "failed",       label: "Failed",       icon: CircleX,     testId: "coordination-filter-state-failed" },
     ];
     ```
     Use lucide icons `Clock, Mail, CircleCheck, CircleX` (import from `lucide-react`). These are illustrative-but-consistent with existing coordination iconography (`Check`/`X`/`TriangleAlert` are used in the controller); do not add colored icons — `BoxPicker` styles them.
   - Component body copies `CaseFilterSheetRouteEntry` exactly:
     - `const header = useSurfaceHeader();`
     - `const { currentFilters, onApply } = useSurfaceProps<CustomerCoordinationInboxFilterSheetSurfaceProps>();`
     - `const [draft, setDraft] = useState<CoordinationInboxFilterState>(currentFilters ?? DEFAULT_COORDINATION_INBOX_FILTER);`
     - `handleApply()` → `onApply?.(draft); header?.requestClose();`
     - `handleClear()` → `setDraft(DEFAULT_COORDINATION_INBOX_FILTER);`
     - Return the **same JSX shell** as `CaseFilterSheetRouteEntry` (same wrapper `className="flex flex-col gap-6 px-4 pb-6 pt-4"`, same "Filters" heading row + "Clear" button, same section label `<p className="text-sm font-medium text-muted-foreground">Coordination state</p>`, and the same Apply button `className="mt-4 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card"`).
     - Single `<BoxPicker columns={2} mode="multiple" size="xs" showDescription={false} options={STATE_OPTIONS} value={draft.coordinationStates} onValueChange={(states) => setDraft((prev) => ({ ...prev, coordinationStates: states as CustomerCoordinationState[] }))} data-testid="coordination-filter-state-picker" />`.
     - Root `data-testid="coordination-inbox-filter-sheet"`.
   - Export a named component `CustomerCoordinationInboxFilterSheetPage`.
7. `packages/task-customer-coordination/src/index.ts`:
   - Export the new surface-id, the new props type + `CoordinationInboxFilterState` + `DEFAULT_COORDINATION_INBOX_FILTER` (types from `./types` / `./surface-ids`).
   - Add a `load` fn mirroring the existing ones:
     ```ts
     export function loadCustomerCoordinationInboxFilterSheetPage() {
       return import("./pages/CustomerCoordinationInboxFilterSheetPage").then((m) => ({
         default: m.CustomerCoordinationInboxFilterSheetPage,
       }));
     }
     ```
   - Do **not** statically re-export `CustomerCoordinationInboxFilterSheetPage` as a value alongside the `load*` fn if that would defeat code-splitting; follow the same export shape already used for the inbox page (which is exported directly today, so matching that is acceptable, but the `load*` fn is what the app registers).

### Part D — controller wiring

8. `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts`:
   - Remove the fixed `INBOX_QUERY_PARAMS` constant.
   - Add state: `const [coordinationStates, setCoordinationStates] = useState<CustomerCoordinationState[]>(DEFAULT_COORDINATION_INBOX_FILTER.coordinationStates);`
   - Add debounce for the existing `searchValue` (mirror `use-tasks-page.flow.ts` lines 94–99):
     ```ts
     const [debouncedQ, setDebouncedQ] = useState("");
     useEffect(() => {
       const timeout = window.setTimeout(() => setDebouncedQ(searchValue.trim()), 300);
       return () => window.clearTimeout(timeout);
     }, [searchValue]);
     ```
   - Build query params via `useMemo`:
     ```ts
     const inboxParams = useMemo(
       () => ({
         coordination_states: coordinationStates.join(","),
         ...(debouncedQ ? { q: debouncedQ } : {}),
         limit: 50,
         offset: 0,
       }),
       [coordinationStates, debouncedQ],
     );
     const inboxQuery = useCoordinationInboxThreadsQuery(inboxParams);
     ```
   - In the `threads` `useMemo`: **remove the client-side `searchValue` text filter** (the block that lowercases `searchValue` and `.includes`). Keep the `removedThreadIds` filtering. The list is now server-filtered; `threads` = `(inboxQuery.data?.items ?? []).filter((t) => !removedThreadIds.has(t.threadId))`. Drop `searchValue` from that memo's deps.
   - Add `activeFilterCount` (deterministic, default-aware):
     ```ts
     const activeFilterCount = useMemo(() => {
       const def = DEFAULT_COORDINATION_INBOX_FILTER.coordinationStates;
       const isDefault =
         coordinationStates.length === def.length &&
         coordinationStates.every((s) => def.includes(s));
       return isDefault ? 0 : coordinationStates.length;
     }, [coordinationStates]);
     ```
   - Add `openFilterSheet`:
     ```ts
     function openFilterSheet(): void {
       surfaceOpeners?.openFilterSheet?.({
         currentFilters: { coordinationStates },
         onApply: (filters) => setCoordinationStates(filters.coordinationStates),
       });
     }
     ```
   - Extend the controller return type + object with `activeFilterCount: number;` and `openFilterSheet: () => void;`.
   - Imports: add `useCustomerCoordinationState`? no — add `CustomerCoordinationState`, `DEFAULT_COORDINATION_INBOX_FILTER` from `../types`; ensure `useMemo`/`useEffect`/`useState` already imported (they are).

### Part E — page → view wiring

9. `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailInboxPage.tsx`:
   - On `<EmailInboxView>` add: `showFilterButton`, `activeFilterCount={controller.activeFilterCount}`, `onFilterPress={controller.openFilterSheet}`. (`searchValue` / `onSearchChange` already wired.)

### Part F — sellers app registration + opener

10. `apps/selleres-app/ManagerBeyo-app-sellers/src/features/tasks/surfaces.ts`:
    - Import `CUSTOMER_COORDINATION_EMAIL_INBOX_FILTER_SHEET_SURFACE_ID` and `loadCustomerCoordinationInboxFilterSheetPage` from `@beyo/task-customer-coordination`; also re-export the surface-id and the `CustomerCoordinationInboxFilterSheetSurfaceProps` type alongside the other coordination exports.
    - `const customerCoordinationInboxFilterSheet = lazyWithPreload(loadCustomerCoordinationInboxFilterSheetPage);`
    - Register in `taskSurfaces`: `[CUSTOMER_COORDINATION_EMAIL_INBOX_FILTER_SHEET_SURFACE_ID]: { surface: "sheet", component: customerCoordinationInboxFilterSheet.Component }`.
11. `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/components/HomeView.tsx`:
    - Import the new surface-id (and, if needed for `satisfies`, the props type) from `@/features/tasks/surfaces` (or `@beyo/task-customer-coordination`).
    - In `openCustomerCoordinationEmailInboxSurface`, add to `surfaceOpeners`:
      ```ts
      openFilterSheet: (props) =>
        surface.open(CUSTOMER_COORDINATION_EMAIL_INBOX_FILTER_SHEET_SURFACE_ID, props),
      ```

## Risks and mitigations

- Risk: Endpoint does not yet accept `q` / multi-value `coordination_states` → filter/search silently no-ops or errors.
  Mitigation: Clarification #1 must be confirmed against the live backend before coding (per `feedback_verify_technical_claims_against_code`).
- Risk: Removing the client-side text filter changes behavior if the server `q` matches different fields than the old local `[title, subject, preview]` match.
  Mitigation: Intended — the goal is server parity with the Tasks `q`. Documented in acceptance criterion #1.
- Risk: Codex introduces new colors/styling on the sheet page.
  Mitigation: Explicit STYLING GUARDRAIL + "copy verbatim from `CaseFilterSheetRouteEntry`" instruction; reviewer diff-checks class strings against the reference.
- Risk: Dynamic import made ineffective by an eager value re-export of the page (`35_shared_packages §14`).
  Mitigation: Register the app surface via `lazyWithPreload(loadCustomerCoordinationInboxFilterSheetPage)`, matching the existing inbox/reply surface registrations.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/emails`, `@beyo/task-customer-coordination`, and the sellers app.
- Manual runtime (sellers app, mobile viewport): open Follow-up → type a term → observe a new network request to `/api/v1/tasks/customer-coordination/threads?...&q=<term>` and a list update; tap the filter button → sheet opens → select "Pending" + "Completed" → Apply → sheet closes → new request with `coordination_states=pending,completed` and updated list; filter badge shows count.
- `npx playwright test --grep coordination-inbox --project=mobile`: search + filter flow passes (if/when a spec is added under the sellers e2e suite).
- `npx playwright test --grep coordination-inbox --project=desktop`: same flow passes.

## Review log

- `2026-07-06` `Claude`: initial plan authored from `making_seller_app_2.txt`.
- `2026-07-06` `David`: confirmed endpoint accepts `q` and default filter is `["coordinating"]`; both clarifications resolved → approved.

## Lifecycle transition

- Current state: `approved`
- Next state: `debugging` (once Codex implements)
- Transition owner: `David`
