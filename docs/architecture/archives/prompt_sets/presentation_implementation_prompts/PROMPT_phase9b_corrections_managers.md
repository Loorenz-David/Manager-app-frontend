# Codex — Phase 9b: managers-app wired end-to-end (F1/F2/F3 for ONE app)

You are implementing the **managers-app slice** of an approved corrections plan, working in the `frontend/` monorepo root. Session 9a delivered the package seams. **Verify first:** `rg "export default" packages/presentations/src/surfaces` is empty, the provider has the auto-show gate prop, and `npm run test:presentations` is green — if not, STOP and report. **Touch ONLY `apps/managers-app/**` (+ root lockfile via install)** — no other app, no lifecycle bookkeeping. The managers `package.json` already has an unrelated user edit (`@beyo/pause-reasons`) — preserve it. Start coding early.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_phase9_corrections_20260722.md` — **step 3**; acceptance criteria 1–4 and 6–8 scoped to managers-app only.

## Read (only this)

1. The corrections plan (criteria 1–8, step 3, risks — esp. the barrel-import/lazy-chunk risk).
2. `@beyo/presentations` public API (`src/index.ts`): provider props (incl. the new gate), loaders, keys, handler helper.
3. Relational, managers-app only: `src/app/RootRoute.tsx` + providers (mount point), router/`ROUTES` (home + CTA mapping), the surface registry file, `src/app/socket-registry.ts` (canonical subscription pattern), `index.css` `@source` block, `package.json`, Playwright config.

## Deliver (managers-app)

1. Dependencies (`@beyo/presentations`, `@beyo/presentation-runtime`) + `@source` entries for both.
2. Surface registration: three presentation surfaces via `lazyWithPreload` over 9a's loader functions (named-entry mapping); player/runtime must land only in lazy chunks — verify via a production build's output, not source syntax.
3. `ActivePresentationProvider` at the authenticated shell: `appKey="manager"`, openers backed by the app's surface store, CTA navigate through the app router, and the home-gate input wired to `pathname === ROUTES.home` (+ foreground/resume refetch; opening only while on home — deferral released on later home navigation/foreground-on-home).
4. Socket registry: subscribe BOTH presentation events using 9a's invalidation-only helper.
5. Validate this one app fully: glue Vitest where added; Playwright `presentation-player` spec (mobile project first, then desktop — deterministic API interception per the app's conventions; include off-home deferral, dismissible vs acknowledge-only, CTA navigation, completed-never-reappears); production build + chunk inspection (name the entry + presentation chunks).

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentations` + any managers glue suites
- Managers Playwright: `--grep presentation-player --project=mobile` then `--project=desktop` (use the app's config)
- Bundle: player/runtime absent from the managers boot chunk

## Finish

Append one dated line to the corrections plan's Review log: "9b (managers) implemented — <validation results + any shell divergences worth noting for replication>". No archiving, no summary. Report; clean-boundary rule applies — never stop before writing code.
