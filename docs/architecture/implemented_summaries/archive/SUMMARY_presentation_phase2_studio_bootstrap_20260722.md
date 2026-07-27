# SUMMARY_presentation_phase2_studio_bootstrap_20260722

## Metadata

- Plan: `PLAN_presentation_phase2_studio_bootstrap_20260722`
- Governing master: `PLAN_presentation_capability_master_20260722`
- Implemented at (UTC): `2026-07-22T11:44:47Z`
- Lifecycle result: `archived`

## Outcome

Created `apps/presentation-studio/ManagerBeyo-app-presentation-studio` as a desktop-only, replaceable host shell. It owns auth, guarded routing, providers, notification/surface hosts, environment validation, Tailwind package sourcing, desktop chrome, and empty lazy-loaded dashboard/editor route placeholders. It owns no presentation-builder domain or authoring logic.

The studio uses `appScope="manager"` in both `AuthProvider` boot and `SignInForm` submission. No `app_key` is hardcoded.

## Delivered

- Vite 8 + React 19 + TypeScript 6 + Tailwind 4 workspace scaffold with no PWA or service worker.
- Root workspace registration and root `typecheck` inclusion.
- Validated `VITE_API_BASE_URL` plumbing, development defaults, `.env.example`, API-client aliasing, and optional development proxy support.
- Query client, Sonner notification host, and `@beyo/ui` surface provider with an empty Phase 2 registry.
- Router-aware `@beyo/auth` provider with `appScope="manager"`.
- Lazy sign-in, dashboard, and `/editor/:presentationId` route modules with route loading/error boundaries.
- Authenticated desktop chrome with sign-out; dashboard and editor route bodies remain empty placeholders.
- Guard state that returns an unauthenticated `/editor/:id` deep link to the same URL after sign-in.
- Explicit Tailwind `@source` registration for `@beyo/ui`, `@beyo/auth`, and `@beyo/presentation-builder`.
- Desktop Playwright coverage for manager/admin sign-in-refresh-sign-out, worker rejection, and editor deep-link round-trip.

## Validation

- `npm run typecheck` — PASS, zero TypeScript errors across the root command including the new workspace.
- `npm run lint --workspace managerbeyo-app-presentation-studio` — PASS.
- `VITE_API_BASE_URL=http://localhost:8000 npm run build --workspace managerbeyo-app-presentation-studio` — PASS; dashboard, editor, and sign-in emitted as separate lazy chunks. Vite reported a non-blocking initial-chunk size warning.
- `npx playwright test --grep presentation-studio-auth --project=desktop` from the studio workspace — PASS, 4/4:
  - manager sign-in, refresh, sign-out;
  - admin sign-in, refresh, sign-out;
  - worker-role 403 displayed as a clear rejection;
  - unauthenticated editor deep link returned to the editor after sign-in.

## Dual-role result

PASS for frontend wiring. The browser suite asserted that both manager and admin identities use `app_scope: "manager"` and verified session restoration/sign-out through the shared auth package. The run used deterministic intercepted backend responses because no live API target or role-account credentials were present in the session; backend policy itself was already resolved by V1.

## Deviations and notes

- The root workspaces are explicit rather than `apps/*/*`; added `apps/presentation-studio/*` to include the studio.
- The canonical notification contract's `NotificationProvider`/`NotificationRenderer` are not exported by the current shared packages. The app therefore owns a thin `NotificationHostProvider` that mounts the repository-standard Sonner renderer; presentation logic remains outside the app.
- The hands-on auth checklist was executed as browser-level Playwright scenarios with mocked API responses rather than live accounts because no backend URL or credentials were available. This validates shell wiring and error presentation, not backend authentication policy.
- The in-app browser control runtime was unavailable in this session, so the required Playwright desktop browser was used for runtime verification.

## Files

- Created: `apps/presentation-studio/ManagerBeyo-app-presentation-studio/` (app source, config, env examples/default, and Playwright spec).
- Modified: `.gitignore`, `package.json`, `package-lock.json`.
- Lifecycle artifacts: this summary, `docs/architecture/archives/ARCHIVE_presentation_phase2_studio_bootstrap_20260722_1144.md`, archived child plan, and the master review-log entry.
