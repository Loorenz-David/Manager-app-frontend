# 00 — Overview: what the clock kiosk is and how the pieces connect

Last verified: 2026-07-31

An always-on **shop-floor kiosk** on a shared device (wall tablet primary,
phone/desktop supported). A manager signs the device in once (floor scope,
non-expiring token); workers then clock in/out by typing a **4-digit code**
(or their email via **"Clock with email"**). On clock-out, a day summary
renders from the backend's `analytics` payload. Declared states (lunch,
cleaning…) are wrapped at the domain layer but have **no v1 UI**.

## The four code owners

```
@beyo/worker-shifts          domain logic: schemas, api, actions, matcher, MSW mocks
        ▲ imports
@beyo/clock-kiosk            the kiosk experience: flow store/controller, screens
        ▲ mounts (page + rise surfaces + provider)                 (components), pages,
apps/floor-app/…-floor       thin shell: auth, routing, device      adapters, view models
                             config, surface registry, chrome glue
plus floor-gated slices in:  @beyo/api-client + @beyo/auth (device token),
                             @beyo/ui (RiseSurface, type "rise"),
                             @beyo/styles (--color-kiosk-* / --font-kiosk-*)
```

`clock-kiosk` no longer depends on `@beyo/stats` — the summary's `insights`
section it used to feed (`insight-codes` subpath) was retired 2026-07-31 when
the handoff dropped `analytics.insights` from the contract entirely.

Dependency arrows point strictly downward: `worker-shifts` imports no UI;
`clock-kiosk` imports no app code; the floor app owns zero kiosk logic and is
deletable without touching kiosk behavior.

## One interaction, end to end (the spine every change touches)

```
keypad (always-mounted page, ClockKioskPage)
  │ digits → controller matches locally against cached roster (never a network identify)
  ▼
confirming — opens as a RISE SURFACE over the keypad
  │ fresh GET /current?user_id= decides the ONE action shown (in OR out)
  ▼
acting — POST clock-in | clock-out (no optimistic anything)
  ▼
result — rise surface: clock-in greeting+plate  |  clock-out summary (analytics)
  │ auto-return countdown (device-config seconds) or Done
  ▼
reset() → new session id → cleared keypad revealed by the rise fade-down
```

State machine: `packages/clock-kiosk/src/store/kiosk-flow.store.ts` —
`keypad → confirming → acting → result`, every transition gated on
`sessionId`; `reset()` mints a new id so stale async work no-ops.

## Runtime modes

- **Mocked (current default)**: `VITE_FLOOR_MOCKS=1` boots MSW
  (`floor-app/src/mocks/browser.ts` + `@beyo/worker-shifts/mocks`) and enables
  the dev showcase adapters. Every v1 endpoint is still ❌ backend-side.
- **Live**: flip the env flag per the checklist in
  `packages/clock-kiosk/README.md`. Design-ahead tiles (announcements,
  scheduled shift, summary items/week/rate) stay hidden until the backend
  gaps close — see `06_adapters_and_backend_gaps.md`.

## Ground-truth documents (never edited by frontend work)

- API contract: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`
  (build-ahead; endpoint liveness table inside).
- Design: `docs/architecture/under_construction/implementation/clock_in_out_app/image_design/`
  (5 images + `design_readme.md` — palette, type, touch-target rules).
- What the backend still owes: `docs/architecture/under_construction/implementation/clock_in_out_app/BACKEND_REQUIREMENTS_clock_kiosk_20260729.md`.
- Completed master plan (decisions + full review history):
  `docs/architecture/archives/implementation/PLAN_clock_kiosk_master_20260729.md`.

## Verification pointers

- Spine: `packages/clock-kiosk/src/store/kiosk-flow.store.ts` (state shapes),
  `src/controllers/use-kiosk-flow.controller.ts` (orchestration).
- Ownership boundaries: `packages/clock-kiosk/package.json` (peers),
  `packages/worker-shifts/package.json`, floor app `package.json`.
- Mode flag: floor app `src/main.tsx` + `src/app/FloorKioskProvider.tsx`.
