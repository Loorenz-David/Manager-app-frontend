# Clock kiosk — agent documentation INDEX

**Read this file first, and only this file, before any clock-kiosk work.**
It routes your intention to the smallest set of zone docs that answer it.
Reading zone docs you weren't routed to wastes context; skipping the ones you
were routed to produces changes that break seams you didn't know existed.

Covers: `@beyo/clock-kiosk`, `@beyo/worker-shifts`,
`apps/floor-app/ManagerBeyo-app-floor`, and the floor-scope slices of
`@beyo/api-client` / `@beyo/auth` / `@beyo/ui` (rise surface) /
`@beyo/styles` (kiosk tokens).

## Protocol (the "MCP" of this folder)

1. **Route**: find your intention in the table below → read exactly the listed
   docs, in order. `IMPACT_MAP.md` is mandatory for ANY code change.
2. **Trust but verify**: every zone doc ends with *Verification pointers* —
   file paths whose contents prove the doc's claims. If a pointer contradicts
   the doc, the CODE is truth; fix the doc in the same session.
3. **After ANY modification** (yours or one you're reviewing in):
   - update the affected zone doc section(s),
   - update `IMPACT_MAP.md` if a seam (prop contract, adapter shape, store
     transition, public export, invariant) changed,
   - append one entry to `CHANGELOG.md` (format defined there).
   A change without its doc update is an incomplete change — the reliability
   of this system is the whole point.
4. **Never** duplicate architecture-contract content here (that lives in
   `architecture/*.md` at repo root) — these docs describe WHAT EXISTS and HOW
   IT CONNECTS, not how to write new code.

## Routing table

| Your intention | Read (in order) |
|---|---|
| Understand the capability at all / first contact | `00_overview.md` |
| Change API shapes, schemas, roster matching, mocks | `01_domain_worker_shifts.md` → `IMPACT_MAP.md` |
| Anything about sign-in, tokens, 401/revocation, logout | `02_floor_auth.md` → `IMPACT_MAP.md` |
| App routing, providers, surface registration, device config/settings, header clock, PWA | `03_floor_app_shell.md` → `IMPACT_MAP.md` |
| Kiosk behavior: keypad, matching flow, confirm, clock actions, results, timers, keyboard, offline states | `04_kiosk_flow_logic.md` → `IMPACT_MAP.md` |
| Visual/UI: any screen's look, components, tokens, fonts, skeletons, motion | `05_kiosk_components.md` → `IMPACT_MAP.md` |
| Announcements / scheduled shift / summary items·week·rate tiles; wiring real backend data when gaps close; mock↔live flip | `06_adapters_and_backend_gaps.md` → `IMPACT_MAP.md` |
| Tests, Playwright, validation hazards, CI | `07_testing_and_validation.md` |
| "If I change X, what breaks?" | `IMPACT_MAP.md` (+ the X zone doc) |
| What changed recently / why is the doc stale? | `CHANGELOG.md` |
| Mount the kiosk in ANOTHER host app | `packages/clock-kiosk/README.md` §Host Integration (copy-safe), then `05` + `06` |
| Declared states (lunch/cleaning…) — future capability | NOT built. Domain wrappers exist (`01`); shelved plan: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase5_declared_states_20260729.md` |

## Fixed decisions (do not re-litigate without the user)

Full record: archived master `docs/architecture/archives/implementation/PLAN_clock_kiosk_master_20260729.md` (+ its Review log).

- Email fallback is labeled **"Clock with email"** — never "Forgot your code?".
- Declared states are **out of v1** (future separate pages).
- The **`rise` surface** (fade-in slide-up / fade-out slide-down) is used for
  every kiosk overlay; the keypad page is always mounted beneath. No
  SlideStack, no swipe gestures in the kiosk.
- Code cells **display typed digits** (privacy dots rejected).
- Greeting cutoffs: morning 05:00–11:59 · afternoon 12:00–17:59 · evening
  18:00–04:59, workspace time zone.
- Auto-return clamp: **4–120s**, default 12 (one exported constant).
- Insights (`analytics.insights`, the manager-copy-derived trend cards) were
  **retired 2026-07-31** — handoff §5.1 dropped them from the contract in
  favor of unit-based `completed_items`/`week`/`rate`. `InsightRow` stays
  wired as dormant UI; nothing feeds it. Do not resurrect the old
  `@beyo/stats/insight-codes` copy-table wiring without a new handoff shape.
- Weekly target on the summary's week chart is **client hard-coded** (40h,
  `DEFAULT_WEEKLY_TARGET_HOURS` in `lib/summary-extras-adapters.ts`) — the
  backend has no scheduling concept at all (handoff §5.1: "no
  `scheduled_seconds`, ever").
- Dev port **5175**; no `--host` in the default dev script.

## The five kiosk UX invariants (violating any is a defect)

1. The roster cache decides *who*; a **fresh** `GET /current` decides *what
   state* — after every match and every await.
2. Any 409 → silent `/current` refetch → confirm re-render. Never an error UI.
3. Every path returns to a **cleared keypad** (auto-return on result; 30s
   confirm inactivity; back; done; error).
4. One generic no-match message; the typed code/email never leaves the device.
5. Every interaction carries a session id; stale async results are dropped.

## Doc freshness

Each doc carries a `Last verified:` stamp (date + git commit). If the stamp
predates recent commits touching that zone (check `git log --oneline -- <zone
paths>`), treat specifics as possibly stale, verify via the pointers, and
re-stamp after confirming/fixing.
