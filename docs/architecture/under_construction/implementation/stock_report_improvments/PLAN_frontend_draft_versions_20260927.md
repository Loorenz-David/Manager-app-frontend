---
audience: owner (review), projectionist agent, implementer (same agent as the author)
subject: Stock report — draft versions, scheduled activation, manual requested quantity (frontend plan)
date: 2026-09-27, re-baselined 2026-09-28 on v8, then on v9 (same day)
status: READY FOR IMPLEMENTATION — re-baselined on v7 + v8 + v9 + v10; all 16 owner cards answered; every backend gap and question resolved by v10; round-0 projection (PROJECTION_frontend_draft_versions_20260928.md, AMENDMENTS_REQUIRED) folded in on 2026-09-28 (§5 lists R1–R20 and the ledger items, each against its section). Nothing implemented yet.
projection: PROJECTION_frontend_draft_versions_20260928.md (round 0; its three owner cards were answered inside it and are folded here as OC-17..OC-19)
contract: HANDOFF_TO_FRONTEND_stock_report_snapshots_v7_20260927.md + …_v8_20260927.md + …_v9_20260928.md + …_v10_20260928.md (the later file wins where it restates a section; all four treated as implemented, per PROMPT_frontend_planning_draft_versions_20260927.md; v11 will be the consolidated copy, adding nothing)
gaps: BACKEND_GAPS_draft_versions_20260927.md — G-2 and G-3 shipped in v10 (§5.9, §5.23); Q-1..Q-16 answered (v10 §11). No open gap.
baseline: IMPLEMENTATION_SUMMARY_frontend_snapshots_20260926.md (what ships today)
---

# Stock report — draft versions (frontend)

## 0. What this plan delivers

A manager or admin can prepare versions ahead of time as **drafts**, work on a draft's rows exactly as on
the board, type a requested quantity by hand on any open version, schedule a draft to go live, retitle it,
and activate or delete it. Every other role can read drafts (v7 §5.9, §5.13) but sees none of the
management controls.

**The v8 idea that shapes everything below: a draft is live, not a frozen copy** (v8 §0.0). Its rows'
requested quantities follow Scanner until a user types a value; new Scanner rows join every draft at once;
only activation freezes. What a draft holds of its own is priorities, manual requested values and **typed**
missing counts; a row nobody typed a missing count for borrows the board's current one (v9 §6.6), and
activation asks whether those borrowed counts are kept or reset (v9 §5.17).

The owner's intention, in the order a user meets it:

1. **Hub** (managers tab): the button row becomes `[Drafts · n] [History]`, and `+ New version` moves to a
   third row of its own, full width. `+ New version` opens the **version form** (§F) instead of creating
   on the spot.
2. **Drafts page** (slide): one **draft card** per draft — title (or its creation day), requested units by
   priority with the same segmented progress bars as the active card, its schedule, and a ⋮ that opens
   the **version actions sheet**. Tapping the card opens the **draft board**.
3. **Draft board** (slide): `StockReportBoardView` over that draft's rows (v7 §5.1 `version_id`, live per
   v8 §5.1). Priority, order and missing edits go to the version-scoped routes (v7 §5.14–5.16; v9 §5.16
   for clearing a typed missing count); the requested quantity can be set by hand (v8 §5.22, v9 §5.22).
   The in-scroll header carries the same ⋮ (top right).
4. **Version actions sheet**: Edit version → the form in edit mode; Activate → the **activation sheet**
   (one choice — keep or reset the borrowed missing counts — then a tap-again confirm; v9 §5.17, §0.1
   item 11); Delete draft last (tap-again confirm, v7 §5.20). On the **active** version the same sheet
   offers Edit and Refresh from Scanner (v8 §5.18).
5. **Version form** (slide, one page, no staged form): Draft/Active picker first, then Title with the
   ghost placeholder "Thu, 7th July" (sent as the title when left empty), then — drafts only — the
   schedule field (bottom-sheet calendar with a "Remove schedule" row and a time input). Submitting a
   **scheduled** draft, or promoting a draft to active, first opens the **activation sheet** (item 4) for
   the keep-or-reset choice — worded "when it activates" for a schedule (stored as the draft's flag, v9
   §5.8, §5.19, read by the scheduled activation, §5.21) — and the request is sent after that decision
   (OC-16). Edit mode prefills a version and lets the user retitle, reschedule, or promote a draft to
   active. Demoting an active version to a draft is **not built** (owner, 2026-09-27; no route).

Required by v7 §0.1 + v8 §0.1 and folded into the phases below: snapshot events are applied **per
version** (§D); the version events refetch what they must (§D); a draft page refetches on
`stock_report_item:created` and follows `stock_report_item:updated` (§D, v8 items 7 and 9); the effective
requested value is computed from a snapshot event with v8's one rule (§D, item 8); `active_at: null` is
handled and `state` is read (§A); the history page asks for `state=` (§G); an overdue draft is shown as
overdue (§A, §G). v7 §0.1 item 5 (send the refresh choice on activation) is **void** in v8. From v9 §0.1:
a draft row's `quantity_missing` is shown as it comes, labelled by `quantity_missing_source` (item 10,
§A.3); activation opens a drawer for `keep_active_missing`, pre-filled from the draft's stored flag (item
11, §G.10, §F.4); an active-version snapshot event also updates the draft rows that borrow (item 12, §D.1).
From v10 §0.1: the history page sends `state=active,closed` (item 13, §G.4); the hub badge reads
`GET …/versions/draft-count` and refetches it on `:created | :activated | :deleted` only (item 14, §H, §D.2).

## 1. Inputs and authority

| Question | Authority |
|---|---|
| What people can do and see | the owner's intention (pasted 2026-09-27) + answers of 2026-09-28 |
| Routes, shapes, roles, errors, events | v7, as amended by v8; cited as "v7 §n" / "v8 §n" on every backend interaction |
| What ships today | v6 + `IMPLEMENTATION_SUMMARY_frontend_snapshots_20260926.md` |
| Anything the intention needs and the contract lacks | `BACKEND_GAPS_draft_versions_20260927.md`, never emulated client-side |

Role gates: admin + manager create, activate, refresh, edit and delete (`canManageVersions`, already in
`use-stock-report-permissions.ts`); admin + manager + seller reorder and **set the requested quantity by
hand** (`canPrioritise`, v8 §5.22 uses the priority twins' roles) inside any open version; admin +
manager + worker mark missing (`canMarkMissing`); every role reads drafts.

## 2. Owner cards — decisions the plan makes; the owner's answers so far

Each card states the default the plan builds. Every card is answered as of 2026-09-28; none is open.
OC-17..OC-19 are the projection's three cards, answered by the owner inside the projection file.

- **OC-1 · Time of day for a schedule (§F).** `scheduled_activation_at` is a datetime (v7 §5.8) and no
  time-picker primitive exists in `@beyo/ui`. The schedule sheet shows the `DayCalendar` and, under it, a
  bottom row with a native `<input type="time">` (default `06:00`, local time) styled to the field
  primitives' anatomy (`h-12 rounded-lg border`, the `TextInput` colours). The value sent is
  `toISOString()` (UTC `Z`, which v7 §5.8 accepts); it is echoed back as UTC `+00:00` (v10 §6.7), which
  `Date.parse` reads as well. **Owner 2026-09-28: agreed.**
- **OC-2 · The hub's tap-again create is retired (§H).** `+ New version` opens the form; the form's
  submit is the confirmation (a tap-again `ConfirmActionButton` when the picker says Active, because
  that closes the current version; a plain submit for a draft). `StockVersionCreateOverlay` is deleted.
  **Owner 2026-09-28: confirmed.**
- **OC-3 · The active board gets the same ⋮ (§C, §E).** `StockReportBoardSlidePage` (managers' active
  board) gets the ⋮ for `canManageVersions`, opening the actions sheet with Edit and Refresh from
  Scanner. **Owner 2026-09-28: confirmed.**
- **OC-4 · The refresh choice on activation is VOID (v8 §5.17); v9 brings a different one.** Activation
  now carries `keep_active_missing` — keep or reset the borrowed missing counts (v9 §5.17). Decided in
  OC-15 (the drawer) and OC-16 (the form).
- **OC-5 · Detail page inside a draft (§C).** Tapping a draft row opens the detail page scoped to the
  draft with every detail capability: its numbers are the draft snapshot's, Mark/Unmark missing go to
  v7 §5.16, Add item stays available. **Owner 2026-09-28: confirmed.**
- **OC-6 · History = active + closed (§G, G-2).** **Owner 2026-09-28: the backend will change `state=` to
  accept a comma list**, so the history page sends `state=active,closed` in one request (order unchanged:
  the active version first). Drafts never appear there. **Shipped as v10 §5.9** (G-2 closed): tokens
  trimmed, repeats folded, `all` or any other token is 422. The owner's reply said "active and draft" for
  history — read as a slip for active and **closed**.
- **OC-7 · Title fallback wording (§A).** A version without a title is shown as its creation day
  everywhere; the form's ghost placeholder is the same string, so a form submission always stores a title.
  **Owner 2026-09-28: confirmed, shortened to "Thu, 7th July"** (year appended only when not the current
  one).
- **OC-8 · Drafts button badge (§H).** The **Drafts** button shows "Drafts · n". **Owner 2026-09-28: yes,
  from a dedicated cheap endpoint** — **shipped as v10 §5.23** (G-3 closed): `GET
  …/snapshots/versions/draft-count` → `{ draft_count }`, every role, refetched on `…version:created |
  :activated | :deleted` only (nothing else changes it, v10 §5.23). Wording as §H: "Drafts · n" once
  loaded, plain "Drafts" while loading, on error and at 0 (#20). No first-page fallback.
- **OC-9 · Own schedule sheet (§F).** The package ships its own `stock-report-schedule-sheet` built on
  `DayCalendar` from `@beyo/ui`, with a "Remove schedule" row above the calendar. **Owner 2026-09-28:
  confirmed.**
- **OC-10 · Where the manual requested quantity is edited (§C, §G.7).** **Owner 2026-09-28: one more
  action on the stock need's actions sheet** (the ⋮ sheet of the detail page — the cards carry no ⋮,
  OC-13), "Set requested quantity", opening a further bottom sheet with the `NumberInput`
  primitive (`packages/ui/src/components/primitives/number-input`) and one row of two buttons: **"Back to
  live"** (revert to Scanner's value, v8 §5.22 `null`) and **"Save"** (primary background). The summary
  card shows the source under the count ("manual · Scanner says 5").
- **OC-11 · Showing `active_quantity_missing` on a draft (§A, §C).** **Owner 2026-09-28: a draft shows the
  live version's missing count, unless the draft has its own — then the draft's own.** **v9 moved this
  rule to the backend** (v9 §6.6): a draft row's `quantity_missing` already is the typed value, else the
  board's, else 0, and `quantity_missing_source` (`own | active | none`) says which. The frontend computes
  nothing (A.3): the amber segment, the summary card and the legend sheet read `quantity_missing`; the
  summary card names the source ("missing on the live version" / "missing in this draft"). One difference
  from the owner's sentence: a typed **0** is the draft's own and shows 0 (v9: "the typed value if there
  is one") — it no longer falls back to the board's count; the way back is to clear it (OC-14). The
  missing-only filter stays the backend's and reads the **effective** missing (v10 §5.1): a draft's missing
  board shows the board's missing rows until the draft types over them; a typed 0 leaves it.
- **OC-12 · Refresh from Scanner on the active version (§G.5, §G.9).** **Owner 2026-09-28: ask the user,
  in simple words, before sending.** The row lives in the **version actions menu** (the ⋮ of the active
  board, OC-3; never on a draft, v8 §5.18). Tapping it opens a **refresh confirmation sheet** that says
  what will happen and offers two plain buttons: **"Keep typed values"** (`keep_manual_requested: true` —
  only rows without a typed value take Scanner's number) and **"Replace typed values too"**
  (`keep_manual_requested: false` — every row takes Scanner's number). The request is sent only from that
  sheet.
- **OC-13 · A ⋮ on the stock need cards.** **Owner 2026-09-28: no** — the cards keep their priority tab; the
  stock need's actions sheet is reached from the detail page's ⋮ only.
- **OC-14 · Mark / Unmark missing on a draft row — OPEN (v9 §5.16).** On a draft the detail page's ⋮
  offers three rows instead of two: **"Mark N missing"** (types the ceiling as the draft's own value, as on
  the board), **"Unmark N missing"** (types **0** as the draft's own value — the draft states nothing is
  missing, whatever the board says), and a new **"Follow the live version"** row (`Undo2`, sends `null`, v9
  §5.16), shown only when `quantity_missing_source === "own"`, so a typed value can be cleared and the row
  borrows again — the counterpart of the requested sheet's "Back to live". On the board the ⋮ is unchanged
  (`null` is 422 there, v9 §5.16). **Owner 2026-09-28: confirmed.**
- **OC-15 · The activation drawer (v9 §0.1 item 11) — OPEN.** "Activate now" in the version actions sheet
  no longer confirms in place; it opens an **activation sheet** (§G.10) with one choice — a two-option
  `BoxPicker`, **"Keep the board's counts"** / **"Start at 0"**, pre-selected from the draft's
  `scheduled_activation_keeps_active_missing` — one line of context ("Rows with a missing count typed in
  this draft keep it either way", v9 §5.17 step 4) and a tap-again **"Activate now"** button that sends the
  choice as `keep_active_missing`. **Owner 2026-09-28: confirmed, plus a note container** above the picker
  that explains, in simple words, what activating does and what each choice means for the missing counts
  (§G.10).
- **OC-16 · The same choice when the form schedules or promotes.** **Owner 2026-09-28: no inline field —
  the form reuses the activation sheet.** When the saved draft **has a schedule** (new, moved or unchanged —
  OC-17) the tap on Submit opens the activation sheet (§G.10) in its **"when it activates"** wording,
  pre-selected from the draft's stored `scheduled_activation_keeps_active_missing` (`false` on create); the
  choice is sent as that flag with the create / PATCH (v9 §5.8, §5.19 — what the scheduled activation reads,
  v9 §5.21), so the sheet's "You can change this until then" stays true. When an edited draft is switched
  to Active, the same sheet opens in its **"activate now"** wording and the choice is the activation body
  (v9 §5.17). The request is made **after** the decision, from the form page. No sheet for an unscheduled
  draft or a direct active create (v9 §5.8 rejects the flag there; v10 §5.8: its snapshots start at missing
  0, as v6).
- **OC-17 · Changing the keep flag without moving the date (projection card 1).** **Owner 2026-09-28: (a)** —
  every save of a scheduled draft opens the activation sheet, pre-filled with the stored choice. One extra
  tap on a retitle; the choice is always reachable. Folded into OC-16, F.2 `needsActivationChoice`, F.6.
- **OC-18 · Where a version's title shows once live or closed (projection card 2).** **Owner 2026-09-28: (a)**
  — `displayTitle` (title, else the creation day, OC-7) replaces "Current version" on the hub card (§H),
  "Stock requested MM-DD" in the active board's header (C.3) and heads the history card above its date
  range (G.4; the projection's reading of "version card", to confirm on sight). A retitle is then visible.
- **OC-19 · Merge / deploy order vs strict schemas (projection card 3).** **Owner 2026-09-28: schemas stay
  strict.** The owner deploys the backend (consolidated v11) first, then this frontend; no transition shim,
  no optional-with-defaults window. Implementation proceeds on mocks; only merge or deploy waits (Known
  seams).

## 3. Architecture decisions

### 3.1 One board, many versions: the version scope

Every list read, cache key and row mutation gains a **version scope**: `"active"` (the board, `version_id`
omitted, v7 §5.1) or a version id (`version_id=<srv_…>`). It lives in the filter so it flows wherever the
filter already flows:

```ts
export type StockReportListFilter = {
  majorCategory: MajorCategory | null;
  missingOnly: boolean;
  /** `null` = the active version (the board); an id = that version's rows (v7 §5.1). */
  versionId: string | null;
};
```

List keys become `[...lists(), scope, bucket, majorCategory, mode]` with `scope = versionId ?? "active"`.
The scope sits right after `lists()` so `versionLists(scope)` is a prefix that can restart or remove one
version's lists; the three positional readers (`bucketOfListKey`, `filterOfListKey`, `isMissingListKey`)
shift by one and gain `versionScopeOfListKey`. `lists()` stays the prefix of everything.

The detail page's own entry is scoped the same way: `item(stockNeedId, scope)`.

### 3.2 Sockets: row events reach every scope, snapshot events reach one (v7 §0.1, v8 §0.1)

A **row** event (`stock_report_item:created | :updated | :deleted`) concerns the live row, which every open
version shows; it is applied to every list of every scope (today's behaviour, unchanged). On a draft-scope
list an `:updated` also moves the snapshot's requested along with the row when Scanner's value is in force
(§D.1). A **snapshot** event (`stock_report_item_snapshot:updated`) is applied only to lists whose scope
is the event's `extra.version_id`, with one v9 addition: a snapshot event of the **active** version also
patches, in every draft-scope list, the same row's **borrowed** missing count (v9 §0.1 item 12, §D.1). An
active-scope list's version is **its own rows'** `snapshot.version_id` (non-null on every active-scope row,
v7 §6.6) — not the cached active version, which workers' and sellers' boards never load (R9); an empty
list has nothing to patch, and only "no row and no cached active version" restarts instead of patching.

### 3.3 Navigation is the caller's, never the action's

Actions invalidate and remove caches; pages open and close surfaces. A page that shows one version watches
its own version query and closes itself when that version stops being what the page is for (a draft board
whose version became active or was deleted, §C.4), so both the user's own action and a scheduled or remote
activation end the same way.

### 3.4 What is reused, not rebuilt

`StockReportBoardView`, the board controller, `StockReportSlideHeader` (has an `actions` slot),
`StockVersionProgressBar`, `computeFulfilmentSegments`, `ConfirmActionButton`, `BoxPicker`, `DayCalendar`,
`TextInput`, `DateFieldTrigger`, `ContentCard`, `FieldErrorPill`, `PullToRefresh`, the header-muting
effect, the sheet row style of `StockReportDetailMenuSheetContent` (`ROW_CLASS`). The hub's
three-rows-by-priority block moves from the managers app into the package so the draft card and the hub
card share it (§G.1).

## 4. Contract set

Core `01 02 04(+local) 05 06 08 13 15`; feature bundle `16 07 10 23 24 17 34(+local)`; plus `09_forms`
(the version form and the requested-quantity sheet: react-hook-form + zod, as the task forms),
`21_realtime`, `28_surfaces(+local)`, `30_dynamic_loading(+local)`, `31_animations`,
`32_loading_skeletons`, `35_shared_packages §13/§14`. Excluded: `11_routing` (every screen is a surface),
`12/19` (roles via the existing hook), `38_slide_stack` (the owner removed the hub stack on 2026-09-26).

Build order (16_feature_workflow): types → keys → api + query hooks → actions → realtime → controller
and pages → sheets and form → drafts/history pages → hub → tests → Playwright → docs.

## 5. Projection round 0 — what was folded where

`PROJECTION_frontend_draft_versions_20260928.md` (verdict AMENDMENTS_REQUIRED) — every amendment is in the
section it names; this table is the index. Each code claim was re-verified before folding (zod 4.4.3
offset behaviour, the `canMarkMissing` gate, the socket and action cache sites, the open-then-dismiss
pattern, `BoxPicker`/`ConfirmActionButton` props, the missing peer, the vitest config).

| Item | Folded into |
|---|---|
| Card 1 → OC-17 | OC-16, F.2 `needsActivationChoice`, F.6 |
| Card 2 → OC-18 | C.3, G.4, §H |
| Card 3 → OC-19 | Known seams (deploy order); schemas strict |
| R1 schedule instants (`+00:00`) | F.2, F.6 |
| R2 untouched-schedule validation | F.2, F.6 |
| R3 sellers and the ⋮ | C.2, C.5, G.6, G.8, §I |
| R4 active id from the row | C.2, C.5 |
| R5 detail key order | B.1, D.1, D.2, D.4 |
| R6 `bucketLists` | B.1, E.1, E.8 |
| R7 scoped `onSuccess` seed | E.1, E.8, Verification mutations |
| R8 scoped trailing restart | D.1, D.4 |
| R9 list version from its rows | §3.2, D.1, D.4 |
| R10 `active_quantity_missing` on typed rows | D.1, D.4 |
| R11 drop helper + one toast | C.4, C.5, D.2, E.5, E.7, E.8 |
| R12 exit closes the stack above | C.4, C.5 |
| R13 form chrome + back row | F.1, F.4, F.6 |
| R14 promote body = title only | F.2, F.6 |
| R15 one confirmation on promote | F.3, F.6 |
| R16 identity extraction | B.3, B.5 |
| R17 leaf invalidations | D.1, D.2, E.2, E.5 |
| R18 time-zone-safe tests | F.6 (A.7, F.5 by reference) |
| R19 open-then-dismiss | G.5, G.6, G.8 |
| R20 checkpoints | Verification |
| #20 badge wording | OC-8, §H |
| #22 refresh sheet third line | G.9, G.8 |
| #25 `BoxPicker` per-option disabled | F.3 |
| #26 destructive colours | G.5 |
| #27 `StockReportDetailView` | C.2 |
| #28 Playwright `tap()` | Verification |
| #30 delegation | Verification |
| gate note: `react-hook-form` peer; envelope `{ ok, data }` | F.1, B.5 |

---

## Phase A — schema and view model (`packages/stock-report/src/stock-report.types.ts`)

**A.1 Version schema** (v7 §6.7 minus v8 §6.7, plus v9 §6.7). `StockReportSnapshotVersionSchema` gains:

```ts
state: z.enum(["draft", "active", "closed"]),      // always present (v7 §6.7)
title: NullableString,
active_at: NullableString,                          // null while draft (v7 §0.0 item 2)
scheduled_activation_at: NullableString,
scheduled_activation_keeps_active_missing: z.boolean(),   // v9 §6.7 — present in every state
// no scheduled_activation_refreshes_requested — removed by v8 §6.7
```

`filtered_snapshot_count` and `progress` stay on the read schema. A **command** schema
`StockReportSnapshotVersionRowSchema = StockReportSnapshotVersionSchema.omit({ progress, filtered_snapshot_count })`
is the response of v7 §5.8, §5.17, §5.18, §5.19 (v7 §6.7 last paragraph).

**A.2 Snapshot schema** (v7 §6.6 + v8 §6.6 + v9 §6.6):

```ts
active_at: NullableString,
quantity_requested: z.number(),                       // the value in force (v8: computed)
quantity_requested_scanner: z.number(),               // live on a draft, frozen once active
quantity_requested_source: z.enum(["scanner", "manual"]),
quantity_missing: z.number(),                         // the value in force (v9 §6.6: on a draft, typed else borrowed else 0)
quantity_missing_source: z.enum(["own", "active", "none"]),   // v9 §6.6
active_quantity_missing: z.number().nullable(),       // the raw board value (v8 §6.6, unchanged)
```

`missingQuantityBounds(snapshot)` keeps reading `quantity_requested` (the effective value — v8 §5.16's
ceiling rule is the same arithmetic on that number; the active version's `quantity_resolved` is already
inside `quantity_awaiting` as v6 defines it) and `quantity_missing`, which on a draft is the value in
force (v9 §6.6): `markable` is what is left above the count shown, typed or borrowed.

**A.3 View models.**

`StockReportVersionViewModel` gains:

```ts
isDraft: boolean;                 // state === "draft"
isActive: boolean;                // state === "active"  (was closed_at === null — wrong for drafts)
isOverdue: boolean;               // isDraft && scheduled_activation_at !== null && scheduled < now (v7 §5.21)
displayTitle: string;             // title ?? formatVersionDayTitle(created_at)   (OC-7)
scheduleLabel: string | null;     // "Activates Thu, 7th Oct · 06:00" / "Overdue · was due …" / null
ageLabel: string;                 // unchanged for active/closed; "Draft" for a draft
```

`formatVersionAge(activeAt: string | null, closedAt, now)` returns `"Draft"` when `activeAt` is null.
`scheduled_activation_keeps_active_missing` passes through the spread; the form (F.3) and the activation
sheet (G.10) read it.

`StockNeedCardData` (the row view model) gains `requestedSource: "scanner" | "manual"`,
`requestedScanner: number`, `missingSource: "own" | "active" | "none"` (straight from
`quantity_missing_source`, v9 §6.6) and `activeMissing: number | null`, so the summary card and the two
sheets can say what is in force (OC-10, OC-11, OC-14). `quantities.requested` stays
`snapshot.quantity_requested` and **`quantities.missing` is `snapshot.quantity_missing` in every state**:
v9 §6.6 computes the borrowed value server-side, so the earlier OC-11 client rule (`quantity_missing > 0 ?
… : active ?? 0`) is **dropped**, not reimplemented. `activeMissing` is shown only beside a typed value
("board says N", v9 §0.1 item 10).

**A.4 New pure helpers** (`lib/version-format.ts`, tested):
- `formatVersionDayTitle(iso, now?)` → `"Thu, 7th July"` (weekday short, ordinal day, month long; the
  year appended when not the current one). Own ordinal helper — `@beyo/lib` keeps its private.
- `formatScheduleLabel(iso)` → `"Thu, 7th Oct · 06:00"` (local time, `Intl`).
- `versionScheduleState(version, now)` → `"none" | "pending" | "overdue"`.

**A.5 Fixtures.** `wireStockReportSnapshotVersion` gains the five version keys (state `active`,
`scheduled_activation_keeps_active_missing: false`); new
`wireDraftStockReportSnapshotVersion(overrides)` (state `draft`, `active_at: null`, schedule set) and an
overdue variant. `wireStockReportItemSnapshot` gains the three requested fields (`source: "scanner"`,
`scanner = requested`), `quantity_missing_source: "own"` and `active_quantity_missing`, and accepts
`active_at: null`; a `wireManualRequestedSnapshot` variant has `source: "manual"`; a
`wireBorrowingDraftSnapshot` variant has `active_at: null`, `quantity_missing_source: "active"` and
`quantity_missing === active_quantity_missing` (v9 §6.6).

**A.6 Filter type**: §3.1. `EMPTY_STOCK_REPORT_FILTER.versionId = null`.

**A.7 Tests**: `stock-report.version.types.test.ts` (draft → `isDraft`, `ageLabel "Draft"`, overdue,
`displayTitle` fallback, `isActive` from `state`); `version-format.test.ts` (ordinals 1st 2nd 3rd 4th 11th
12th 13th 21st 22nd 23rd; year suffix; schedule label); `stock-report.types.test.ts` (snapshot
`active_at: null` and the new fields parse; the card carries `requestedSource`; `missingSource` maps
`quantity_missing_source` one-to-one and `quantities.missing` is the wire value on a borrowing draft row).

## Phase B — keys, API, query hooks

**B.1 `api/stock-report-keys.ts`**

```ts
lists: () => [...all, "items", "list"],
versionLists: (scope: StockReportVersionScope) => [...lists(), scope],       // "active" | srv id
list: (bucket, filter) => [...versionLists(filter.versionId ?? "active"), bucket, majorCategory|"all", mode],
versionScopeOfListKey, bucketOfListKey, filterOfListKey, isMissingListKey   // offsets +1
bucketLists: (scope, bucket) => [...versionLists(scope), bucket],           // R6 — the priority admit walks it
items: () => [...all, "items", "detail"],
itemAll: (stockNeedId) => [...items(), stockNeedId],                        // R5 — every scope's entry of one row
item: (stockNeedId, scope) => [...itemAll(stockNeedId), scope],             // scope LAST, so `:deleted` prefix-removes
versions: () => [...all, "versions"],
versionList: (scope?: { states: readonly StockReportVersionState[]; progressPriority: string })
  => scope ? [...versions(), "list", scope.states.join(","), scope.progressPriority] : [...versions(), "list"],
activeVersion: (progressPriority?)                                          // unchanged
version: (versionId, progressPriority?) => [...versions(), "one", versionId, (pp)]   // v7 §5.13
draftCount: () => [...versions(), "draft-count"],                          // v10 §5.23
missingSummary: ()                                                          // unchanged
```

`StockReportVersionState = "draft" | "active" | "closed"`. A list read names the states it wants as an
array; the wire value is the comma list (`state=active,closed`), the same shape as the progress `priority`
param (v10 §5.9, which supersedes v7 §5.9's single value). An empty array omits the param (every state,
drafts first); `"all"` is never a token (422, v10 §5.9).

**B.2 `api/stock-report-api.ts`**

| Function | Contract | Wire |
|---|---|---|
| `fetchStockReportItems(bucket, filter, pagination)` | v7 §5.1, v8 §5.1 | adds `version_id: filter.versionId ?? undefined` |
| `fetchStockReportVersions({ limit, offset, priorities, states })` | v7 §5.9, v10 §5.9 | adds `state: states.join(",")` when non-empty |
| `fetchStockReportVersion(versionId, priorities)` | v7 §5.13 | `GET /snapshots/versions/{id}?priority=` → read schema |
| `createStockReportVersion(body?)` | v9 §5.8 | `{ draft, title, scheduled_activation_at?, scheduled_activation_keeps_active_missing? }`; **both** schedule keys are omitted entirely unless `draft === true` (v7 §5.8 second bullet, v9 §5.8: either key with `draft: false` is 422); `undefined` body = v6 |
| `updateStockReportVersion(versionId, patch)` | v9 §5.19 | `PATCH /snapshots/versions/{id}` with only the keys the caller sets (`title`, `scheduled_activation_at`, `scheduled_activation_keeps_active_missing`); `null` clears the first two; the schedule keys never go to a non-draft |
| `activateStockReportVersion(versionId, { keepActiveMissing })` | v9 §5.17 | `POST …/{id}/activate`, body **exactly** `{ keep_active_missing }` (unknown keys are 422; v7's `refresh_quantity_requested` is never sent) |
| `refreshStockReportVersionRequested(versionId, { keepManualRequested } = { keepManualRequested: true })` | v8 §5.18 | `POST …/{id}/refresh-requested`; body omitted when keep is true → `{ version, changed, added }` |
| `deleteStockReportVersion(versionId)` | v7 §5.20 | `DELETE …/{id}` → `{ client_id }` |
| `setStockReportPriority(stockNeedId, priority, versionId?)` | v7 §5.2 / §5.14, v10 §5.2 | path branches on `versionId` — the board keeps the v6 shortcut (same write and events; only the not-found mapping and the race with an activation differ, v10 §5.2) |
| `reorderStockReportItem(stockNeedId, order, versionId?)` | v7 §5.3 / §5.15 | same |
| `setStockReportMissingQuantity(stockNeedId, value: number \| null, versionId?)` | v7 §5.7 / §5.16, v9 §5.16 | same; `null` (clear a draft's typed value) is sent only with a `versionId` — the shortcut keeps its non-null body |
| `setStockReportRequestedQuantity(stockNeedId, value: number \| null, versionId)` | v8 §5.22, v9 §5.22 | `PATCH /snapshots/versions/{vid}/items/{id}/requested-quantity` `{ quantity_requested }` (the key always present — `{}` is 422) — **`versionId` is required** (no shortcut; the board passes the active version's id) |
| `fetchStockReportDraftCount()` | v10 §5.23 | `GET …/versions/draft-count` → `{ draft_count }` (Zod: `{ draft_count: z.number().int().nonnegative() }`) |

Bodies are typed in camelCase and mapped to snake_case at the boundary, as the existing functions do.

**B.3 `lib/stock-report-request-failure.ts`** gains the v7 §8 + v8 §8 identities with a sentence each:
`STOCK_REPORT_VERSION_NOT_DRAFT` ("Only a draft can do that." — v9 §8 also raises it for `null` missing on
the board and for the keep flag on a non-draft; neither is reachable from this UI), `STOCK_REPORT_VERSION_NOT_ACTIVE` ("Only
the live version can be refreshed."), `STOCK_REPORT_VERSION_IS_CLOSED` ("This version is closed."),
`STOCK_REPORT_SCHEDULE_IN_THE_PAST` ("Pick a time in the future."), `STOCK_REPORT_UNKNOWN_VERSION_STATE`,
`STOCK_REPORT_SOURCE_IS_TARGET`, `STOCK_REPORT_TARGET_VERSION_IS_CLOSED` (the last three never arise from
this UI; mapped for completeness). 404 `Stock report snapshot version not found.` stays the backend sentence.
**Identity extraction (R16, v7 §8 "the leading token of `error`")**: the backend writes
`"STOCK_REPORT_ROW_HAS_NO_PRIORITY: this stock report item has …"` and `ApiRequestError.message` carries it
verbatim, so today's users read the token. `stockReportRequestFailureMessage` parses
`^([A-Z][A-Z0-9_]+):\s*(.*)$`: a known identity → the plan's sentence; an unknown identity → the remainder
after the colon; no token → the message as today; the generic copy for the cases it already covers. Tests:
known token, unknown token, no token.

**B.4 `api/use-stock-report-queries.ts`**
- `useStockReportListQuery(bucket, filter)` — unchanged signature; the key and request carry the scope.
- `useStockReportVersionsQuery({ priorities?, states = [] })` — key `versionList({ states, progressPriority })`.
- `useStockReportVersionQuery(versionId, priorities?)` — v7 §5.13; `retry` skips 404 like the assignments
  query; shared `staleTime`. No `initialData` from the list (progress filters must match, and a stale
  draft preview is worse than one request).
- `useStockReportDraftCountQuery()` — v10 §5.23; shared `staleTime`; always enabled (no availability
  flag any more).
- `useStockReportActiveVersionQuery` — unchanged.

**B.5 Tests**: `stock-report-keys` positional readers; `stock-report-api.test.ts` (each new function's
path, params and body; both schedule keys omitted for `draft: false` and sent for `draft: true`; `state`
omitted for `[]`; `version_id` on items; activate sends exactly `{ keep_active_missing }`; refresh body
only when keep is false; requested-quantity `null` body; missing `null` body only with a version id; the
draft-count read parses the envelope `{ ok: true, data: { draft_count } }` as every read in
`stock-report-api.ts` does); `stock-report-request-failure.test.ts` (R16 rows); `use-stock-report-queries.test.tsx`
(version query 404 no retry; draft count key and fetch).

## Phase C — board, detail and the draft board page

**C.1 Controller** (`controllers/use-stock-report-board-controller.ts`): options gain
`versionId?: string`. The opening filter is `{ majorCategory, missingOnly, versionId: versionId ?? null }`;
`setFilter` preserves `versionId` and `missingOnly`. `openDetail` passes `{ stockNeedId, versionId }`.
`useReorderStockReportItem(bucket, filter)` and `useSetStockReportPriority({ versionId })` receive the scope
(§E.1). Nothing else changes: buckets, the unset auto-switch, reorganise rules and `cards` are the same for
a draft.

**C.2 Detail page** (`surfaces/StockReportDetailSlidePage.tsx`, and `components/detail/StockReportDetailView.tsx`
which threads the new summary props — #27): `StockReportDetailSurfaceProps` gains
`versionId?: string`. The page seeds its entry `item(stockNeedId, scope)` from the lists **of that scope
only** (`getQueriesData({ queryKey: versionLists(scope) })`). **The ⋮ shows for `canMarkMissing ||
canPrioritise`** (R3 — today it is `canMarkMissing` only, `StockReportDetailSlidePage.tsx:110`, which would
hide it from sellers, the very role OC-10 adds a row for). Mark/Unmark use
`useSetStockReportMissingQuantity({ versionId })` — Mark sends the ceiling, Unmark sends `0`; on a draft
both become the draft's **own** value (v9 §5.16). On a draft the sheet also offers **"Follow the live
version"** when `missingSource === "own"`, sending `null` (OC-14, v9 §5.16). The ⋮ sheet
(`StockReportDetailMenuSheetContent`) gains a row **"Set requested quantity"** for `canPrioritise` (OC-10)
opening the requested-quantity sheet (§G.7)
with `{ stockNeedId, versionId: versionId ?? row.snapshot.version_id, current, source, scanner }` — on the
board the active version's id is the row's own `snapshot.version_id` (non-null on an active-scope row, v7
§6.6; v8 §5.22 has no shortcut), so the row never waits on the active-version query, which workers' and
sellers' boards never load (R4). `StockNeedSummaryCard` shows the requested source under the count
when manual ("manual · Scanner says N") and, on a draft, where the missing count comes from
(`missingSource`: "missing on the live version" / "missing in this draft" / nothing for `none`; under a
typed value also "board says N" from `activeMissing`, v9 §0.1 item 10). Assignments, Add item and the
legend are unchanged (OC-5).

**C.3 Board slide page** (`surfaces/StockReportBoardSlidePage.tsx`, the managers' active board): the
header shows the active version's `displayTitle` in place of `stockReportBoardTitle`'s "Stock requested
MM-DD" (OC-18; the date fallback is the creation-day title now). Adds the ⋮ for `canManageVersions` in the in-scroll header's
`actions` slot (OC-3), opening the actions sheet with `{ versionId: activeVersion.data.client_id }` —
rendered only once the active version is known.

**C.4 Draft board page** (new `surfaces/StockReportDraftBoardSlidePage.tsx`,
`STOCK_REPORT_DRAFT_BOARD_SURFACE_ID = "stock-report-draft-board-slide"`, props `{ versionId }`):
- `useStockReportVersionQuery(versionId)` for the header title (`displayTitle`) and the state.
- `useStockReportBoardController({ versionId })`; renders `StockReportBoardView` with
  `header={<StockReportSlideHeader title actions={⋮} onBack />}`; ⋮ (`data-testid="stock-report-draft-board-menu"`,
  `aria-label="Version actions"`, the detail page's three-dot glyph) for `canManageVersions`, opening the
  actions sheet with `{ versionId }`.
- Header-muting effect and `data-testid="stock-report-draft-board-page"` root as the board page.
- **Exit rule**: when the version query resolves to `state !== "draft"` or errors with 404, the page closes
  itself **and every surface stacked above it** (R12: read `useSurfaceStore.getState().stack` from the
  board's index up and `closeMany` them — a detail page or sheet left open would be scoped to a version
  that is gone or live). The toast `notify.info("This draft is now live" | "This draft was deleted")` is
  shown only for a **remote** change: the page skips it when the mutation cache holds a pending or
  successful command for this version id (`getMutationCache().findAll({ mutationKey:
  stockReportMutationKeys.versionCommand(versionId) })`, R11) — the user's own activate/delete already
  toasted from §E. Covers the user's own activate/delete (§E) and a scheduled or remote one (§D).
- Live membership (v8 §5.4): a new Scanner row appears on the next refetch, which `stock_report_item:created`
  triggers for every scope (§D.2). Nothing draft-specific to build.

**C.5 Tests**: controller (`versionId` scope on the key and the wire, detail opener passes it, filter apply
preserves it); detail (scoped seed, scoped PATCH, requested row gated and its props, active id from the
cache on the board, summary lines for manual / borrowed / typed missing; the Follow-the-live-version row
only on a draft with `own`, sending `null`; Unmark sends `0`; **seller → ⋮ visible with only "Set requested
quantity", worker → no requested row** (R3); **no active-version cache → the requested sheet opens with the
row's snapshot version id** (R4)); `StockReportDraftBoardSlidePage.test.tsx` (title, ⋮ gating, self-close on
`state: "active"` and on 404; **detail open above the draft board → `:deleted` → both closed** (R12); no
exit toast when the page's own activate mutation is in the cache, toast on a remote change (R11)).

## Phase D — realtime (`socket-events.ts`, `@beyo/realtime` `socket-types.ts`)

**D.1 Row and snapshot events**

`stock_report_item:updated` (v7 §7, unchanged keys) — as today, applied to every scope. Addition for
**draft-scope lists** (v8 §0.1 item 9): when the patched row's `snapshot.active_at === null` (a draft's
snapshot), mirror `payload.quantity_requested` into `snapshot.quantity_requested_scanner`, and into
`snapshot.quantity_requested` when `quantity_requested_source === "scanner"`. Active-scope snapshots keep
their frozen value. Invalidate `versionList()` and `activeVersion()` — the leaves, never the `versions()`
prefix, which would sweep `draftCount()` (R17, v10 §5.23). The trailing restart stays global here (a row
event concerns every scope).

`stock_report_item:created` — `restartStockReportListQueries(queryClient)` restarts every scope (v8 §0.1
item 7, §5.4); also invalidate `versionList()` (each draft's `snapshot_count` rose — every created row
emits this event, v10 §5.4). **Not** `draftCount()` (v10 §5.23: the count changes on version events only).

`stock_report_item_snapshot:updated` (v8 §7, v9 §7): schema gains `quantity_requested_scanner: z.number().nullable()`
and `quantity_requested_manual: z.number().nullable()`; `quantity_missing` becomes `z.number().nullable()`
(the **stored** value — `null` on a draft row that borrows, v9 §7); `version_id` becomes required
(`z.string()`).
`withSnapshotPatch` computes the **effective requested with v8's one rule** (§0.1 item 8):
`manual ?? scanner ?? row.quantity_requested`, sets `quantity_requested_source = manual !== null ? "manual"
: "scanner"`, and `quantity_requested_scanner = scanner ?? row.quantity_requested`. `applySnapshotUpdate`
walks `lists()` and, per list, resolves the list's version (R9): `versionScopeOfListKey` → the id for a
draft scope; for `"active"` the list's **own rows'** `snapshot.version_id` (any row — they all carry the
active version's id), falling back to the cached active version when the list is empty:
- version unknown (empty active-scope list **and** no active version cached) → the list is restarted, not
  touched;
- version ≠ `payload.version_id` → skipped;
- else the existing patch/move/admit logic, unchanged — with v9 §0.1 item 10's rule for the missing
  count on a draft-scope list (v9 §7 allows "apply the rule or refetch"): a number → `quantity_missing =
  it`, `quantity_missing_source = "own"`; `null` → `quantity_missing = row.snapshot.active_quantity_missing
  ?? 0`, source `"active"` or `"none"`. On the active scope `quantity_missing` is always a number (own).
- **v9 §0.1 item 12 — the active version's event also reaches the drafts**: when `payload.version_id` is
  the active version (R9: an active-scope row's `snapshot.version_id`, else the cached active version),
  **every** non-active scope list row (and scoped detail entry) with the same `stock_report_item_id` gets
  `active_quantity_missing = payload.quantity_missing` (R10 — the "board says N" line under a typed value
  must not go stale); the rows whose `quantity_missing_source !== "own"` also get `quantity_missing =
  payload.quantity_missing` and source `"active"` — borrowed rows follow the board, typed rows keep their
  number. The active-scope row itself gets `active_quantity_missing = quantity_missing` (v8 §6.6: on the
  active version the two are the same number). Missing-mode draft lists are **restarted** instead of
  patched (membership may change: the filter reads the effective missing, v10 §5.1). Every emission carries
  all eight keys, `null` where there is no value (v10 §7) — the handler parses them as required-nullable.
- **The trailing restart is scoped (R8)**: after patching, `applySnapshotUpdate` restarts
  `versionLists(eventScope)` only — plus, for an active event, every draft scope (item 12) — instead of
  today's global `restartStockReportListQueries` (`socket-events.ts:164,172`). The global restart stays for
  a parse failure and for an unknown scope. A draft edit no longer refetches the workers' boards on the
  floor, and a refresh emitting N events restarts the active scope N times at most, not every scope.
The detail entry is patched only when `item(stockNeedId, scope)` matches the same version (plus the
borrowed-missing patch above); both `patchDetailEntry` helpers (`socket-events.ts:61`,
`use-stock-report-actions.ts:38`) take the scope (R5). Invalidations: `missingSummary()` and
`activeVersion()` when the version is the active one; `version(payload.version_id)` and `versionList()`
always (a draft's progress follows its effective missing, v9 §6.8). Never the `versions()` prefix (R17).

**D.2 Version events** (v7 §7 as amended by v8 §7, §0.1 item 2):

| Event | Handler |
|---|---|
| `…version:created` | `extra.state === "draft"` → invalidate `versionList()`, `draftCount()`. Otherwise as today (restart lists, invalidate `activeVersion()`, `versionList()`, `missingSummary()`). Parse failure → the v6 path. |
| `…version:closed` | unchanged |
| `…version:activated` (new; `extra`: `snapshot_count`, `title`, `scheduled`, `keep_active_missing` — v9 §7) | `dropStockReportVersionQueries(queryClient, "active")` and, for every draft scope, restart (R11 helper, below) — activation emits no per-row events and after it every draft borrows from the **new** active version (v10 §7), so an open draft board refetches at once while the closed board's lists are dropped; invalidate `versionList()`, `activeVersion()`, `version(client_id)`, `draftCount()`, `missingSummary()` |
| `…version:refreshed` (new; `extra` adds `keep_manual_requested`) | `restartStockReportListQueries(queryClient, versionLists("active"))` and `versionLists(client_id)`; invalidate `versions()`, `missingSummary()` |
| `…version:updated` (new; `extra`: `title`, `scheduled_activation_at`, `scheduled_activation_keeps_active_missing` — v9 §7) | invalidate `versionList()` and `version(client_id)` — also how a superseded or same-minute-skipped schedule (v8 §5.21, v9 §5.21) reaches the UI |
| `…version:deleted` (new) | `dropStockReportVersionQueries(queryClient, client_id)`; invalidate `versionList()`, `draftCount()` |
| `stock_report_item:deleted` | as today — restarts every scope (v7 §5.4) and removes the row's detail entries of **every** scope with `removeQueries(itemAll(id))` (R5); also invalidate `versionList()` (draft `snapshot_count` fell) |

**One version-drop helper (R11)** — `dropStockReportVersionQueries(queryClient, scope)` in
`stock-report-list-cache.ts`, shared by D.2 (`:activated`, `:deleted`), E.5 and E.7: for `versionLists(scope)`
and `version(id)` (a draft) it **removes** the queries nobody observes and, for the observed ones (a mounted
draft board, its detail page), `cancelQueries` without a refetch — the page's exit rule (C.4) closes it, so
no skeleton flash and no refetch against a deleted version. Today's `removeQueries(lists())` in
`useCreateStockReportVersion` (`use-stock-report-actions.ts:207–212`) was written for a board that is never
on screen; this helper is what replaces it wherever a page may be mounted.

**D.3 `socket-types.ts`**: `stock_report_item_snapshot:updated` gains `quantity_requested_scanner: number |
null`, `quantity_requested_manual: number | null` and `quantity_missing: number | null`; `…version:created`
gains `state`, `title`; the four new event signatures with v8 §7 + v9 §7's `extra` keys
(`keep_active_missing` on `:activated`, `scheduled_activation_keeps_active_missing` on `:updated`).

**D.4 Tests** (`socket-events.test.ts`): a draft snapshot event leaves the active lists untouched and
patches the draft's list; an active event leaves a draft's list untouched; unknown active id → restart
only; the effective-requested rule (manual set; manual null + scanner set; both null → row value; source
flips); a row `:updated` moves a draft snapshot's scanner/requested but not a manual one and not an active
one; a draft event with `quantity_missing: null` borrows (`active ?? 0`, source `active`/`none`) and a
number types (`own`); an **active** event patches a draft list's borrowing row and leaves its typed row
alone, and restarts a missing-mode draft list; **an active event sets `active_quantity_missing` on a
draft's typed row too, without touching its `quantity_missing`** (R10); **a draft event restarts no
active-scope list** (R8); **an active-scope list's version comes from its rows, no active-version cache
needed** (R9); **`:deleted` removes the row's detail entry of every scope** (R5); each version event's
invalidation/removal set (leaves, never `versions()`, R17); `item:created` restarts every scope.
Mutation-check the version filter, the effective-requested rule and the borrow rule.

## Phase E — actions (`actions/use-stock-report-actions.ts`)

**E.1 Row edits take the scope.** `useSetStockReportPriority({ versionId }?)`, `useReorderStockReportItem(bucket,
filter)` (reads `filter.versionId`), `useSetStockReportMissingQuantity({ versionId }?)`. **Every cache walk
in `use-stock-report-actions.ts` is scoped (R7)** — `onMutate` snapshot and patch, `onError` rollback, the
`onSuccess` **response-row seed** and `patchDetailEntry`: priority (`:101, :119, :124, :130, :133`), missing
(`:172, :180, :185, :191, :196`) all walk `versionLists(scope)` instead of `lists()`, and the priority admit
walks `bucketLists(scope, destination)` (R6; unscoped it would match nothing after the key change and the
optimistic move would silently stop). The response of a versioned route carries **that version's**
snapshot (v7 §5.14), so seeding it into every scope's lists would repaint the board with a draft's row —
the v7 §0.1 defect through the response path. `onSettled` restarts `versionLists(scope)`; the version
invalidations become `version(id)` + `versionList()` for a draft, `activeVersion()` + `missingSummary()` for
the board. Error toasts unchanged. `useSetStockReportMissingQuantity` takes `quantityMissing: number |
null` (v9 §5.16): a number patches `quantity_missing = n`, `quantity_missing_source = "own"`; `null`
(drafts only) patches `quantity_missing = active_quantity_missing ?? 0` and the matching source; the
missing-mode drop-at-zero rule reads the effective value as today.

**E.2 `useSetStockReportRequestedQuantity({ versionId })`** (v8 §5.22, new): `mutate({ stockNeedId, value:
number | null })`. Optimistic: patch the row's snapshot in `versionLists(scope)` and the scoped detail entry
— `quantity_requested = value ?? quantity_requested_scanner`, `source = value === null ? "scanner" :
"manual"`; on the active scope also clamp `quantity_missing` to `max(0, min(missing, requested − (in_queue +
in_progress + awaiting)))` (v8 §5.22 clamps at once; the server's row replaces it on success). `onError`
rollback + `notify.error("Requested quantity not changed", …)`. `onSuccess` replaces the row.
`onSettled` restarts `versionLists(scope)` and invalidates `version(scopeId)` + `versionList()` (draft) or
`activeVersion()` + `versionList()` + `missingSummary()` (active) — the leaves, never `versions()` (R17).

**E.3 `useCreateStockReportVersion()`** — `mutate(body)` (v8 §5.8). `onSuccess(row, body)`: draft →
invalidate `versionList()`, `draftCount()`; active → as today (`removeQueries(lists())`, invalidate
`activeVersion()`, `versionList()`, `missingSummary()`).

**E.4 `useUpdateStockReportVersion(versionId)`** (v8 §5.19): no optimistic write. `onSuccess(row)` merges
the row into every cached `version(versionId, *)` entry (keeping its `progress`), invalidates `versionList()`
and `activeVersion()` (a retitled active version).

**E.5 `useActivateStockReportVersion(versionId)`** (v9 §5.17): `mutate({ keepActiveMissing: boolean })` →
body `{ keep_active_missing }`, nothing else. `onSuccess`: `dropStockReportVersionQueries(queryClient,
"active")` and `dropStockReportVersionQueries(queryClient, versionId)` (R11 — the draft board observing them
may still be mounted; it closes itself, C.4), invalidate `versionList()`, `activeVersion()`,
`version(versionId)`, `draftCount()`, `missingSummary()` (R17). Toast "Version is live" — E.5 and E.7 own
the toasts; C.4 toasts only on a remote change (R11). `mutationKey: stockReportMutationKeys.versionCommand(versionId)`
on E.4–E.7 is what C.4 reads.

**E.6 `useRefreshStockReportVersionRequested(versionId)`** (v8 §5.18, active version only):
`mutate({ keepManualRequested })`. `onSuccess({ changed, added })` → `restartStockReportListQueries(queryClient,
versionLists("active"))` and `versionLists(versionId)`; invalidate `versions()`, `missingSummary()`; toast
"Refreshed from Scanner · N changed, M added". A 422 `STOCK_REPORT_VERSION_NOT_ACTIVE` reads "Only the
live version can be refreshed."

**E.7 `useDeleteStockReportVersion(versionId)`** (v7 §5.20): `onSuccess` →
`dropStockReportVersionQueries(queryClient, versionId)` (R11), invalidate `versionList()`, `draftCount()`;
toast "Draft deleted".

All version commands: `onError` → `notify.error(<verb> failed, stockReportRequestFailureMessage(error))`.
None is optimistic (server-side bulk transactions, the listed exception); E.2 is, because it is one row.

**E.8 Tests** (`use-stock-report-actions.test.tsx`): scoped optimistic patch touches only the scope's lists;
**a draft missing edit's response leaves an active-scope list holding the same row byte-identical** (R7);
the existing destination-admit test stays green with `bucketLists(scope, bucket)` (R6); requested-quantity
set/revert/clamp and rollback; missing `null` borrows optimistically and rolls back; each command's request
and invalidation/removal set (mock the api module; leaves, not `versions()`); activate sends
`{ keep_active_missing }` as given; the drop helper cancels an observed query and removes an unobserved
one (R11); draft create does not drop the board.

## Phase F — version form and schedule sheet

**F.1 Surface** `STOCK_REPORT_VERSION_FORM_SURFACE_ID = "stock-report-version-form-slide"` (slide), props
`{ versionId?: string }` — absent = create. Page `surfaces/StockReportVersionFormSlidePage.tsx`, content
`components/versions/StockVersionForm.tsx` (pure, prop-driven, react-hook-form inside — **add
`react-hook-form` to `packages/stock-report/package.json` peers**, as `@beyo/task-creation` declares it;
gate note). The page mutes the surface header and draws the in-scroll `StockReportSlideHeader` with a back
row, like every sibling page (R13). Note `header.requestClose` **is** the surface's `onClose`
(`SlidePageSurface.tsx:181`) and bypasses `setCloseInterceptor`; only the swipe and the surface's own close
button are intercepted — so F.4 also disables the back row while pending.

**F.2 Model** (`lib/version-form.ts`, tested):

```ts
const StockVersionFormSchema = z.object({
  state: z.enum(["draft", "active"]),
  title: z.string().trim().max(200),                          // trimmed first, then capped (v10 §5.8); "" = the placeholder (OC-7)
  scheduledAt: z.string().datetime({ offset: true }).nullable(), // R1: zod 4.4.3 rejects "+00:00" without the flag; the backend never echoes "Z" (v10 §6.7)
});
// Refinements take the ORIGINAL (edit mode) so an untouched value never fails (R2):
const buildFormSchema = (original: { scheduledAt: string | null } | null) => StockVersionFormSchema
  .refine(v => v.state === "draft" || v.scheduledAt === null, { path: ["scheduledAt"] })
  .refine(v => v.scheduledAt === null || sameInstant(v.scheduledAt, original?.scheduledAt) || Date.parse(v.scheduledAt) > Date.now(),
          { message: "Pick a time in the future.", path: ["scheduledAt"] });
```

Instants, not strings (R1): the form loads `scheduledAt = original ? new Date(original).toISOString() :
null` and every comparison in this module is `sameInstant(a, b) = Date.parse(a) === Date.parse(b)` — never
`a === b`, or the backend's `…+00:00` echo against the form's `….000Z` reads as "changed", a retitle would
resend `scheduled_activation_at`, and an overdue draft would get a 422 `STOCK_REPORT_SCHEDULE_IN_THE_PAST`
on every save. The future-refine applies only when `scheduledAt` differs (by instant) from the original
(R2): an **overdue** draft can be retitled, promoted and unscheduled. Picking **Active** in the form clears
`scheduledAt` in form state (`setValue("scheduledAt", null)`, R2) — the field is hidden anyway (F.3) and
activation clears the schedule itself (v9 §5.17 step 5).

`toCreateBody(values, placeholderTitle, keepActiveMissing?)` → v9 §5.8 body (`title = values.title.trim()
|| placeholderTitle`; `scheduled_activation_at` and `scheduled_activation_keeps_active_missing` only when
`draft`, the flag only when the sheet was shown — either key with `draft: false` is 422).
`toUpdateBody(values, original, keepActiveMissing?)` → the v9 §5.19 diff: only changed keys (instants
compared, R1); `scheduledAt` cleared → `scheduled_activation_at: null`; the flag only when given; never a
schedule key (date or flag) for a non-draft — and for **`patch-then-activate` the body is `title` only**
(R14: the target state is active, activation clears the schedule itself, v9 §5.17 step 5), with E.4 skipped
altogether when the title is unchanged. `formPlan(values, original)` → `create-draft | create-active |
patch | patch-then-activate`, and `needsActivationChoice(values, original)` → `"schedule" | "activate" |
null`: `"schedule"` whenever the plan stores a **draft with a schedule** — new, moved or unchanged (OC-17);
`"activate"` for `patch-then-activate`; else `null`. The keep value is never a form field: it comes from
the activation sheet (§G.10) and is passed into the body builders. Editing an active version never offers
Draft (owner, 2026-09-27).

**F.3 Layout** (the intention's order; every field in a `ContentCard`, label row
`text-sm font-medium text-muted-foreground` + `FieldErrorPill`, as the task forms):
1. **State** — `BoxPicker mode="single" columns={2}` options Draft (`FileClock`) / Active (`Play`). Edit mode
   of an active version: Active selected and **both options `disabled`** (`options[].disabled` — `BoxPicker`
   has no component-level `disabled`, #25).
2. **Title** — `TextInput` `placeholder={formatVersionDayTitle(createdAt ?? now)}`, `maxLength={200}`.
3. **Schedule** (draft only) — `DateFieldTrigger value={formatScheduleLabel(scheduledAt)} placeholder="No
   scheduled activation"` → opens the schedule sheet (F.5). Edit mode shows an **Overdue** pill in the label
   row when `versionScheduleState === "overdue"` (v7 §5.21). Helper line under the field: "Activation
   freezes what Scanner says at that moment; values typed by hand are kept" (v8 §5.17, §5.21).
4. **Submit** — full-width. **Create active version** (no sheet follows, OC-16) → tap-again
   `ConfirmActionButton` with `confirmLabel="Confirm Tap"` (the hub's restyle: primary background,
   dark-pearl-green fill). **Publish this draft** (promote) → a **plain** primary `type="submit"`: the
   activation sheet's "Activate now" is the one confirmation (R15 — two tap-agains in a row otherwise).
   Draft → plain `type="submit"` "Create draft" / "Save changes". Disabled while pending.

**F.4 Submit plan → actions** (the page owns the wiring, the form stays pure). On Submit the page first
asks `needsActivationChoice`: `"schedule"` or `"activate"` → it opens the activation sheet (§G.10) with
`{ mode, initialKeep, onConfirm(keep) }` and **waits**; the sheet closes itself on confirm and the page
then runs the row below with `keep`; a dismissed sheet leaves the form as it was, nothing sent (OC-16).
`null` → the row runs at once.

| Plan | Calls | Then |
|---|---|---|
| `create-draft` | E.3 with `draft: true` (+ the schedule, + the keep flag when the sheet ran) | close the form; if the drafts page is not open, open it (`isOpen(STOCK_REPORT_DRAFTS_SURFACE_ID)`) |
| `create-active` | E.3 with `draft: false` | close the form; open the board slide (as today's create) |
| `patch` | E.4 (+ the keep flag when the sheet ran) | close the form |
| `patch-then-activate` | E.4 (title diff, if any) then E.5 with `{ keepActiveMissing: keep }` (v9 §5.17: the body, not the stored flag, decides) | close the form; the draft board beneath closes itself (C.4) |

While pending the page sets the surface's close interceptor (`setCloseInterceptor`) **and disables the
in-scroll back row** (R13: the back row calls `requestClose`, which is `onClose` and bypasses the
interceptor), so neither a swipe nor a tap can leave a half-applied `patch-then-activate`.

**F.5 Schedule sheet** `STOCK_REPORT_SCHEDULE_SURFACE_ID = "stock-report-schedule-sheet"` (sheet, headerless
like the other stock-report sheets, `pb-4`), props `{ current: string | null; onSelect: (iso: string | null)
=> void }`:
- top row: a plain `ROW_CLASS` button "Remove schedule" (`CalendarX`), shown only when `current !== null`;
  calls `onSelect(null)` and closes. No tap-again: a cleared schedule is one tap to restore.
- `DayCalendar mode="single"` with `selected` from `current`, `disabled={{ before: today }}`.
- time row (OC-1): a native `<input type="time">` (`step={300}`, default `06:00`, preset from `current`'s
  local time) in a labelled row "Time" styled like the field primitives.
- picking a day (or changing the time with a day selected) composes a local `Date`, emits
  `toISOString()`, and closes on the day pick. Past instants are refused inline ("Pick a time in the
  future.") — the same rule as v7 `STOCK_REPORT_SCHEDULE_IN_THE_PAST`.

**F.6 Tests**: `version-form.test.ts` (bodies for each plan; neither schedule key on `draft: false`; the
flag only when given; placeholder title substitution; diff patch; no demotion plan for an active original;
`needsActivationChoice`: new schedule → `"schedule"`, changed schedule → `"schedule"`, **retitle of a
scheduled draft → `"schedule"`** (OC-17), unscheduled draft → `null`, promote → `"activate"`; **R1: edit a
draft whose stored schedule is `2026-10-05T04:00:00+00:00` (v10 §6.7's own example), change only the
title → body `{ title }`, `sameInstant` true, no `scheduled_activation_at`**; **R2: an overdue draft can be
retitled, promoted and have its schedule removed; a changed past instant is refused**; **R14: a scheduled
draft promoted with no title change → E.5 only, no E.4**); `StockVersionForm.test.tsx` (schedule hides on
Active and `scheduledAt` is cleared in form state; overdue pill; both picker options disabled in
edit-active; promote submit is a plain button, create-active is tap-again — R15);
`StockReportScheduleSheetPage.test.tsx` (remove row only with a value; emits ISO; time input composes;
past refused); `StockReportVersionFormSlidePage.test.tsx` (each plan's action calls and surface calls, with
mocked actions; the activation sheet opened with the right mode and initial value before a scheduled
create / patch / promote, the request sent only after its `onConfirm` with that keep value, and nothing
sent when it is dismissed; activate called with `{ keepActiveMissing }`; **pending → back row disabled and
the swipe intercepted** (R13)). **Time-zone safety (R18)**: `packages/stock-report/vitest.config.ts` pins no
`TZ`, so every expectation involving "06:00 local", `toISOString()` or `formatVersionDayTitle` is built from
local constructors (`new Date(2026, 9, 7, 6, 0).toISOString()`, `new Date(2026, 6, 7)`), never from an ISO
literal; the format and schedule suites additionally run under two `TZ` values (`Europe/Stockholm`,
`America/Los_Angeles`) via a small `vitest --config` matrix in `test:stock-report`, so a day-boundary flip is
caught. Applies to A.7 and F.5's tests as well.

## Phase G — drafts page, draft card, history page, sheets

**G.1 Shared priority block** — new `components/versions/StockVersionPriorityProgress.tsx` (package): the
three High/Medium/Low rows (`StockVersionProgressBar` + `completed/target`, "Nothing prioritised yet")
lifted verbatim from the managers' `StockVersionProgressCard`, which then renders it. Testids unchanged.

**G.2 Draft card** — new `components/versions/StockDraftVersionCard.tsx` (pure):
props `{ version: StockReportVersionViewModel; canManage: boolean; onPress(); onMenu() }`.
Layout: title row (`displayTitle`, `truncate`) + ⋮ (`aria-label="Version actions"`,
`data-testid="stock-draft-card-menu-{id}"`, `canManage` only) → subtitle
`formatVersionRequested(progress.quantity_requested)` (live on a draft, v8 §5.9) → schedule line
(`scheduleLabel`; `StatePill` "Overdue" `variant="danger"` when overdue) → `StockVersionPriorityProgress`.
The card body is a button (`data-testid="stock-draft-card-{id}"`); the ⋮ stops propagation.

**G.3 Drafts page** — `surfaces/StockReportDraftsSlidePage.tsx`,
`STOCK_REPORT_DRAFTS_SURFACE_ID = "stock-report-drafts-slide"` (slide), props `{}`. Title "Draft versions".
`useStockReportVersionsQuery({ states: ["draft"] })` (v7 §5.9), `PullToRefresh`, the history page's
skeleton / error / load-more, empty state "No drafts yet — create one from the stock page". Rows:
`StockDraftVersionCard` with `onPress → open(DRAFT_BOARD, { versionId })`, `onMenu → open(VERSION_ACTIONS,
{ versionId })`. Preloads the draft board and the actions sheet. Root `data-testid="stock-report-drafts"`.

**G.4 History page** (`StockReportVersionHistorySlidePage.tsx`, OC-6, v10 §5.9): `useStockReportVersionsQuery({
states: ["active", "closed"] })` — one request, the active version first by the backend's order.
`StockVersionCard` gains a **title line** (`displayTitle`, OC-18) above its date range, reads `state` for
its "Active" pill and tolerates `active_at: null`.

**G.5 Version actions sheet** — `STOCK_REPORT_VERSION_ACTIONS_SURFACE_ID = "stock-report-version-actions-sheet"`
(sheet, headerless, `pb-4`), props `{ versionId }`. Page `surfaces/StockReportVersionActionsSheetPage.tsx`
reads `useStockReportVersionQuery(versionId)` (its own key; skeleton = three `ROW_CLASS` pulses) and the
commands of §E; content `components/sheets/StockReportVersionActionsSheetContent.tsx` (pure), rows in
`ROW_CLASS`:

| Row | Shown for | Does |
|---|---|---|
| Edit version (`Pencil`) | draft, active | `openAndDismiss(VERSION_FORM, { versionId })` |
| Refresh from Scanner (`RefreshCw`) | **active only** (v8 §5.18) | `openAndDismiss(REFRESH_CONFIRM, { versionId })` (G.9, OC-12) |
| Activate now (`Play`) | draft | `openAndDismiss(ACTIVATE, { versionId })` — the activation sheet (G.10, OC-15, v9 §0.1 item 11) |
| Delete draft (`Trash2`, `ConfirmActionButton` with `backgroundColor="var(--color-destructive)"`, `fillColor` a darker destructive, `textColor`/`confirmTextColor` white, `borderColor` the same — the primitive has no destructive variant, #26; last) | draft | E.7; on success `requestClose()` |

`openAndDismiss(id, props)` is the house pattern (R19, `TaskDetailMenuSheetPage.tsx:62–69`):
`useSurfaceStore.getState().open(id, props)` **first**, then `header.requestClose()` — the destination opens
on top at once while the menu animates away beneath it, so closing the destination returns to the page
under the menu. G.6's "Set requested quantity" uses the same order.

No refresh option on Activate (v8 §5.17); the keep-or-reset choice lives in the activation sheet (v9
§5.17). Closed versions never reach this sheet. Every row is disabled while any of the sheet's mutations
is pending.

**G.6 Stock need actions sheet** (`StockReportDetailMenuSheetContent`, existing; reached from the detail
page's ⋮ only, OC-13): gains the row "Set requested quantity" (`PencilLine`) for
`canPrioritise` (OC-10), before Mark/Unmark, and — after Unmark — the row **"Follow the live version"**
(`Undo2`, OC-14, v9 §5.16); props gain `canMarkMissing: boolean`, `onSetRequested?: () => void` and
`onFollowLive?: () => void` (each callback absent → its row hidden; the detail page passes `onFollowLive`
only on a draft whose row has `missingSource === "own"`). **Mark, Unmark, Follow and the "Nothing to mark"
empty line (`StockReportDetailMenuSheetContent.tsx:65`) render only when `canMarkMissing`** (R3): a seller
sees the one requested row; a worker sees no requested row.

**G.7 Requested-quantity sheet** (OC-10) — `STOCK_REPORT_REQUESTED_SURFACE_ID = "stock-report-requested-sheet"`
(sheet, headerless, `pb-4`), props `{ stockNeedId; versionId; current: number; source: "scanner" | "manual";
scanner: number }`. Content `components/sheets/StockReportRequestedSheetContent.tsx` (pure):
- a label row "Requested quantity" with the source beside it ("typed by hand" / "from Scanner: N");
- `NumberInput` (`@beyo/ui`, `min={0}`, `step={1}`, `inputMode="numeric"`, `unitLabel="units"`,
  `value` prefilled with `current`, `onValueChange`), the same anatomy as `ItemQuantityField`;
- one row of two buttons: **"Back to live"** (secondary: `border border-border bg-card text-primary`,
  `Undo2`; disabled when `source === "scanner"`; calls E.2 with `null`) and **"Save"** (primary:
  `bg-primary text-card`; disabled while the value is empty or not an integer ≥ 0, and — only when
  `source === "manual"` — while it equals the stored value; on a Scanner row saving the shown number
  **pins** it (v9 §5.22); calls E.2 with the value). Both then `requestClose()`. Zod: integer ≥ 0 (v8
  §5.22 request validation mirrored; the key is always sent, v9 §5.22).

**G.9 Refresh confirmation sheet** (OC-12) — `STOCK_REPORT_REFRESH_SURFACE_ID = "stock-report-refresh-sheet"`
(sheet, headerless, `pb-4`), props `{ versionId }`. Content
`components/sheets/StockReportRefreshSheetContent.tsx` (pure), in the sheet's row style:
- a short explanation in three lines, always all three (#22 — the list cache is partial, so it cannot say
  whether any row is manual): "The live version keeps the quantities it was frozen with." / "This takes
  today's Scanner quantities instead." / "Rows with a quantity typed by hand — choose what happens to them.";
- **"Keep typed values"** (primary `bg-primary text-card`, `RefreshCw`) → E.6 `{ keepManualRequested: true }`;
- **"Replace typed values too"** (secondary `border border-border bg-card`, `Undo2`) → E.6 `{
  keepManualRequested: false }` — a tap-again `ConfirmActionButton` (`confirmLabel="Tap again to replace"`),
  since it discards work;
- both disabled while pending; on success `requestClose()` and the E.6 toast ("N changed, M added").

**G.10 Activation sheet** (OC-15, OC-16, v9 §0.1 item 11) — `STOCK_REPORT_ACTIVATE_SURFACE_ID =
"stock-report-activate-sheet"` (sheet, headerless, `pb-4`). One sheet, two callers, two wordings:

| Prop set | Opened by | Wording |
|---|---|---|
| `{ mode: "activate", versionId }` | the version actions sheet (G.5) | activate now |
| `{ mode: "schedule" \| "activate", title, scheduledAt?, initialKeep, onConfirm(keep) }` | the version form on Submit (F.4) | when it activates / activate now |

Page `surfaces/StockReportActivateSheetPage.tsx`: with `versionId` it reads
`useStockReportVersionQuery(versionId)` for the title and the stored flag and wires E.5 itself; with
`onConfirm` it is pure relay — it calls back and closes, the form page sends the request (§3.3). Content
`components/sheets/StockReportActivateSheetContent.tsx` (pure):
- a title line — "Activate <displayTitle>" / "Schedule <displayTitle>" with the schedule label under it;
- a **note container** (OC-15; the muted `bg-muted rounded-lg p-3 text-sm` box the task forms use for
  helper notes) with three short lines in plain words. Activate: "The live version closes. This draft takes
  its place and its quantities freeze." / "Rows where you typed a missing count keep it." / "For the other
  rows, choose what happens to the missing counts the live version has today: keep them, or start at 0."
  Schedule: "On <Thu, 7th Oct · 06:00> the live version closes, this draft takes its place and its
  quantities freeze." / "Rows where you typed a missing count keep it." / "For the other rows, choose what
  happens **when it activates** to the missing counts the live version has then: keep them, or start at
  0. You can change this until then.";
- `StockKeepMissingPicker` (new shared `components/versions/StockKeepMissingPicker.tsx`: `BoxPicker`
  single, **"Keep the board's counts"** (`PackageCheck`) / **"Start at 0"** (`PackageX`)), pre-selected from
  `scheduled_activation_keeps_active_missing` / `initialKeep` (v9 §5.17 "pre-fill the drawer from it");
- the confirm button: activate → **"Activate now"**, tap-again `ConfirmActionButton` (primary fill, "Tap
  again to activate"); schedule → **"Schedule activation"**, a plain primary button (a schedule is
  reversible, no second tap). Disabled while pending (activate mode); on confirm `requestClose()` — in
  activate mode after E.5 succeeds (the draft board beneath closes itself, C.4), in relay mode at once.
In activate mode the picker's value is **not** written to the draft's stored flag (v9 §5.17: manual
activation uses only the body; the stored flag is the scheduled activation's). In schedule mode it becomes
that stored flag, through the form's create / PATCH body.

**G.8 Tests**: `StockDraftVersionCard.test.tsx` (title fallback, overdue pill, ⋮ gating, propagation);
`StockReportDraftsSlidePage.test.tsx` (state param, cards, openers); history page (`state=active,closed`);
`StockReportVersionActionsSheetContent.test.tsx` (rows by state, refresh only on active, delete tap-again
gating); sheet page (action calls and close order; Activate opens the activation sheet; refresh opens the
confirm sheet; **open-then-dismiss order** — the destination is opened before `requestClose`, R19);
refresh sheet (two buttons → the two bodies, tap-again on replace; three lines always);
activation sheet (pre-selected from the stored flag / `initialKeep`; activate mode: tap-again, E.5 called
with the chosen flag, the stored flag untouched; schedule mode: wording with the schedule label, plain
button, `onConfirm(keep)` then close, no request of its own); detail menu (requested row gated; follow-live
row gated; **`canMarkMissing: false` → only the requested row, no empty line**, R3); history card (title
line, OC-18); requested sheet (Save
disabled when empty/invalid, and when unchanged only on a manual row — a shown Scanner value can be saved
to pin it, v9 §5.22; Back to live disabled on a Scanner value; calls with value / `null`).

## Phase H — managers hub (`apps/managers-app/…/src/features/stock-report/`)

- `StockReportHubView`: button row `[Drafts · n] [History]` (`stock-report-hub-open-drafts`,
  `stock-report-hub-open-history`; two columns for managers, one otherwise), then a third row
  `+ New version` (`stock-report-hub-create-version`, full width, primary, plain button → `onCreateVersion`
  opens the form) for `canManageVersions`. The count renders as "Drafts · n" once loaded, "Drafts" while
  loading or on error, and "Drafts" (no dot) at 0 (OC-8, v10 §5.23).
- `use-stock-report-hub-controller`: drop the create mutation, `createPhase`, `createErrorMessage`,
  `dismissCreateFailure`; add `openDrafts`, `openCreateForm`, `draftCount` (from
  `useStockReportDraftCountQuery`, `undefined` until loaded), preload the drafts and form surfaces.
- `StockReportHub`: no overlay. `StockVersionCreateOverlay.tsx` and its tests are deleted (OC-2).
- `StockVersionProgressCard`: renders `StockVersionPriorityProgress` (G.1); its heading becomes the
  version's `displayTitle` (OC-18) in place of "Current version" (the empty state keeps its own copy).
- Tests: hub view (three controls; "Drafts · n" / "Drafts" per #20; the card heading is the title, then
  the day fallback), controller (openers, no create), hub (no overlay).

## Phase I — registrations, exports, docs

- `surface-ids.ts`: eight new ids, props types, `lazyPage` entries, preload exports, registrations
  (`slide`: draft board, drafts, version form; `sheet`: version actions, schedule, requested quantity,
  refresh confirmation, activation). The
  managers registry spreads `stockReportSurfaces` already; workers and sellers need no change for the
  version surfaces. **Sellers do reach the requested-quantity sheet** (they open the detail page from their
  board, have `canPrioritise`, and see the ⋮ after R3), which the spread registry covers too.
- `index.ts`: new schemas/types (`StockReportVersionState`, `StockReportVersionScope`, the body types),
  `formatVersionDayTitle`, `formatScheduleLabel`, `StockVersionPriorityProgress`, `StockDraftVersionCard`,
  `StockKeepMissingPicker`, `StockVersionForm`, the sheet contents, the new query hooks and actions, the
  ids and preloads. Pages
  stay loader-only (§14).
- After implementation: `IMPLEMENTATION_SUMMARY_frontend_draft_versions_<date>.md` beside this plan; update
  the two stock-report memory notes.

## Verification

Unit (`npm run test:stock-report`; managers `npm run test --workspace managerbeyo-app-managers`; realtime
package): every test named in A.7, B.5, C.5, D.4, E.8, F.6, G.8, H. Mutation-check the load-bearing rules
(socket version filter, the effective-requested rule, the borrow rule of D.1, the schedule-key omission
on `draft: false`, the §5.19 diff, the exit rule of C.4, the optimistic missing clamp of E.2, and three from
the projection: "walk `lists()` in `onSuccess`" (R7), "string compare in the schedule diff" (R1),
"`canMarkMissing` gate on the ⋮" (R3)). `npm run typecheck` (packages + the three apps; the managers app's
pre-existing `CaseTaskInfoCard` error is not ours). Lint from the app roots.

**Checkpoints (R20).** The work closes in four green gates, each ending with `npm run typecheck` and the
package's tests green before the next starts, so a defect in the key layout is caught before any UI is
built on it: (1) A + B — schema, keys, api, queries; (2) C + D + E — scope, sockets, actions (R5–R11 and
the named mutations live here); (3) F + G — form and sheets; (4) H + I and Playwright. Whether each gate is
also a `CHECKPOINT (not approved):` commit is the owner's call (nothing is committed without it).

**Delegated (#30, FC).** Helper names, the file split inside `lib/`, and icon choices not named here are
free within this package's naming conventions.

Playwright (`tests/playwright/features/stock_report/stock-report.spec.ts`, managers, mobile then desktop;
owner starts the servers): mocks gain `state`/`version_id` branching on the existing pathname routes plus
the new routes. Flows added: hub shows Drafts/History and the third-row New version; New version → form →
Draft → submit → `POST` body `{ draft: true, title: <placeholder> }` → drafts page shows the card; card →
draft board with `version_id` on the items request and the ⋮; ⋮ → Edit → pick a schedule → Submit →
activation sheet ("when it activates") → "Keep the board's counts" → Schedule activation → `PATCH
…/versions/{id}` `{ scheduled_activation_at, scheduled_activation_keeps_active_missing: true }`; ⋮ →
Activate → activation sheet → "Start at 0" → tap again → `POST …/activate` `{ keep_active_missing: false }`
→ draft board closed; ⋮ → Delete (tap
again) → `DELETE`; draft detail ⋮ → Follow the live version → `PATCH …/missing-quantity` `{
quantity_missing: null }`; detail ⋮ → Set requested quantity → `PATCH …/requested-quantity`
`{ quantity_requested: 7 }`; active board ⋮ → Refresh → "Keep
typed values" → `POST …/refresh-requested` with no body. The existing "creates a new version
behind a tap-again confirm" flow is rewritten to the form. Card taps inside `PullToRefresh` (the drafts
page, the history page) use `tap()` / `press()` on mobile — `PullToRefresh` swallows synthetic clicks (#28).
Baseline: diff the failing spec set, not the count (~55 pre-existing reds).

Device checks to report: the schedule sheet's calendar and time input inside the sheet's scroll (iOS time
input styling); swipe-back on the draft board vs reorder drags; the form's close interceptor while a
promote is in flight; the numeric keyboard on the requested sheet.

## Known seams / out of scope

- **Deploy order (OC-19):** the schemas are strict (`state`, `quantity_requested_source`,
  `quantity_missing_source`, … required on every row). Today's v6 backend sends none of them, so this
  frontend deploys **after** the backend's consolidated v11 is live; until then the branch is verified on
  mocks and Playwright routes only. No transition shim.
- Demoting an active version to a draft is skipped by owner decision (2026-09-27); G-1 is withdrawn.
- G-2 (comma-list `state=`) and G-3 (draft count) shipped in v10 (§5.9, §5.23); nothing degrades any more.
  Q-1..Q-16 are answered in v10 §11 — none changed a shape; the ones that changed a sentence here are the
  title cap (trim first, F.2), the draft-count refetch set (D.1, D.2), the `:activated` list handling (D.2)
  and the missing-only reading on a draft (OC-11, D.1).
- Not built: `apply-priorities` (v7 §5.10), `live_stock`, text search, closed-version browsing through
  `version_id`, bulk manual requested (v8 §9), a "who set it" for manual values (v8 §9), per-row keep or
  reset at activation and a bulk missing route (v9 §9).
- A direct active create (`draft: false`) offers no keep-or-reset choice: v9 §5.8 rejects the flag there
  and its snapshots start at missing 0, as v6 (v10 §5.8).
- Same-minute scheduling (v9 §5.21) needs nothing of its own: the skipped draft arrives as `:updated` with
  its schedule cleared, exactly like a superseded one.
- Scheduled activations do not fire on a bare local backend (v7 §9); "Overdue" is how a local tester sees
  a past schedule. A superseded schedule (v8 §5.21) arrives as `:updated` with the schedule cleared — the
  card simply loses its schedule line; no dedicated copy.
