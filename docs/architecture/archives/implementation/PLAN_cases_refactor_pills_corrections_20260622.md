# PLAN_cases_refactor_pills_corrections_20260622

## Metadata

- Plan ID: `PLAN_cases_refactor_pills_corrections_20260622`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-22T00:00:00Z`
- Last updated at (UTC): `2026-06-22T12:27:40Z`
- Related issue/ticket: Post-implementation corrections for `PLAN_cases_refactor_pills_20260622`
- Intention plan: `docs/architecture/under_construction/intention/upholstery_changes.txt` (cases section)

## Goal and intent

- **Goal**: Correct five issues found during post-implementation review of `PLAN_cases_refactor_pills_20260622`: broken Playwright tests (stale selectors, wrong button label expectation, mock routing gap), a page title that was not removed, and a resolved-cases data leak into the unread count query.
- **Business/user intent**: The validation plan from the original implementation requires Playwright tests to pass on mobile and desktop. None of the e2e tests currently pass because the test file was not updated for the new pill-based structure. The title removal was an explicit user requirement that was missed.
- **Non-goals**:
  - Adding new features beyond what the original plan specified
  - Changing any currently correct component behaviour
  - Rewriting tests beyond the cases page spec and mock setup
  - Touching the workers app cases spec (different feature scope)

## Scope

- **In scope**:
  - Remove `<h1>Cases</h1>` from `CasesHeader.tsx` (keep only the date label in the collapsible section)
  - Fix `unreadCountSourceCases` in the controller to exclude resolved cases from the unread count query
  - Fix `onFilterChange` direction comparison from `>=` to `>`; add the `!== previousIndex` guard before updating direction
  - Rewrite `cases-page.spec.ts` in the managers app:
    - Update `installCasesMocks` to route by `case_state` query param so each of the three concurrent queries gets the correct subset of cases
    - Replace all `cases-section-*` testid references with the new `cases-list-body-*` and `case-card-*` testid selectors
    - Update state button label expectation from `"Process"` to `"In-Progress"` for the open→resolving transition
    - Add pill-based filter smoke tests (unread, active, in-progress)
  - Move `getOrdinalSuffix` and `formatHeaderDate` helpers from `CasesView.tsx` into `CasesHeader.tsx`

- **Out of scope**:
  - Changing the filter sheet, CaseCard, or any surface logic
  - Workers app cases spec
  - Any routing or provider changes

- **Assumptions**:
  - `CasesHeader` already receives `todayLabel` as a prop; after moving the helpers the prop contract stays identical
  - The managers app Playwright fixture at `tests/playwright/fixtures/app-fixture` and `auth.signIn()` usage are unchanged
  - The `data-testid="cases-list-body-{activeFilter}"` and `data-testid="cases-list-body-resolved"` testids are already on the rendered `m.div` in `CasesView.tsx`
  - The `data-testid="case-card-{caseId}"` testid is already on `CaseCard`

## Clarifications required

_(none — all corrections are directly derivable from the review findings and the existing code)_

## Acceptance criteria

1. `<h1>Cases</h1>` is absent from `CasesHeader.tsx`; only the date `<p>` label remains in the collapsible section
2. `unreadCountSourceCases` is derived from `[...activeCases, ...inProgressCases]` only — resolved cases are not included
3. `onFilterChange` only updates `direction` when `nextIndex !== previousIndex`, using `>` (not `>=`)
4. `getOrdinalSuffix` and `formatHeaderDate` live in `CasesHeader.tsx`; `CasesView.tsx` no longer contains them; `todayLabel` prop interface is unchanged
5. `installCasesMocks` routes based on the `case_state` query param: `open` cases to `activeCasesQuery`, `resolving` to `inProgressCasesQuery`, `resolved` returns an empty array (or a resolved fixture if added)
6. All `cases-section-new/active/resolving` testid references removed from `cases-page.spec.ts`
7. State button expectation updated: `"Process"` → `"In-Progress"` for the open→resolving case
8. New pill smoke test passes: navigate to `/cases`, verify unread pill is selected by default, tap active pill, verify list body switches to `cases-list-body-active`
9. `npm run typecheck`: zero TypeScript errors
10. `npx playwright test --grep "cases" --project=mobile`: all cases specs pass
11. `npx playwright test --grep "cases" --project=desktop`: all cases specs pass

## Contracts and skills

### Contracts loaded

Read order:
- `../architecture/34_runtime_validation.md` (baseline — Playwright structure, fixture usage, testid selectors)
- `../architecture/34_runtime_validation_local.md` (app delta — fixture path `tests/playwright/fixtures/app-fixture`, `auth.signIn()`, spec location convention)

No additional contracts needed — this plan only touches tests and three small code points already established by the original plan's contracts.

### Local extensions loaded

- `../architecture/34_runtime_validation_local.md`: spec location, fixture import, credential env vars, `data-testid` naming convention

### File read intent — pattern vs. relational

Permitted relational reads:
- `packages/cases/src/components/CasesView.tsx` — verify `data-testid` values on `m.div` for the new list bodies
- `packages/cases/src/components/CaseCard.tsx` — verify `data-testid` shape for individual case cards
- `apps/managers-app/.../tests/playwright/features/cases/cases-page.spec.ts` — understand full current test structure before rewriting
- `packages/cases/src/controllers/use-cases-view.controller.ts` — verify exact lines to correct

Prohibited:
- Reading other test files to understand Playwright fixture setup → `34_runtime_validation_local.md` defines it

### Skill selection

- Primary skill: Playwright spec correction + targeted code fix
- Trigger terms: `"playwright"`, `"spec"`, `"testid"`, `"mock routing"`, `"stale test"`
- Excluded alternatives: Feature workflow skill — no new features

## Implementation plan

### Step 1 — Remove page title from `CasesHeader.tsx`

File: `packages/cases/src/components/CasesHeader.tsx`

Remove the `<h1>` element. The collapsible top section becomes date-only:

```tsx
// Before
<div className="px-4 pb-2 pt-3">
  <h1 className="text-2xl font-semibold text-foreground">Cases</h1>
  <p className="mt-1 text-sm text-muted-foreground">{todayLabel}</p>
</div>

// After
<div className="px-4 pb-2 pt-3">
  <p className="text-sm text-muted-foreground">{todayLabel}</p>
</div>
```

### Step 2 — Move date helpers into `CasesHeader.tsx`; clean `CasesView.tsx`

Move `getOrdinalSuffix` and `formatHeaderDate` from `CasesView.tsx` into `CasesHeader.tsx` (above the component). Remove the `todayLabel` computation from `CasesView.tsx` — compute it inside `CasesHeader` directly from `new Date()` so the `todayLabel` prop is no longer needed.

Update `CasesHeaderProps` to remove `todayLabel`. Update `CasesView.tsx` to stop computing and passing `todayLabel`.

### Step 3 — Fix `unreadCountSourceCases` in the controller

File: `packages/cases/src/controllers/use-cases-view.controller.ts`

```ts
// Before
const unreadCountSourceCases = useMemo(
  () => [...activeCases, ...inProgressCases, ...resolvedCases],
  [activeCases, inProgressCases, resolvedCases],
);

// After
const unreadCountSourceCases = useMemo(
  () => [...activeCases, ...inProgressCases],
  [activeCases, inProgressCases],
);
```

### Step 4 — Fix direction comparison in `onFilterChange`

File: `packages/cases/src/controllers/use-cases-view.controller.ts`

```ts
// Before
function onFilterChange(filter: CaseFilterPill): void {
  const nextIndex = FILTER_INDEX.get(filter) ?? 0;
  const previousIndex = previousFilterIndexRef.current;

  setDirection(nextIndex >= previousIndex ? 1 : -1);
  previousFilterIndexRef.current = nextIndex;
  setActiveFilter(filter);
}

// After
function onFilterChange(filter: CaseFilterPill): void {
  const nextIndex = FILTER_INDEX.get(filter) ?? 0;
  const previousIndex = previousFilterIndexRef.current;

  if (nextIndex !== previousIndex) {
    setDirection(nextIndex > previousIndex ? 1 : -1);
    previousFilterIndexRef.current = nextIndex;
  }

  setActiveFilter(filter);
}
```

### Step 5 — Rewrite `cases-page.spec.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/cases-page.spec.ts`

**5a — Fix `installCasesMocks` route handler to split by `case_state`**

Replace the single `**/api/v1/cases?**` handler with one that reads the `case_state` query param and returns the appropriate subset:

```ts
await page.route("**/api/v1/cases?**", async (route) => {
  const url = new URL(route.request().url());
  const caseState = url.searchParams.get("case_state");

  const filtered =
    caseState === "open"
      ? cases.filter((c) => c.state === "open")
      : caseState === "resolving"
        ? cases.filter((c) => c.state === "resolving")
        : caseState === "resolved"
          ? cases.filter((c) => c.state === "resolved")
          : cases;

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, warnings: [], data: { cases: filtered } }),
  });
});
```

**5b — Replace stale `cases-section-*` testid assertions**

The first test ("renders groups, filters client-side...") relied on three section containers. Replace those assertions with pill-based selectors:

- `cases-section-new` → `cases-list-body-unread` (default pill on load)
- `cases-section-active` → `cases-list-body-active` (after tapping active pill)
- `cases-section-resolving` → `cases-list-body-in-progress` (after tapping in-progress pill)

The new test flow for this assertion block:
1. Navigate to `/cases`; verify `cases-page` is visible
2. Verify `cases-list-body-unread` is visible and contains `case-card-case_new_open` (has unread) and `case-card-case_resolving` (has unread); does NOT contain `case-card-case_active_open` (unread count = 0)
3. Click `cases-filter-active` pill; verify `cases-list-body-active` is visible and contains `case-card-case_new_open` and `case-card-case_active_open`
4. Click `cases-filter-in-progress` pill; verify `cases-list-body-in-progress` is visible and contains `case-card-case_resolving`
5. Search bar and unread badge assertions remain structurally the same; remove `cases-section-active` scope wrapper from search test

**5c — Update state button label expectation**

Replace every occurrence of `toHaveText("Process")` with `toHaveText("In-Progress")` in tests that open a case in `state: "open"`.

The `case_resolving` button assertion (`toHaveText("Resolve")`) is already correct — `getStateTransition("resolving")` returns `label: "Resolve"`. Leave it unchanged.

**5d — Update `installCasesListWithoutTaskMocks`**

The helper at the bottom also uses a single `**/api/v1/cases*` wildcard. Apply the same `case_state` split so it doesn't break when the controller fires three concurrent queries.

**5e — Add pill smoke test**

Add a focused test that validates the pill filter interaction:

```ts
test("pill filter switches the visible case list and defaults to unread", async ({ page }) => {
  await installCasesMocks(page);
  await page.goto("/cases");

  // Default is unread pill
  await expect(page.getByTestId("cases-list-body-unread")).toBeVisible();
  await expect(
    page.getByTestId("cases-list-body-unread").getByTestId("case-card-case_new_open"),
  ).toBeVisible();
  // case_active_open has 0 unread — must not appear in unread list
  await expect(
    page.getByTestId("cases-list-body-unread").getByTestId("case-card-case_active_open"),
  ).toHaveCount(0);

  // Tap active pill
  await page.getByTestId("cases-filter-active").click();
  await expect(page.getByTestId("cases-list-body-active")).toBeVisible();
  await expect(
    page.getByTestId("cases-list-body-active").getByTestId("case-card-case_new_open"),
  ).toBeVisible();
  await expect(
    page.getByTestId("cases-list-body-active").getByTestId("case-card-case_active_open"),
  ).toBeVisible();

  // Tap in-progress pill
  await page.getByTestId("cases-filter-in-progress").click();
  await expect(page.getByTestId("cases-list-body-in-progress")).toBeVisible();
  await expect(
    page.getByTestId("cases-list-body-in-progress").getByTestId("case-card-case_resolving"),
  ).toBeVisible();
});
```

## Risks and mitigations

- **Risk**: `CasesView.tsx` passes `todayLabel` as a prop; removing it requires touching both the view and the header prop type simultaneously.
  - Mitigation: Steps 1 and 2 are sequenced — remove the prop from `CasesHeaderProps` and compute the date inside the header in one atomic change. Typecheck immediately after.

- **Risk**: The `installCasesListWithoutTaskMocks` helper also intercepts `**/api/v1/cases*` without a state filter. If left unchanged, its route may conflict with the three new queries and cause test flake.
  - Mitigation: Step 5d explicitly updates that helper alongside the main mock.

- **Risk**: Pill transition animation (`AnimatePresence mode="wait"`) means the new panel doesn't mount until the exit animation finishes. Playwright assertions on `cases-list-body-active` may need a short `toBeVisible` timeout.
  - Mitigation: Default Playwright `toBeVisible` timeout (5 s) is sufficient. If flaky, set `{ timeout: 1500 }` on the post-tap assertion.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npx playwright test --grep "cases" --project=mobile`: all cases specs pass (no stale testids, correct button label, correct pill assertions)
- `npx playwright test --grep "cases" --project=desktop`: same result at desktop viewport

## Review log

- `2026-06-22` `Claude Code`: Correction plan created from post-implementation review; all five findings addressed; no open clarifications.

## Lifecycle transition

- Current state: `archived`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_cases_refactor_pills_corrections_20260622.md`
- Archive location: `docs/architecture/archives/implementation/PLAN_cases_refactor_pills_corrections_20260622.md`
- Transition owner: `Codex`
