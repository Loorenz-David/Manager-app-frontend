# 41 — Phone-app integration (managers / sellers / workers)

Each phone app mounts `@beyo/presentations` with **exactly four glue files** in its
`src/app/`. The recipe is identical across apps — managers was built first (phase 9b),
sellers and workers replicate it (9c). When changing integration behavior, change all
three or say why not.

App roots:
- `apps/managers-app/ManagerBeyo-app-managers/` — `appKey "manager"`
- `apps/selleres-app/ManagerBeyo-app-sellers/` — `appKey "seller"` (note the repo's
  `selleres-app` folder spelling)
- `apps/workers-app/ManagerBeyo-app-workers/` — `appKey "worker"`

## The four files (per app)

| File | Role | Touch when… |
|---|---|---|
| `src/app/presentation-glue.ts` | Pure module: the app's `*_PRESENTATION_APP_KEY` constant, `is<App>PresentationHome(pathname)` (exact-match against the app's home route — **the auto-show policy lives here**), and `create<App>PresentationSurfaceOpeners(open, close)` which adapts the app's surface store to `PresentationsSurfaceOpeners`, injecting `onRequestClose` | Changing where auto-show is allowed, or how surfaces open/close in this app. |
| `src/app/PresentationMount.tsx` | The provider host: reads router location → `canAutoShow = is…Home(pathname)`; passes `navigate` for CTAs; registers window `focus` + `visibilitychange` listeners that invalidate `activePresentationKeys.active(appKey)` (foreground refresh). Wraps the authenticated shell's children | Mount position, foreground-refresh behavior, CTA navigation. |
| `src/app/presentation-surfaces.ts` | Registers the three lazy player surfaces with the app's surface registry using the ids + `preload*Surface` loaders from the package (named→default mapping). Keeps the player **out of the boot bundle** — verified as a separate chunk | Surface registration / code-splitting. |
| `src/app/socket-registry.ts` | Registers `presentationSocketEvents` (`:published`, `:archived`) with the app's socket layer → calls `invalidateActivePresentationQueries` only (sockets invalidate; React Query refetches; the provider reacts) | Realtime wiring. This file may also carry the app's *other* socket registrations — scope edits carefully. |

Mounted inside each app's authenticated shell (`AppShell`/`App`) so a session and the
surface store exist. `PresentationMount` wraps children — it renders no UI of its own.

## Behavior this wiring produces (verified live, 2026-07-23)

- Auto-show **only on the home route**; publish while elsewhere = deferred, released
  on returning home (reactive `canAutoShow`).
- Targeted delivery per `app_key` with zero frontend filtering (backend decides).
- Realtime: publish while the app is open on home → auto-opens without reload.
- Completed/dismissed announcements never reappear (view-state loop + suppression).
- Non-dismissible decks show no dismiss chrome; acknowledge footer is the only exit.

Full evidence matrix:
`docs/architecture/implemented_summaries/SUMMARY_presentation_phase9_phone_apps_wiring_20260722.md`.

## Adding the capability to a NEW app

1. Copy the four files from sellers or workers (cleanest replicas); rename the app-key
   constant and home-route check.
2. Wrap the authenticated shell children with `PresentationMount`.
3. Register surfaces + socket events in the app's registries.
4. Backend: the new `app_key` must exist in audience enums (backend `07_enums.md`).
5. Add the app's `presentation-player` Playwright spec + glue tests (copy from 9c
   apps; mobile project needs `tap()` — see the Playwright pitfall in doc 60).

## Invariants

- Glue stays glue: no playback, eligibility, or view-state logic in app files —
  if an app "needs" that, it belongs in the package behind a prop.
- The player chunk must stay lazy (out of boot); check bundle output when touching
  surface registration.
