# PLAN_managers_pwa_update_detection_latency_20260530

## Metadata

- Plan ID: `PLAN_managers_pwa_update_detection_latency_20260530`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-30T18:00:00Z`
- Last updated at (UTC): `2026-05-30T15:44:55Z`
- Related issue/ticket: pre-migration gate #2
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_shared_pwa_core_package_abstraction_20260530.md`

## Goal and intent

- Goal: Reduce the time between a new deployment landing and the managers app showing the update prompt, specifically after the app is opened or brought to the foreground.
- Business/user intent: Without proactive update checks, users can run stale versions for up to 24 hours (browser SW default). Workers and managers need to pick up updates faster to stay on current API contracts.
- Non-goals: Forcing users to update. Changing the update prompt UI. Modifying workbox config.

## Scope

- In scope: `PwaProvider.tsx` only — add `onRegisteredSW` to store the SW registration and a visibility/interval effect to call `registration.update()`.
- Out of scope: Vite config, workbox settings, sheet pages, service worker script.
- Assumptions: `registration.update()` is a lightweight HTTP check (uses ETag/If-Modified-Since); safe to call on visibility change and on a 30-minute interval.

## Root cause

The current `useRegisterSW` call has no `onRegisteredSW` callback, so the `ServiceWorkerRegistration` object is never stored. Without a reference to the registration, the app cannot call `registration.update()` proactively. The only update checks come from the browser default (on navigation and ~24h intervals).

## Acceptance criteria

1. When the app is opened or brought to the foreground after a new deployment, the update prompt appears within one browser-check cycle (i.e., immediately if a new SW has installed, not waiting 24h).
2. `registration.update()` is called on `visibilitychange` (visible) and at most every 30 minutes while the app is open.
3. `npm run typecheck` passes with zero errors on the managers app.

## Implementation plan

1. **`PwaProvider.tsx`**: Add `registrationRef = useRef<ServiceWorkerRegistration | null>(null)`.
2. **`PwaProvider.tsx`**: Add `onRegisteredSW(_swScriptUrl, registration) { registrationRef.current = registration ?? null; }` to `useRegisterSW` options.
3. **`PwaProvider.tsx`**: Add a `useEffect` (runs once on mount) that:
   - Listens for `visibilitychange` and calls `registrationRef.current?.update()` when `document.visibilityState === 'visible'`.
   - Sets a 30-minute `setInterval` that calls `registrationRef.current?.update()`.
   - Cleans up both on unmount.

## Validation plan

- `npm run typecheck` (managers app): zero TypeScript errors
- Manual: Deploy a new version, open the managers PWA (or background it and foreground it), verify the update prompt appears without needing to hard-refresh.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `david`
