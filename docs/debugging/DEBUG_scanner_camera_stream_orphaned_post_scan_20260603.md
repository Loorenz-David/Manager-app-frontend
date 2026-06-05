# DEBUG_scanner_camera_stream_orphaned_post_scan_20260603

## Metadata

- Debug ID: `DEBUG_scanner_camera_stream_orphaned_post_scan_20260603`
- Status: `debugging`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-03T00:00:00Z`
- Parent plan: `docs/architecture/under_construction/implementation/PLAN_scanner_package_20260603.md`
- Parent summary: `docs/architecture/implemented_summaries/SUMMARY_scanner_package_20260603.md`
- Issue reference: —
- Debug iteration: 1

---

## Problem statement

- **Observed behavior:** After opening a task creation form, scanning via the scanner slide, and then closing the form, the hardware camera stream remains active indefinitely. The camera indicator stays on even after several minutes — no idle timer fires. The stream is effectively orphaned.
- **Expected behavior:** Closing the task creation form should release the scanner camera stream immediately (via `idleReleaseMs: 0` on the prewarm cleanup).
- **Impact scope:** All three task creation forms (`InternalFormContent`, `PreOrderFormContent`, `ReturnFormContent`). Only triggered when the scanner is actually used (scan performed). Opening and closing the form without scanning works correctly.

---

## Reproduction

1. Open the FAB → tap any task creation type (Internal / Pre-Order / Return)
2. On the item identity field, tap the scan button → scanner slide opens
3. Scan a QR code or barcode → scanner slide closes, value written to field
4. Close the task creation form (swipe down or tap X)
5. Observe: the hardware camera indicator (iOS green dot or Android camera icon) remains on
6. Wait 2+ minutes — camera indicator never turns off

**Does NOT reproduce** if step 2–3 are skipped (form open → close without scanning → camera off immediately).

---

## Hypotheses

### Hypothesis A — `session.phase` not reset after decode session ends (root cause, confirmed)

`attachDecodeSession` sets `session.phase = "decoding"` when the decode loop starts. When the scanner slide closes after a successful scan, `attachDecodeSession`'s cleanup runs. Since `prewarmCount > 0` (form's prewarm is still active), it reattaches the video to the hidden prewarm host via `bindStreamToVideo`. **It does NOT reset `session.phase`** — the phase remains `"decoding"`.

Later, when the form closes, the prewarm cleanup in `prewarmCameraSession` runs:

```ts
// packages/scanner/src/domain/camera-session.manager.ts
if (session.prewarmCount === 0) {
  if (session.phase === "decoding") {
    return;   // ← early return, no idle release scheduled
  }
  scheduleIdleRelease(session, options.idleReleaseMs ?? CAMERA_IDLE_RELEASE_MS);
}
```

The `session.phase === "decoding"` guard was designed to protect against the form closing WHILE the decode session is still running. But because the phase is never reset to `"prewarming"` after the decode session hands control back to the prewarm host, the guard fires incorrectly — `scheduleIdleRelease` is never called, no `teardownSession` is ever triggered, and the stream lives forever.

**This is confirmed as the root cause.** The fix is to reset `session.phase` to `"prewarming"` inside the `attachDecodeSession` cleanup, in the `prewarmCount > 0` branch, before starting `bindStreamToVideo`.

---

### Hypothesis B — images camera `prewarmCameraStream()` overwrites `activeSessionId` (partially confirmed, separate issue)

`ImageAddPictureButton` fires `preloadImageCameraSurface()` on `onTouchStart` and `onPointerEnter`. `preloadImageCameraSurface()` calls `prewarmCameraStream()` from the images camera manager (`packages/images/src/lib/camera-session-manager.ts`). This function synchronously calls `keepCameraStreamWarm(PREWARM_CAMERA_SESSION_ID)`, setting the module-level `activeSessionId` to `"__prewarm_camera_session__"`.

If this fires after the user has opened and closed the images camera (`openCamera()` → `keepCameraWarm()` → `activeSessionId = cameraSessionId`), the prewarm overwrites `activeSessionId` back to `"__prewarm_camera_session__"`. When the form closes, `EntityImagesProvider`'s cleanup called `forceStopCameraStream(cameraSessionId)` — but `activeSessionId !== cameraSessionId`, so it returned early without stopping the images stream.

**This is a separate bug** (images camera stream not released after user interacts with the add-picture button area post-camera-close). It affects the images camera manager, not the scanner camera manager.

---

## What was implemented during this debug session

### Fix for Hypothesis B (merged, separate scenario)

Added `forceReleaseAnyCameraStream()` to `packages/images/src/lib/camera-session-manager.ts` — an unconditional `releaseCameraStream()` call with no session ID check. Updated `EntityImagesProvider` to call this on unmount instead of the session-gated `forceStopCameraStream(cameraSessionId)`.

Files changed:
- `packages/images/src/lib/camera-session-manager.ts` — added `forceReleaseAnyCameraStream()`
- `packages/images/src/providers/EntityImagesProvider.tsx` — unmount cleanup now calls `forceReleaseAnyCameraStream()` unconditionally; removed the `stopCameraNowRef` pattern

**Typecheck: pass.**

### Fix for Hypothesis A — NOT yet implemented (deferred)

The fix for the root cause (orphaned scanner stream after scan) requires resetting `session.phase` in `attachDecodeSession`'s cleanup. Deferred by user request.

---

## Debug implementation plan (for the deferred fix)

1. In `packages/scanner/src/domain/camera-session.manager.ts`, locate `attachDecodeSession`'s returned cleanup function.
2. In the `if (session.prewarmCount > 0)` branch, before calling `bindStreamToVideo`, add:
   ```ts
   session.phase = "prewarming";
   ```
3. Verify: `scheduleIdleRelease` is no longer blocked by the `"decoding"` phase guard when the form closes after a scan.
4. Run `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`.
5. Manual test: open form → scan → close form → confirm camera indicator turns off immediately.
6. Manual test: open form → close form without scanning → confirm camera indicator still turns off (regression check).

---

## Validation and regression checks

- `npm run typecheck`: pass (expected, no type changes needed for the fix)
- Manual — scan → close form → camera off immediately
- Manual — no scan → close form → camera off immediately (regression)
- Manual — scan → open images camera → close images camera → close form → camera off immediately (combined scenario)

---

## Contracts and skills

- Contracts loaded:
  - `architecture/35_shared_packages.md`: scanner lives as a source package under `packages/`

---

## Lifecycle transition

- Current state: `debugging`
- Next state: `implemented` (pending fix for Hypothesis A)
- Next artifact target: this document, updated after fix is applied
