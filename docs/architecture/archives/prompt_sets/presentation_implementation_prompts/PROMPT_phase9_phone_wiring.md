# Codex — Phase 9: mount the player in the three phone apps (FINAL phase, lean brief)

You are implementing the final phase of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–8 are complete, reviewed, and committed; `@beyo/presentations` exists with its provider, surfaces, keys, and loaders. This phase is wiring + validation — **no new styled UI anywhere** (any missing visual affordance → record in the plan Review log and stop for Claude-builder). Start early — read only what is listed below, then build.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_phase9_phone_apps_wiring_20260722.md` (status `approved`) — all acceptance criteria. Everything is resolved: **V3** (Socket.io `app_update_presentation:published` + `:archived`, room `workspace:{workspace_id}` auto-joined, payload `{client_id, logical_client_id, version}` no envelope, change-signal only) and the **timing policy** (auto-open only on each app's home/root route; defer elsewhere until navigation-to-home or foreground — in all three apps).

## Carried from the Phase 8 review (do in this phase's wiring touch)

The three surface entry modules in `packages/presentations/src/surfaces/` use `export default` — zero repo precedent, contrary to the no-default-exports rule. Map **named exports** in your `lazyWithPreload` surface registration and delete the default exports in the same touch.

## Read (only this)

1. The phase plan, fully (criteria 1–7; per-app scope list; risks).
2. Master plan — decision #10, the double-show risk ("realtime only invalidates, never opens").
3. `@beyo/presentations` public exports (`src/index.ts`) — provider props, surface props, keys, loaders.
4. Relational only: each app's shell (`AppShell.tsx` / root providers — where surface hosts + realtime subscriptions mount), `@beyo/realtime` public API + ONE existing subscription call site (exact signature), each app's router/ROUTES (home route + CTA mapping), each app's `index.css` `@source` block and `surfaces.ts` registration file.

## Deliver (managers-app FIRST, end-to-end, then replicate to sellers + workers)

Per app (`app_key`: `"manager"` / `"seller"` / `"worker"` — each app passes its own; never hardcode across apps):

1. Dependencies + `@source` entries for `@beyo/presentations` and `@beyo/presentation-runtime`.
2. Surface registration for the three presentation surfaces via `lazyWithPreload` + named-export mapping (see carried item); player chunks must stay lazy — no player code in any boot chunk.
3. `ActivePresentationProvider` mounted at the authenticated-shell level with: injected surface openers, CTA `navigate` mapped through the app's router (backend guarantees relative in-app paths), and the **home/root trigger predicate** — check `/active` on authenticated boot and foreground/resume, but only auto-open while on the home/root route; defer elsewhere until next home-navigation/foreground.
4. Realtime: subscribe to BOTH `app_update_presentation:published` and `:archived` via `@beyo/realtime`; the handler **only invalidates `activePresentationKeys`** — it never opens surfaces (the provider's dedupe owns opening).
5. After managers-app: validate manually end-to-end against a studio-published test announcement (the first true cross-system validation), record divergences in the plan Review log, then replicate to the other two apps honoring their shell conventions.

## Validation (all must be green)

- `npm run typecheck` (all workspaces)
- `npm run test:presentations` + any app suites you touched
- Playwright per app, **mobile project first, then desktop**: seeded active presentation → auto-shows on home → advance → complete → gone after reload; dismissible vs non-dismissible (acknowledge-only exit); CTA navigation; not-on-home deferral. If a player control sits inside `PullToRefresh`, use the established tap()/press() helper (mobile `filterTaps` swallows synthetic clicks).
- Cross-app matrix: an announcement targeted at one `app_key` appears only in that app (frontend performs zero eligibility logic).
- Bundle check: player absent from each app's boot chunk.

## Finish — including the MASTER close-out (this phase only)

Only after green validation, per `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. `SUMMARY_presentation_phase9_phone_apps_wiring_20260722.md` in `implemented_summaries/`.
2. Archive the Phase 9 plan (status `archived`, `mv` to `archives/implementation/`, verify).
3. **Master close-out**: append a dated all-phases-complete entry to `PLAN_presentation_capability_master_20260722.md`'s Review log, set its `Status` to `archived`, update `Last updated at`, `mv` it to `archives/implementation/`, verify. This is the only phase permitted to archive the master.
4. If validation cannot go green: plan `Status: debugging`, defect in its Review log, stop with a report — do NOT touch the master.

If you run low on context, finish the current app's wiring cleanly and report exactly what remains — never stop before writing code.

## Report back

Lifecycle state (incl. master close-out), per-app wiring notes/divergences, all validation outputs incl. the cross-app matrix, deviations with justification.
