# Codex — Phase 9a: package seams (F2-entries + F3-types/handler + F4-gate of the Phase 9 corrections plan)

You are implementing the **package-scope slice** of an approved corrections plan, working in the `frontend/` monorepo root. **Touch ONLY `packages/presentations` and `packages/realtime`** — no app files, no lifecycle bookkeeping. The working tree contains the user's unrelated pause-reasons changes (managers `package.json`, workers `types.ts`, lockfile) — do not touch or revert them. Start coding early.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_phase9_corrections_20260722.md` (status `approved`) — **implementation step 1–2 only**; acceptance criteria 2 (entry-export part), 3 (types/handler part), 5 (provider-gate tests).

## Read (only this)

1. The corrections plan (criteria 2/3/5, steps 1–2, risks).
2. `packages/presentations/src/` — provider, surfaces, surface-ids, index (what exists).
3. `packages/realtime/src/lib/socket-types.ts` + the realtime package's public API (how events are typed/subscribed).
4. Backend socket contract (already in the plan's assumptions): events `app_update_presentation:published` and `app_update_presentation:archived`, payload `{ client_id, logical_client_id, version }`, no envelope.

## Deliver

1. **Named surface entries**: the three surface entry modules export named context-consuming entries; delete the `export default`s; update `surface-ids.ts` loaders so their dynamic imports resolve the named exports (keep loader-function signatures stable for app registration).
2. **Provider home-gate seam**: add a public prop to `ActivePresentationProvider` — `canAutoShow: boolean` (or an equivalently minimal reactive input; the app computes "on home route / foregrounded" and passes it). Behavior: fetching may happen anytime; **opening** happens only while `canAutoShow` is true; data fetched while false stays deferred and opens when it flips true; flipping false mid-show changes nothing. Unit tests per criterion 5(a–e), including the boot-fetch + socket-invalidation race opening exactly once.
3. **Realtime contract**: add both events to `ServerToClientEvents` with the documented payload; export from `@beyo/presentations` a reusable invalidation-only handler helper (takes a QueryClient, invalidates `activePresentationKeys`, imports no surface/navigation code) + unit tests proving both events only invalidate.

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentations` (existing 10 + new gate/race/handler suites)
- `rg -n "export default" packages/presentations/src/surfaces` → no matches
- `git diff -- packages/presentations/src/components` → no non-additive kit change

## Finish

Append one dated line to the corrections plan's Review log: "9a (seams) implemented — <validation results>". No archiving, no summary. Report files + outputs; if you run low on context, finish the current numbered deliverable and report what remains — never stop before writing code.
