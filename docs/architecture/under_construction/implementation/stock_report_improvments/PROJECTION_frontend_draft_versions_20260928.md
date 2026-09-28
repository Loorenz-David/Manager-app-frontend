---
plan: PLAN_frontend_draft_versions_20260927.md
role: projection
round: 0
verdict: AMENDMENTS_REQUIRED
date: 2026-09-28
actor: Claude (Opus 5.5), fresh projection session
write perimeter: this file only. No plan, contract or code edited.
---

# Projection — draft versions (frontend), round 0

## Opening (owner-readable)

The plan is sound in its shape and follows the backend contract (v7 to v10) closely; every backend claim I checked held.
The problems are in how the plan meets the code that already exists. Three would ship broken with every test green:
editing any scheduled draft (the saved date comes back in a format the plan's form check rejects), sellers never
reaching "Set requested quantity" (the ⋮ they would tap is hidden for their role), and the cache key for the detail
page (the new layout breaks how a deleted row gets cleaned up). None of these needs a redesign. Each is a paragraph
added to the plan. Three things need you (below). After that, the plan author folds the amendments in and
implementation can start.

## Owner answers (2026-09-28) — all three cards settled

- **Card 1 → (a).** Every save of a scheduled draft (new, moved or unchanged schedule) opens the activation sheet
  in its "when it activates" wording, pre-selected from the stored `scheduled_activation_keeps_active_missing`.
  Plan fold: OC-16, F.2 `needsActivationChoice` returns `"schedule"` whenever the saved draft has a schedule (not
  only when new or changed), F.6 row "retitle of a scheduled draft → `null`" becomes `"schedule"`. The sheet keeps
  "You can change this until then".
- **Card 2 → (a).** The version's title (fallback: its creation day, OC-7) is the version card's title and the
  slide pages' header name. Plan fold: the hub's `StockVersionProgressCard` shows `displayTitle` in place of
  "Current version"; `StockReportBoardSlidePage` headers with `displayTitle` in place of "Stock requested MM-DD"
  (`stockReportBoardTitle`); the draft board already does (C.4). *Projection reading, not stated by the owner:*
  "version card" also covers the history page's `StockVersionCard` (title line above the date range) — confirm
  while folding if unsure.
- **Card 3 → strict schemas stay.** The owner is the only developer on both sides and deploys the backend first,
  then the frontend. No transition shim; no merge gate beyond that ordering.

## ⚠ OWNER DECISIONS REQUIRED (0 — the three below are answered above; kept for the record)

**Card 1: Can the "keep or reset" choice of a scheduled draft be changed without moving its date?**
- *Story:* On Monday you schedule the Upholstery draft for Thursday 06:00 and pick "Start at 0". On Wednesday you
  change your mind and want the board's counts kept. The activation sheet told you "You can change this until
  then", but the form only asks again when the date changes. So you have to move the schedule to 06:05 and back.
- *Branches:* (a) Every save of a scheduled draft opens the sheet, pre-filled with the stored choice. That is one
  extra tap on a retitle, but the choice is always reachable. (b) The sheet opens only when the date changes, as
  planned. The sheet's sentence "You can change this until then" is then removed.
- *Recommendation:* (a). The sheet already pre-fills, so the extra tap costs little and the promise stays true.
- *On silence:* the gate holds. The plan is not amended on this point.
- *Trace:* OC-16, F.2 `needsActivationChoice`, G.10 schedule wording.

**Card 2: Where does a version's title show once it is live or closed?**
- *Story:* You name a draft "Autumn push" and activate it. The hub card still says "Current version", the board
  header says "Stock requested 09-28", and the history card shows only dates. You can retitle the live version from
  the ⋮, but nothing on screen changes, so the edit looks broken.
- *Branches:* (a) The title (or its day fallback) replaces "Current version" on the hub card, "Stock requested …"
  on the board header, and the date line on history cards. (b) The title shows on drafts only, and Edit on the
  active version offers no title field.
- *Recommendation:* (a). A title you can edit has to be visible somewhere, and the fallback keeps untitled versions
  looking as they do today.
- *On silence:* the gate holds.
- *Trace:* §0 item 5, C.3, G.4, Phase H `StockVersionProgressCard` ("copy unchanged").

**Card 3: May the frontend merge before the backend's draft-versions release is live?**
- *Story:* The new schemas require `state`, `quantity_requested_source`, `quantity_missing_source` and others on
  every board row. Today's backend (v6) sends none of them. If this frontend deploys first, every board, including
  the workers' and sellers' tabs, fails to read its rows and shows the error state until the backend catches up.
  The backend repository has no trace of the draft routes yet.
- *Branches:* (a) Keep the schemas strict, as the house rule wants. Hold the merge or deploy until the backend's
  consolidated v11 is live, and run e2e on mocks meanwhile. (b) Make the new fields optional with v6 defaults for a
  transition window, and tighten them later.
- *Recommendation:* (a). Strict parsing is what caught past backend regressions, and a transition shim is one more
  thing to remember to remove.
- *On silence:* the gate holds. Implementation can proceed; only merge or deploy waits.
- *Trace:* A.1, A.2, D.1 schema; v7 §0.2; `backend/app` (no `quantity_missing_source`, no `draft-count`).

## Gate notes

- This project is not laid out as a pipeline (no intention document, no master plan, no `handoffs/` folder). The
  authority is the owner's answered cards plus v7–v10, and this file sits beside the plan in place of
  `handoffs/reviewer/`. The plan has no lettered criteria or trace cells. Its per-phase test lists and the
  seven named mutations in Verification were projected as the criteria.
- Every v7–v10 citation I sampled resolves and says what the plan claims. That covers v10 §5.1 (the missing filter
  is effective), §5.8 (trim, then cap), §5.9 (comma list), §5.23, §6.7 (`+00:00` echo) and §7 (8 keys, activation
  is silent); v9 §5.16, §5.17 and §5.22; and v8 §5.18 and §5.22.
- Verified in code: `useSurface().isOpen`, `SurfaceHeaderValue.setCloseInterceptor`, and `close(id)` removing a
  non-top surface (`ui/src/providers/SurfaceProvider.tsx:244`). Also verified: the `StockReportSlideHeader.actions`
  slot, `StatePill variant="danger"`, `NumberInput` `unitLabel`/`inputMode`, `DayCalendar disabled` (Matcher), and
  `DateFieldTrigger onPress`. `react-hook-form` is not yet a peer of `@beyo/stock-report`
  (`packages/stock-report/package.json`); task-creation declares it, so add the peer.

## Decision ledger

Classification: **PG** = plan gap (amendment proposed) · **IG** = intention/owner gap (card) · **FC** = free choice
(delegate in writing). Severity: **S1** ships broken with green tests · **S2** visible defect or waste · **S3** clarity.

| # | Decision point | Class | Sev | Proposed routing |
|---|---|---|---|---|
| 1 | F.2 `scheduledAt: z.string().datetime()` vs the backend echo `…+00:00` (v10 §6.7) | PG | S1 | See R1 |
| 2 | F.2 future-refine and the Active-refine on a prefilled edit form | PG | S1 | See R2 |
| 3 | Sellers reaching "Set requested quantity" | PG | S1 | See R3 |
| 4 | Active version id for the requested sheet on the board | PG | S1 | See R4 |
| 5 | `item(stockNeedId, scope)` segment order | PG | S1 | See R5 |
| 6 | `bucketLists` missing from B.1 | PG | S1 | See R6 |
| 7 | Response-row seeding in `onSuccess` walks every scope | PG | S1 | See R7 |
| 8 | The socket handlers' trailing blanket restart | PG | S2 | See R8 |
| 9 | How a list learns which version it shows | PG | S2 | See R9 (improvement) |
| 10 | Item-12 borrow patch skips `active_quantity_missing` on typed rows | PG | S2 | See R10 |
| 11 | `removeQueries` on observed draft-board queries (E.5, E.7) | PG | S2 | See R11 |
| 12 | Draft board exit rule vs surfaces stacked above it | PG | S2 | See R12 |
| 13 | Form page: header treatment and the in-scroll back row vs the close interceptor | PG | S2 | See R13 |
| 14 | `patch-then-activate` body: which schedule keys | PG | S2 | See R14 |
| 15 | Two tap-again confirms in a row on promote | PG | S2 | See R15 |
| 16 | Keep flag changeable without moving the date | IG | S2 | Card 1 — answered (a) |
| 17 | Title visibility on active and closed versions | IG | S2 | Card 2 — answered (a) |
| 18 | Merge or deploy ordering vs strict schemas | IG | S1 | Card 3 — answered: backend deploys first; schemas stay strict |
| 19 | Identity extraction for B.3 | PG | S2 | See R16 |
| 20 | Badge at 0: OC-8 "always renders" vs H "Drafts (no dot)" | PG | S3 | Pick H's wording and strike "always renders" from OC-8 |
| 21 | `versions()` prefix invalidations sweep `draftCount` | PG | S3 | See R17 |
| 22 | G.9 `hasManualRows` from a partial cache | PG | S3 | Always show the third line; drop the cache read |
| 23 | Time-zone-dependent tests (A.4, F.5, F.6) | PG | S2 | See R18 |
| 24 | Sheet-to-sheet handoff order (G.5 rows) | PG | S3 | See R19 |
| 25 | `BoxPicker` has no component-level `disabled` (F.3) | PG | S3 | Disable per option (`options[].disabled`); in edit-active both options are disabled and Active is selected |
| 26 | `ConfirmActionButton` has no destructive variant (G.5 Delete) | PG | S3 | Name the colours (e.g. `backgroundColor="var(--color-destructive)"`, fill and text), or delegate as FC |
| 27 | Summary-card props flow through `StockReportDetailView` | PG | S3 | Add `components/detail/StockReportDetailView.tsx` to C.2's files; thread `requestedSource`, `requestedScanner`, `missingSource`, `activeMissing` |
| 28 | Playwright taps on cards inside `PullToRefresh` | PG | S3 | Drafts-page card taps use `tap()`/`press()` on mobile (PullToRefresh swallows synthetic clicks); note it in Verification |
| 29 | Plan size: 9 phases, about 40 test groups, one session | FC | S3 | See R20 |
| 30 | Helper names, file split inside `lib/`, and the icon choices not named | FC | S3 | Delegate explicitly: "free within the naming conventions of this package" |

## Amendments (R-numbers cited by the ledger)

**R1 · Schedule instants, not strings (S1, rule 17, verified).** Installed `zod@4.4.3` rejects offsets by default:
`z.string().datetime().safeParse("2026-10-05T04:00:00+00:00")` → `false`; `{ offset: true }` → `true`. The backend
never echoes `Z` (v10 §6.7). Amend F.2 in three ways:
(a) Normalise when the form loads: `scheduledAt = original ? new Date(original).toISOString() : null`, and keep
`z.string().datetime()` for the form's own values, or use `{ offset: true }`.
(b) `toUpdateBody` and `needsActivationChoice` compare **instants** (`Date.parse(a) === Date.parse(b)`), never
strings. Otherwise `…+00:00` vs `….000Z` reads as "changed". A pure retitle would then open the sheet and send
`scheduled_activation_at`, which is a 422 `SCHEDULE_IN_THE_PAST` on an overdue draft.
(c) F.6 gains a row: edit a draft whose stored schedule is `…+00:00`, change only the title → body `{ title }` and
`needsActivationChoice === null`. Fixture seam: v10 §6.7 example `2026-10-05T04:00:00+00:00`.

**R2 · Validation of an untouched schedule (S1).** As written, an overdue draft (past `scheduledAt`, which F.3
anticipates with its Overdue pill) cannot be saved at all, because the future-refine fails on the prefilled
value. It cannot be retitled or promoted. Switching an edited scheduled draft to Active also fails the first refine
on a field the user can no longer see. Amend:
(a) The future-refine applies only when `scheduledAt` differs (by instant) from the original.
(b) Picking Active clears `scheduledAt` in form state (`setValue("scheduledAt", null)`), or the refine ignores
`scheduledAt` when `state === "active"` and the body builders drop it.
F.6 gains three rows: an overdue draft can be retitled, promoted, and have its schedule removed.

**R3 · Sellers and the detail ⋮ (S1).** `StockReportDetailSlidePage.tsx:110` shows the ⋮ only for
`permissions.canMarkMissing` (admin, manager, worker; `use-stock-report-permissions.ts:40`). Sellers have
`canPrioritise` but not `canMarkMissing`, so Phase I's "sellers do reach the requested-quantity sheet" is false as
planned. Amend:
- C.2: `showMenu = canMarkMissing || canPrioritise`.
- G.6: the menu props gain `canMarkMissing`. The Mark, Unmark and Follow rows and the "Nothing to mark" empty line
  (`StockReportDetailMenuSheetContent.tsx:65`) render only when it is true. A seller sees one row.
- Test rows: seller → ⋮ visible with only "Set requested quantity"; worker → no requested row.

**R4 · Active version id on the board (S1).** Workers' and sellers' boards (`route-entry.tsx`) never read
`useStockReportActiveVersionQuery`, so "the cached active-version query" is empty there, and C.2 hides the row
forever for sellers. Every board row already carries the id: `row.snapshot.version_id` is the active version's id
on an active-scope row (v7 §6.6, `version_id` non-null). Amend C.2 to
`versionId: versionId ?? row.snapshot.version_id`, and drop the "hidden while unknown" clause. Test: open the
detail page with no active-version cache → the requested sheet opens with the row's snapshot version id.

**R5 · Detail key order (S1).** With `item(id, scope) = [...items(), scope, id]`,
`removeQueries({ queryKey: item(id) })` in `socket-events.ts:182` (`stock_report_item:deleted`) can no longer
prefix-match across scopes. A deleted row's draft-scope detail entry would survive with `gcTime: Infinity`. Amend
B.1:
- `itemAll: (id) => [...items(), id]` and `item: (id, scope) => [...items(), id, scope]`.
- `:deleted` removes `itemAll(id)`.
- Both `patchDetailEntry` helpers (`socket-events.ts:61`, `use-stock-report-actions.ts:38`) take the scope.
- D.4 gains a row: `:deleted` removes the entry of every scope.

**R6 · `bucketLists` (S1).** B.1 omits it, but `useSetStockReportPriority` uses it to admit the moved row into
destination lists (`use-stock-report-actions.ts:119`). Unscoped after the key change, it matches nothing (the scope
now sits where the bucket was), and the optimistic move silently stops. Amend B.1:
`bucketLists(scope, bucket) => [...versionLists(scope), bucket]`. E.1 names it. The existing E.8 test for the
destination admit must stay green.

**R7 · Every cache walk in the mutations is scoped (S1).** E.1 says "optimistic patches walk
`versionLists(scope)`". That misses `useSetStockReportMissingQuantity.onSuccess` (`:190–196`), which writes the
**response row** into every list holding it. The versioned response carries *that version's* snapshot (v7 §5.14),
so a draft edit would overwrite the board's row with the draft snapshot until the refetch lands. That is the exact
defect v7 §0.1 warns about, reintroduced through the response path instead of the socket. Amend E.1: *every*
`getQueriesData(lists())` in `use-stock-report-actions.ts` (onMutate, onError rollback, onSuccess seed,
`patchDetailEntry`) walks `versionLists(scope)`. Enumerate the sites: priority (`:101,:119,:124,:130,:133`),
missing (`:172,:180,:185,:191,:196`). E.8 gains a row: a draft missing edit's response leaves an active-scope list
holding the same row byte-identical. Named mutation: "walk `lists()` in `onSuccess`".

**R8 · Say what happens to the trailing restart (S2).** `socket-events.ts:164` and `:172` restart **every** list
after patching. D.1 is silent on whether they stay. If they stay, the version filter only prevents a wrong optimistic
paint. Every draft edit still refetches every mounted list, including workers' boards on the floor, and a refresh
emitting N snapshot events triggers N full restarts. Recommend:
- Restart `versionLists(eventScope)`, plus, for an **active** event, the draft scopes (item 12).
- Keep the full restart only on parse failure and on unknown scope.
- D.4 gains a row: a draft event restarts no active-scope list.

**R9 · Resolve a list's version from its own rows (S2, improvement).** D.1 resolves `"active"` through the cached
active version and restarts when it is absent, which is always the case on workers' and sellers' devices (R4).
Simpler and exact: the version of an active-scope list is its rows' `snapshot.version_id`, and an empty list has
nothing to patch. For item 12's "is this event the active version's?", check any active-scope row's
`snapshot.version_id` or the cached active version, whichever answers. Keep "unknown → restart" only for "no row and
no cache". This removes the dependence on `activeVersion` entirely from the socket layer.

**R10 · Typed rows go stale on "board says N" (S2).** Item 12 patches only `quantity_missing_source !== "own"` rows.
But C.2 shows `activeMissing` ("board says N") precisely under a **typed** value. Amend D.1 item 12:
- Every draft-scope row with that item id gets `active_quantity_missing = payload.quantity_missing`.
- Only non-`own` rows also get `quantity_missing` and the source.
- The active-scope row's own `active_quantity_missing` equals its `quantity_missing` (v8 §6.6); patch it too.
- D.4 gains a row.

**R11 · One version-drop helper (S2).** E.5 does `removeQueries(lists())` and E.7 does
`removeQueries(versionLists(id))` + `removeQueries(version(id))` while the draft board observing them is still
mounted. Existing code only did this when "the board is never on screen" (`use-stock-report-actions.ts:207–212`).
Removing observed queries yields a pending or skeleton flash, or a refetch against a deleted version that errors
before the exit rule closes the page. D.2's `:activated` row already specifies the right rule ("restart observed,
remove the rest"). Amend:
- E.5, E.7 and D.2 (`:activated`, `:deleted`) share one helper, e.g. `dropStockReportVersionQueries(queryClient, scope)`
  (observed → `cancelQueries` + no refetch, left for the page's exit rule; unobserved → `removeQueries`).
- Toasts, choose one: E.5's "Version is live" and E.7's "Draft deleted" **or** C.4's exit toasts. As written, the
  user's own activate or delete shows two. Recommend: C.4 toasts only when no local mutation for that id is pending
  or just settled (`useIsMutating` on a key including the version id), or drop E.5/E.7's toasts.

**R12 · The exit rule closes what sits on top of it (S2).** When a draft is activated or deleted remotely while its
detail page (or a sheet) is open above the draft board, C.4 closes only the board. The detail page stays, scoped to a
version that is gone (edits → 404) or now live (edits hit the board through the versioned route, which is fine but
confusing). Amend C.4: on exit, `closeMany` the draft board **and every surface above it in the stack** (read
`useSurfaceStore.getState().stack` from the board's index up). Test row: detail open above the draft board →
`:deleted` → both closed.

**R13 · Form page chrome and the interceptor (S2).** F.1 does not say whether the form page mutes the surface
header and draws an in-scroll `StockReportSlideHeader` like every sibling page. If it does, note that
`header.requestClose` **is** `onClose` (`SlidePageSurface.tsx:181`) and bypasses `setCloseInterceptor`. Only the
swipe and the surface's own close button are intercepted. Amend F.4: while pending, the in-scroll back row is
`disabled` as well as the interceptor set. Test row: pending → back row disabled, swipe intercepted.

**R14 · `patch-then-activate` sends the title only (S2).** "Never a schedule key for a non-draft" is ambiguous
between the original's state (draft → keys allowed) and the target state (active). Activation clears the schedule
itself (v9 §5.17 step 5), so amend F.2: for `patch-then-activate`, `toUpdateBody` carries `title` only, and E.4 is
skipped when the title is unchanged. F.6 row: a scheduled draft promoted with no title change → E.5 only.

**R15 · One confirmation for promote (S2).** For "Publish this draft", F.3 makes the form's submit a tap-again
`ConfirmActionButton`, then F.4 opens the activation sheet whose "Activate now" is a second tap-again. Recommend:
- Promote: the form's submit is a plain button, and the sheet confirms.
- "Create active version": keeps its tap-again, since it opens no sheet (OC-16).

**R16 · Error identity parsing (S2).** v7 §8: the identity is "the leading token of `error`". The backend writes
`"STOCK_REPORT_ROW_HAS_NO_PRIORITY: this stock report item has …"`
(`backend/app/beyo_manager/services/commands/stock_report/set_stock_report_item_priority_order.py:80`), and
`ApiRequestError.message` carries it verbatim. So today's users read the token. Amend B.3:
- Parse `^([A-Z][A-Z0-9_]+):\s*(.*)$`. A known identity → the plan's sentence. An unknown identity → the remainder
  after the colon.
- No token → as today.
- Test rows: known token, unknown token, no token.

**R17 · Narrow invalidations (S3).** D.1 (`item:updated`), E.2 and E.5 invalidate the `versions()` prefix, which
includes `draftCount()`. That contradicts D.1's own "Not `draftCount()`" and v10 §5.23. Name the leaves instead:
`versionList()`, `activeVersion()`, `version(id)`, plus `draftCount()` only where v10 lists it.

**R18 · Time-zone-safe tests (S2, rule 2).** `packages/stock-report/vitest.config.ts` pins no `TZ`. The
"06:00 local", `toISOString()` and "Thu, 7th July" rows have one exact expected value only per time zone. Amend
A.7/F.6: build expectations from local constructors (`new Date(2026, 9, 7, 6, 0).toISOString()`), never ISO
literals. Alternatively, run the format and schedule tests under two `TZ` values (e.g. `Europe/Stockholm`,
`America/Los_Angeles`) where a day boundary can flip `formatVersionDayTitle(created_at)`.

**R19 · Sheet handoff order (S3).** The house pattern is open-then-dismiss (`TaskDetailMenuSheetPage.tsx:62–69`:
the destination opens at once and the menu animates away beneath it). G.5 writes `requestClose(), then open(…)`.
Align G.5 and G.6's `onSetRequested` with the house pattern.

**R20 · Checkpoints (FC, recommended).** One session implementing A–I closes about 40 test groups at once. Declare
four checkpoints, each closing green (typecheck and the package's tests) with a `CHECKPOINT (not approved):` commit:
- (1) A+B: schema, keys, api, queries.
- (2) C+D+E: scope, sockets, actions. This is where R5–R11 live, and where the named mutations run.
- (3) F+G: form and sheets.
- (4) H+I and Playwright.

A defect in the key layout is then caught before any UI is built on it.

## Criteria decidability (per phase, both questions)

| Rows | Test writable now? | Fixture producible by the installed dependency or the contract? |
|---|---|---|
| A.7 | Yes, after R18 | Yes. v9 §6.6 and v10 §6.7 shapes; `+00:00` dates parse with `Date.parse` |
| B.5 | Yes. "draft-count parses `{ data: { draft_count } }`" should read the envelope `{ ok: true, data: { draft_count } }` (`stock-report-api.ts:18`) | Yes |
| C.5 | Yes, after R3, R4, R12 | Yes |
| D.4 | Yes, after R5, R8, R10. Unknown-active row changes meaning under R9 | Yes. v10 §7: 8 keys, nullable, always present |
| E.8 | Yes, after R7, R11 | Yes. Versioned responses carry that version's snapshot (v7 §5.14) |
| F.6 | **No, until R1 and R2.** The edit-mode rows have no producible fixture under the plan's schema: the server's own echo fails it | Producibility fixed by R1 (`zod@4.4.3` verified) |
| G.8 | Yes; the "manual line gated" row is removed by #22 | Yes |
| H | Yes, after #20 | Yes |
| Verification mutations (7) | Each maps to a test row above. Add: "walk `lists()` in onSuccess" (R7), "string compare in the schedule diff" (R1), "`canMarkMissing` gate on the ⋮" (R3) | — |

## Non-authoritative appendix

None. No skeleton is attached, by design.
