---
audience: frontend / owner
subject: Stock report — draft versions, as implemented on the frontend
date: 2026-09-28
plan: PLAN_frontend_draft_versions_20260927.md, amended by PROJECTION_frontend_draft_versions_20260928.md (R1–R20)
contract: built on v7–v10; reconciled 2026-09-28 against the shipped backend and its consolidated v11 (backend repo, `docs/architecture/under_construction/implementation/stock_report/handoffs/to_frontend/HANDOFF_TO_FRONTEND_stock_report_snapshots_v11_20260928.md`)
commits: 8681a776 (1/4), b20c9eaa (2/4), dc18462a (3/4), checkpoint 4/4 — all "CHECKPOINT (not approved)"
---

# Deploy order

Deploy the **backend v11 first**. The schemas are strict: `state`, `quantity_requested_source`,
`quantity_missing_source` and the rest are required on every row and version (OC-19). Against today's v6
backend, every board parse fails. There is no transition shim.

# What changed

## `@beyo/stock-report` (shared by managers, workers, sellers)

### Checkpoint 1: schema, keys, API, queries (Phases A and B)
- **Snapshot schema.** Gains `quantity_requested_scanner` and `_source` (`scanner|manual`),
  `quantity_missing_source` (`own|active|none`), `active_quantity_missing`, and a nullable `active_at`.
- **Version schema.** Gains `state` (`draft|active|closed`), `title`, `scheduled_activation_at` and
  `scheduled_activation_keeps_active_missing`. Commands answer with a row schema that has no `progress`.
- **View models.** They add `isDraft`, `isOverdue`, `displayTitle` (the title, else the creation day as
  "Thu, 7th July") and `scheduleLabel`.
- **Keys.**
  - A version **scope** is a key segment right after `lists()`. It is `"active"` or a version id.
  - Other keys: `versionLists(scope)`, `bucketLists(scope, bucket)`, `itemAll(id)` / `item(id, scope)`
    (scope last, so `:deleted` removes by prefix), `versionList({ states, progressPriority })`,
    `version(id)` and `draftCount()`.
- **API.**
  - Reads: `version_id` on `/items`, the `state=` comma list, a single-version read, and the draft count.
  - Version commands: create (draft or active, schedule keys only with `draft: true`), PATCH (only
    changed keys), activate `{ keep_active_missing }`, refresh (no body means keep typed values), and
    delete.
  - Row edits: versioned routes, including missing `null` (borrow the board's count again) and the
    requested quantity (no active shortcut; the board sends `row.snapshot.version_id`).
- **Errors.** Failures are parsed by the leading identity token (R16).

### Checkpoint 2: scope, sockets, actions (Phases C, D and E)
- **Board and detail.**
  - The board controller takes a `versionId`. The detail page reads one scope only.
  - The detail page's ⋮ shows for `canMarkMissing || canPrioritise` (R3), so sellers reach it for the
    requested row.
  - The menu offers Set requested quantity, and on a draft row it adds Follow the live version.
- **Draft board slide** (`stock-report-draft-board-slide`).
  - It uses the board view scoped to the draft, and has a ⋮ for version actions.
  - Exit rule: when the draft goes live or is deleted, the page closes itself and every surface above it
    (R12). It shows a toast only when the change came from elsewhere, which it checks against the
    mutation cache.
- **Active board slide.** It is titled by `displayTitle` and gets the version ⋮.
- **Sockets.** Handlers are scoped per `extra.version_id`.
  - An active-scope list learns its version from its rows.
  - Draft events restart only their own scope.
  - Active events also patch drafts' borrowing rows, and `active_quantity_missing` on typed rows.
  - Five version events are handled: `:created`, `:activated`, `:refreshed`, `:updated`, `:deleted`.
- **Dropping a version's queries.** `dropStockReportVersionQueries` removes unobserved queries.
  - Observed draft queries are cancelled.
  - The observed active scope is **reset**, not cancelled, so a mounted board refetches. This departs
    from R11 on purpose.
- **Actions.**
  - Every cache walk is scoped, including the seed from the response.
  - The requested-quantity mutation is optimistic and clamps missing on the active scope.
  - The version commands share `mutationKey: versionCommand(id)`, which is what the draft board's toast
    rule reads.
  - Invalidations are leaf keys, never the whole `versions()` prefix (R17). Refresh is the one
    exception: it moves every version's progress.

### Checkpoint 3: form, sheets, drafts page (Phases F and G)
- **Version form slide** (`stock-report-version-form-slide`). The form uses react-hook-form with
  `zodResolver`.
  - `lib/version-form.ts` compares schedules as instants (`sameInstant`, R1). The future check runs only
    on a changed instant (R2).
  - Plans: `create-draft`, `create-active`, `patch` and `patch-then-activate`. A promote sends the title
    only (R14).
  - Saving a scheduled draft, or promoting one, opens the activation sheet. The request goes out only
    after the choice there (OC-16, OC-17).
  - The activation sheet is the confirmation: a blue info note (light blue, dark-blue text and border)
    with one line about the choice, the keep/start-at-0 choice, then a plain one-tap button (owner, 2026-09-28).
  - While a request is pending, the back row and the swipe are locked (R13).
- **Schedule sheet.** It shows `DayCalendar` and a native time input defaulting to 06:00, with **Clear** and
  **Confirm** at the bottom (owner, 2026-09-28).
  - Taps only change the pending pick.
  - Confirm applies it and closes. It is disabled until a day is picked, and while the pick is in the past,
    which is shown inline.
  - Clear removes the schedule and closes. It replaces the earlier "Remove schedule" row.
- **Drafts page and draft card.** The card shows the title, the requested units, the schedule (with an
  Overdue pill) and progress by priority. The card opens the draft board; its ⋮ opens the actions.
- **History.** It reads `state=active,closed` and puts a title line on each card (OC-18).
- **Sheets.**
  - Version actions: rows by state, and they open the next surface then dismiss themselves (R19).
  - Requested quantity: saving a Scanner value pins it (v9 §5.22).
  - Refresh confirmation: Keep typed values, or Replace typed values too (tap-again), under the same blue `StockInfoNote` as the activation sheet.
  - Activation, in two modes:
    - Direct, from the actions sheet: it pre-fills from the stored flag and never writes it.
    - Relay, from the form: it hands the choice back and sends nothing itself.
- **Registration.** All 18 stock-report surfaces are registered. `@hookform/resolvers` is a new peer
  dependency.

### Checkpoint 4: calendar-day fix
The schedule sheet mixed local midnight with `DayCalendar`'s UTC-midnight days (`timeZone: 'UTC'`,
the `parseISOToDate` convention).
- **West of UTC:** a tapped 15th was scheduled on the 14th.
- **East of UTC:** the highlight landed a day early, and yesterday was pickable.

`lib/schedule-sheet.ts` now reads and writes calendar days with the UTC getters only. The helpers are
`scheduleDayOf`, `composeScheduleInstant` and `calendarToday`; `startOfLocalDay` was removed. The sheet
also controls the calendar's month, so it opens on the schedule's month, or on today's.

`StockReportScheduleSheetCalendar.test.tsx` renders the **real** calendar. The Los Angeles run in
`test:stock-report` now includes it: the `ScheduleSheet` filter was added.

## Managers app (`src/features/stock-report/`, checkpoint 4, Phase H)
- **Hub layout:** version card, then the missing row, then `[Drafts · n] [History]`, then a full-width
  primary **New version**.
  - Drafts and New version show only for `canManageVersions`.
  - New version is a plain button that opens the form (OC-2).
  - The drafts label reads "Drafts · n" once loaded. It reads plain "Drafts" while loading, on error and
    at 0 (OC-8, ledger #20).
- **Controller.** The create mutation and its phases are gone. It adds `draftCount` (`undefined` until
  loaded), `openDrafts` and `openCreateForm`, and preloads the drafts and form surfaces.
- **Removed:** `StockVersionCreateOverlay` and its tests. The hub has no overlay.
- **Card heading:** `StockVersionProgressCard` is headed by `displayTitle`, not "Current version".

## Playwright (`tests/playwright/features/stock_report/stock-report.spec.ts`, managers)
Rewritten around one stateful mock of the stock-report API. It matches by pathname and records every
call with its body.

It covers 11 flows, each on mobile and desktop:
- **Hub:** titles and counts; the missing list; New version → form → Draft → `POST { draft: true, title:
  <placeholder> }` → drafts page; history (`state=active,closed`).
- **Draft board:** `version_id` on the items request, and the ⋮.
- **Scheduling:** Edit → next month's 15th → activation sheet → Keep the board's counts → `PATCH` with
  exactly the two schedule keys, landing at 06:00 in the browser's time zone.
- **Activate:** Start at 0 → one tap on Activate now → `POST …/activate { keep_active_missing: false }`, with no PATCH
  of the stored flag, then the board closes.
- **Delete:** tap again → `DELETE`, then the board closes.
- **Draft detail:** Follow the live version → `{ quantity_missing: null }` on the versioned route.
- **Live board detail:** Set requested → `PATCH …/versions/srv_1/items/sri_1/requested-quantity
  { quantity_requested: 7 }`.
- **Refresh:** Keep typed values → `POST …/refresh-requested` with no body.

The workers and sellers specs mock empty lists and need no change.

# Reconciled with the shipped backend (v11)

Checked against v11 and the backend source (backend `362e28d`, "step 5: v11 contract"):
- `routers/api_v1/stock_report.py`: every path, query parameter and request body model. The bodies are
  `extra="forbid"` with strict booleans, and every body the frontend sends is accepted.
- `domain/stock_report/serializers.py`: every row, snapshot and version key.
- The command and query services: every response envelope key.
- `_events.py` and `_versions.py`: every event name and `extra` key. The socket handler sends
  `{ client_id, **extra }`, which is the flat shape the frontend schemas parse.
- Error text: `"IDENTITY: sentence"`, which is what the R16 parser expects.

**No change to the app was needed.** v11 §0.0 lists four points where the backend differs from the deltas,
and none of them reaches the client:
1. An active create is accepted with the schedule keys at their defaults. The client never sends them.
2. Neighbours shifting after a row is deleted inside a draft emit snapshot events, which are handled like
   any other.
3. An empty PATCH is accepted and does nothing. The client never sends one.
4. `STOCK_REPORT_SCHEDULE_SUPERSEDED` only appears in logs.

`progress.by_priority` also carries `unset`. The schema drops it, and nothing reads it. The app meets
§0.1 rules 1–12, which include the two rules the production gate depends on: version-filtered snapshot
events, and the refetch set on `:activated`.

**The Playwright mock was aligned with the wire:**
- dates are echoed in UTC `+00:00`, including the schedule sent as `…Z`, so the e2e run exercises R1;
- command responses carry no `progress` or `filtered_snapshot_count`;
- `by_priority.unset` is present;
- the 404 uses the backend's own text.

# Verified

| Check | Result |
|---|---|
| `npm run test:stock-report` | 49 files / 401 tests green; the Los Angeles run is 6 files / 48 tests |
| Managers `src/features/stock-report` | 3 files / 13 tests green |
| `tsc` | Clean for `packages/stock-report`, the workers and sellers apps, and the new spec |
| Managers typecheck | Only the pre-existing `CaseTaskInfoCard` `StatePillVariant` error |
| Managers eslint | 44 problems, from a baseline of 48, none in stock-report; the spec lints clean |

Planted defects were caught at every checkpoint.
- **Checkpoints 2 and 3:** see the commit messages.
- **Checkpoint 4, hub:** five defects — a dot at zero, New version opening the board, Drafts ungated for
  roles that cannot manage versions, the old heading, and the wrong form opener.
- **Checkpoint 4, calendar:**
  - With local getters in `composeScheduleInstant`, only the Los Angeles run fails. That is why the run
    exists.
  - With a local-midnight calendar day, both zones fail.

The root `npm run typecheck` stops at the managers error before later workspaces run, because the chain
uses `&&`. Run the workers and sellers apps on their own.

# Not run: owner's to do
- **The Playwright spec.** It needs a dev server and `PLAYWRIGHT_TEST_EMAIL` / `PASSWORD`. The managers
  e2e baseline is about 55 reds, so compare the set of failing specs, not the count.
- **Device checks:**
  - the schedule sheet's calendar and time input inside the sheet's scroll, including iOS time-input
    styling;
  - swipe-back on the draft board against reorder drags;
  - the form's close interceptor while a promote is in flight;
  - the numeric keyboard on the requested sheet.

# Decisions made while implementing (owner may flip)
- **A new version starts as a Draft.** The plan named no default, and Active closes the live version.
- **Clearing a title in edit sends `null`**, so the version falls back to its creation day. On create, a
  blank title stores the placeholder (OC-7).
- **A create failure shows inline in the form** (`stock-version-form-error`). Update and activation
  failures raise their own toasts.
- **The draft card's ⋮ is a sibling of the card button**, not nested inside it.
- **The schedule calendar opens on the schedule's month.** Before, it opened on the device's current
  month, as the task date sheets still do.
- **`dropStockReportVersionQueries` resets an observed active scope** rather than cancelling it (see
  checkpoint 2).

# Not built (by decision)
- Demoting an active version to a draft.
- `apply-priorities`.
- `live_stock`.
- Text search.
- Browsing closed versions through `version_id`.
- Bulk manual requested.
- A "who set it" for manual values.
- A per-row keep-or-reset choice at activation.
- A bulk missing route.
- A keep choice on a direct active create: v9 rejects the flag there, and its snapshots start at 0.
