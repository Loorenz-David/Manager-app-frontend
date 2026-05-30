# PLAN_managers_pwa_update_reliability_hotfix_20260530

## Metadata

- Plan ID: `PLAN_managers_pwa_update_reliability_hotfix_20260530`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-30T18:00:00Z`
- Last updated at (UTC): `2026-05-30T15:44:55Z`
- Related issue/ticket: pre-migration gate #1
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_shared_pwa_core_package_abstraction_20260530.md`

## Goal and intent

- Goal: After pressing "Update now" on the PWA update sheet, the app reloads into a clean, immediately usable UI state without requiring a force-close.
- Business/user intent: Workers and managers use the app as an installed PWA. Broken layout after an update forces them to force-close and reopen, causing confusion and disruption.
- Non-goals: Changing the update prompt UI or timing. Modifying anything in `PwaUpdateSheetPage.tsx`.

## Scope

- In scope: `PwaProvider.tsx` only.
- Out of scope: Vite config, workbox config, sheet pages, surface registration.
- Assumptions: The app runs under vite-plugin-pwa ≥ 0.13.2 where `reloadPage` param on `updateServiceWorker` is ignored; `onNeedReload` is the correct override point.

## Root cause

vite-plugin-pwa's `registerSW` (build mode, `registerType: "prompt"`) pre-registers a `controlling` event listener inside `showSkipWaitingPrompt`. When the new SW activates, this listener always calls `window.location.reload()` unless `onNeedReload` is provided. Two issues compound:

1. **iOS PWA viewport reset**: `window.location.reload()` inside an installed PWA on iOS can leave the viewport in a broken state (incorrect `dvh` / safe-area insets) until the app is force-closed and reopened.
2. **Animation interrupted by immediate reload**: `updateServiceWorker()` sends SKIP_WAITING synchronously, which fires the `controlling` event within ~50ms — while the sheet dismiss animation (≈300ms) is still in progress. The abrupt reload while the Vaul sheet is animating can corrupt React's render state on some platforms.

## Acceptance criteria

1. Pressing "Update now" closes the sheet, the sheet dismiss animation completes visually, and the app reloads to a clean, usable state.
2. After the reload, layout (viewport, nav bar, safe-area padding) is correct without needing a force-close.
3. `npm run typecheck` passes with zero errors on the managers app.

## Implementation plan

1. **`PwaProvider.tsx`**: Pass `onNeedReload` to `useRegisterSW` — this replaces the default `window.location.reload()` in the pre-registered `controlling` listener with `window.location.href = '/'`. A fresh navigation (not a reload) reinitializes the iOS PWA viewport correctly.
2. **`PwaProvider.tsx`**: In the `onUpdate` callback, add a 300ms delay after closing the surface and before calling `updateServiceWorker()`. This ensures the Vaul sheet dismiss animation completes before the SKIP_WAITING message is sent and the `controlling` event fires.

## Validation plan

- `npm run typecheck` (managers app): zero TypeScript errors
- Manual: Open the managers PWA on iOS, receive an update prompt, press "Update now", verify the layout is correct immediately after reload with no force-close needed.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `david`
