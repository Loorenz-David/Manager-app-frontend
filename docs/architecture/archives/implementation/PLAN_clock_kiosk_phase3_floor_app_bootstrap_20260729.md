# PLAN_clock_kiosk_phase3_floor_app_bootstrap_20260729

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase3_floor_app_bootstrap_20260729`
- Status: `archived`
- Owner agent: Codex (implementer) / Claude Fable (kit + author) / Opus (reviewer)
- Created at (UTC): `2026-07-29T13:30:00Z`
- Last updated at (UTC): `2026-07-29T16:42:59Z`
- Master plan: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`
- Depends on: Phase 2 (floor auth) archived.
- Claude kit (built and committed BEFORE the Codex session; read-only for Codex): kiosk chrome — `KioskFrame` (paper surface, centred column, header slot / flexible middle / bottom-pinned action slot), `KioskHeader` (workspace identity block, terminal label, live clock + date props), `DeviceSignInCard` chrome, `DeviceSettingsSurface` chrome, **`RiseSurface` shell in `@beyo/ui`** (fade-in slide-up enter, fade-out slide-down exit — the motion/chrome; master decision #2), kiosk token registration in `@beyo/styles`, fonts.

## Goal and intent

- Goal: bootstrap `apps/floor-app/ManagerBeyo-app-floor` as a thin shell: floor-scope device auth, device configuration, routing, providers, surface registry, styling/fonts — ending with a protected empty kiosk placeholder route wearing the real chrome.
- Intent: Phase 4 drops the kiosk page into a fully wired host.
- Non-goals: no kiosk flow, no `@beyo/clock-kiosk` package (Phase 4), no tabs/TabSlideStack (master decision #2), no RealtimeProvider (decision #8).

## Scope

- In scope: the new app workspace; root `package.json` (workspaces glob `"apps/floor-app/*"`, typecheck chain); `@beyo/styles` kiosk token namespace; app-owned device-config store + settings surface; sign-in page.
- Out of scope: `@beyo/worker-shifts` consumption (Phase 4); any kiosk screen.
- Assumptions: presentation-studio's minimal 4-file `src/app/` is the shell template (relational reference); managers-app is the config template.

## Clarifications required

- (none — master decisions #1, #2, #6, #7, #9, #12 fix naming, shell shape, tokens, fonts, device identity, responsiveness)

## Acceptance criteria

1. Workspace boots: `apps/floor-app/ManagerBeyo-app-floor` with `index.html` (viewport-fit=cover set, fonts preloaded), `.env`/`.env.production`/`.env.test`, `vite.config.ts` (svgr/react/tailwind/VitePWA, dev port 5175, `/api` + `/socket.io` proxy off `API_TARGET_URL`; no code-splitting groups), `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `tsconfig` trio, `src/main.tsx` (vaul wrapper div), `src/test/setup.ts`. Root workspaces + typecheck updated; `npm install` clean.
2. `src/index.css`: `@import "tailwindcss"; @import "@beyo/styles";` + `@source` lines for exactly `ui`, `hooks`, `auth` (+`lib` if classed) — extended in later phases as packages are consumed; `@font-face` for Instrument Sans + IBM Plex Mono from `public/fonts` (weights used by the design only); kiosk-specific app CSS kept to a minimum.
3. `@beyo/styles` gains the `--color-kiosk-*` namespace (master decision #6 palette) additively — no existing token touched.
4. `src/app/`: `App.tsx`, `providers.tsx` (MotionConfig/LazyMotion, BreakpointProvider, KeyboardInsetProvider, QueryClientProvider with the standard client options, Toaster), `router.tsx` (`/sign-in` under `GuestRoute`, `/` under `ProtectedRoute` → `AppShell` → kiosk placeholder), `RootRoute.tsx` (`SurfaceProvider registry={surfaceRegistry}` + `AuthProvider appScope="floor" signInRoute` — no RealtimeProvider), `surface-registry.ts` (device-settings surface, registered with the new `rise` type), `AppShell.tsx` (mounts `KioskFrame` + `KioskHeader` from the kit, fed by a `useKioskClock` hook and the device-config store).
4b. **`rise` surface type in `@beyo/ui`** (master decision #2): the kit's `RiseSurface` shell is registered additively as surface type `"rise"` in the SurfaceProvider renderer — Codex owns the registration plumbing (renderer case, type union, popstate/backdrop behavior consistent with the engine), Claude owns the shell's DOM/motion. Existing surface types byte-untouched; `@beyo/ui` surface tests extended (open/close lifecycle, stacking, inert/backdrop) and `architecture/28_surfaces_local.md` gains the `rise` entry.
5. Device config: `src/store/device-config.store.ts` — zustand, persisted (localStorage): `terminalLabel: string`, `autoReturnSeconds: number` (default 12). Set during first sign-in (field on the sign-in card) and editable via the `DeviceSettingsSurface` (a `rise` surface), opened by **long-press (600ms) on the header identity block** — an idle tap must never open it. Settings surface also hosts the device **Log out** action (full revocation via Phase 2 sign-out + config wipe prompt). **M1 resolution (Phase 2 review finding, orchestrator decision 2026-07-29):** device logout must guarantee local revocation — `POST /auth/logout` is attempted, and on success OR failure the persisted floor token, in-memory token, auth store, and query cache are cleared and the app lands on sign-in. Implement as a **floor-gated `finally`** in `@beyo/auth`'s sign-out path (same `app_scope === "floor"` gating discipline as Phase 2; non-floor sign-out behavior byte-unchanged). A test covers the logout-API-failure case asserting the storage key is cleared.
6. Sign-in page: renders the kit `DeviceSignInCard` wrapping `SignInForm appScope="floor"` from `@beyo/auth` + the terminal-label field; on success → `/`. A revoked device (401 anywhere / `auth:session-expired`) lands back here with a friendly "this terminal was signed out" note.
7. Live clock: `useKioskClock` app hook — ticks each second, exposes time + date strings localized to the workspace `time_zone` claim; header shows exactly the design's format (HH:mm + weekday day month).
8. PWA: manifest (name, icons, landscape+portrait any, standalone display), `sw.ts` per the standard injectManifest setup; no push.
9. `npm run typecheck` green at root; app `test:unit` green (clock hook, device store, router guards); Playwright smoke (`--project=desktop`): sign-in (MSW-mocked floor sign-in) → chrome renders with terminal label + ticking clock.

## Contracts and skills

### Contracts loaded

- Core set (guide) + **new application bootstrap** bundle: `14_styling.md` §14 (the `@source` table is mandatory reading), `03_environment.md`, `11_routing.md`, `12_auth.md` (+`_local`), `10_pages.md`, `23_providers.md`, `26_persistence.md`, `27_responsive.md`, `28_surfaces.md` (+`_local` — extended with the `rise` type this phase), `31_animations.md` (rise enter/exit motion), `17_testing.md`, `34_runtime_validation.md` (+`_local`).

### File read intent — pattern vs. relational

Permitted relational reads: `apps/presentation-studio/.../src/app/*` (minimal shell to copy), `apps/managers-app/.../{vite.config.ts, index.css, package.json, index.html, src/main.tsx, playwright.config.ts}` (bootstrap wiring), `packages/styles/src/index.css` (token file being extended), `packages/auth/src/components/{SignInForm,AuthProvider,GuestRoute,ProtectedRoute}` prop surfaces, root `package.json`.
Prohibited: reading managers-app tab machinery (not used), or any feature folder.

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`.

## Implementation plan

1. Scaffold workspace (criterion 1) + root registration; verify `npm install` + typecheck.
2. Styling: kiosk tokens in `@beyo/styles`, fonts, `index.css` (criteria 2–3).
3. `src/app/` shell (criterion 4) with the kit chrome mounted; `rise` type registration in `@beyo/ui` (criterion 4b).
4. Device-config store + settings surface + long-press opener (criterion 5).
5. Sign-in page + revoked-device landing (criterion 6).
6. Clock hook (criterion 7), PWA (criterion 8).
7. Tests + Playwright smoke (criterion 9).

## Risks and mitigations

- Risk: missing `@source` line ⇒ silently unstyled package classes. Mitigation: criterion 2 enumerates; reviewer greps every consumed package against `index.css`.
- Risk: settings/lo­gout reachable by idle passers-by. Mitigation: long-press-only opener + confirm step on logout (criterion 5).

## Validation plan

- `npm run typecheck`: zero errors (new workspace included).
- App `npm run test:unit`: green.
- `npx playwright test --grep floor-bootstrap --project=desktop`: green (mocked).

## Review log

- 2026-07-29 Claude (Fable, orchestrator): Phase 2 review finding **M1** routed here (its natural home — floor sign-out wiring). Decision: floor-gated `finally` guaranteeing local revocation on device logout regardless of server outcome; universal (all-scope) teardown explicitly deferred as a post-capability proposal. Criterion 5 amended accordingly; `packages/auth/src/actions/use-sign-out*` (or equivalent) is thereby added to this phase's permitted write scope, floor-gated changes only. Phase 2's L1 (corrupt persisted JWT re-restored every boot) may be closed here too if trivial: clear storage when claims fail to decode during floor boot — optional, record if done.
- 2026-07-29 Codex: Phase 3 implemented and validated. Root `npm run typecheck` passed with zero errors; floor unit tests passed 4 files / 6 tests; the full `@beyo/ui` suite passed 29 files / 162 tests; the desktop `floor-bootstrap` Playwright smoke passed 1/1; the floor production build and lint also passed.
- 2026-07-29 Codex: Phase 2 M1 was closed at the shared auth boundary as amended: the floor app selects `useSignOutMutation({ appScope: "floor" })`, whose dedicated floor path attempts the logout POST and clears the persisted floor token, in-memory token, auth store, notification tracking, and (via the existing `onSettled`) query cache on success or failure. The pre-existing non-floor `signOut` function and default hook behavior remain unchanged; a regression test proves both the floor failure cleanup and non-floor failure invariance. Optional L1 corrupt-token recovery was not changed.
- 2026-07-29 Codex: Amendment validation passed after a clean install: `npm run test:auth` passed 2 files / 3 tests, root `npm run typecheck` passed, floor unit tests passed 4 files / 6 tests, and desktop `floor-bootstrap` Playwright passed 1/1. The first post-install Playwright start exposed npm's optional-dependency omission for the Darwin ARM64 Rolldown/Lightning CSS bindings; installing the exact package-declared versions with `--no-save` repaired the local toolchain and the required rerun passed.
- 2026-07-29 Codex: `@source` registration is `ui`, `hooks`, `auth`, `lib`, and `clock-kiosk`. The child criterion's short enumeration omitted `clock-kiosk`, but §14 requires every consumed class-bearing workspace package to be explicit, and the generated CSS was verified to contain the chrome's kiosk classes.
- 2026-07-29 Codex: The workspace did not contain the font files described as pre-committed. The app-local copies were sourced from the official Google Fonts repository; no Claude-owned chrome component, DOM structure, or class list was edited.
- 2026-07-29 Codex: Adding `rise` to the shared union required the three existing apps' routed `SurfaceRouteFrame` state types to exclude `rise`. Their renderer maps and behavior remain unchanged; rise is state-overlay only in this phase.
- 2026-07-29 Codex: The floor app retains `strict`, `noImplicitReturns`, and `noFallthroughCasesInSwitch`, but does not enable consumer-level `exactOptionalPropertyTypes` or `noUncheckedIndexedAccess`. Workspace packages export raw TypeScript and currently fail those consumer flags in unrelated existing source; the authoritative package/root typechecks are green.

## Lifecycle transition

- Current state: `archived`
- Transition owner: Codex session (completed 2026-07-29)
