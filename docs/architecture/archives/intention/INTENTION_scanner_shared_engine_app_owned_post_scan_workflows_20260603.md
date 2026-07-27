# INTENTION_scanner_shared_engine_app_owned_post_scan_workflows_20260603

## Metadata

- Intention ID: `INTENTION_scanner_shared_engine_app_owned_post_scan_workflows_20260603`
- Status: `active`
- Owner: `codex`
- Created at (UTC): `2026-06-03T19:01:33Z`
- Last updated at (UTC): `2026-06-03T19:28:59Z`

## Goal

Evolve `@beyo/scanner` into a shared scanner engine plus reusable scanner UI primitives, while moving post-scan workflow orchestration and app-specific overlays into app-owned scanner slide pages.

## Why this matters

The scanner runtime itself is shared across apps, but the workflow after a successful scan is not. Some apps should scan and close immediately, while others will need API calls, loading/error states, frozen success frames, and result cards rendered inside the scanner. Keeping those state machines inside the shared package would make the package brittle and over-configured. A shared engine with app-owned route entries preserves reuse where it is stable and keeps product-specific flows local to each app.

## Success criteria

1. `@beyo/scanner` remains the owner of camera-session lifecycle, decode loop, scan-format handling, frame capture, guide geometry, and reusable scanner UI primitives.
2. Shared scanner UI primitives exist for at least:
   - the current scanner viewport/guide shell,
   - a scanner close control positioned for scanner use (bottom-right corner),
   - a camera-lens picker primitive styled as a centered pill control and rendered only when more than one camera is available.
3. Scanner slide route-entry behavior is no longer forced by the shared package; each app can own what happens after decode success, including close-immediately flows, API-backed flows, frozen success frames, result cards, retries, and custom overlays.
4. The managers app consumes the shared scanner engine and shared scanner UI primitives without introducing a manager-specific action overlay; its current behavior remains scan -> set value -> close.
5. A second app can adopt the shared engine and primitives while implementing a different post-scan workflow without modifying the shared scanner decode/session internals.

## Scope boundary

- In scope:
  - Defining the architecture boundary between shared scanner engine responsibilities and app-owned scanner workflow responsibilities.
  - Adding scanner-specific shared UI primitives that are stable across apps.
  - App-owned scanner slide pages / route entries for workflows that differ after scan success.
  - Preserving current manager-app scanning behavior while migrating ownership boundaries.
  - Supporting overlays and post-scan states in other apps through app-local composition rather than shared-package callbacks.
- Out of scope:
  - Designing the full overlay/result UX for every app up front.
  - Workers-app-specific scanner product behavior in this intention document.
  - Changing scanner-core camera session ownership back into apps.
- Non-goals:
  - Making `@beyo/scanner` own every possible post-scan success/error/loading state.
  - Forcing all apps to share identical overlay copy, result cards, or confirmation flows.
  - Removing shared scanner UI primitives just because workflows diverge.

## Linked implementation plans

| Plan ID | Path | Status | Covers |
|---------|------|--------|--------|
| `PLAN_scanner_package_20260603` | `docs/architecture/archives/implementation/PLAN_scanner_package_20260603.md` | `archived` | Establish shared scanner package ownership for camera runtime, slide surface integration, and managers-app consumption groundwork |
| `PLAN_scanner_multi_format_20260603` | `docs/architecture/archives/implementation/PLAN_scanner_multi_format_20260603.md` | `archived` | Add format-aware decoding and guide geometry so the shared engine already supports app-selected scan modes |
| `PLAN_TBD_scanner_shared_controls_primitives_20260603` | `docs/architecture/archives/implementation/PLAN_TBD_scanner_shared_controls_primitives_20260603.md` | `archived` | Add shared scanner close-control and multi-lens picker primitives for cross-app reuse |
| `PLAN_TBD_scanner_app_owned_route_entry_boundary_20260603` | `docs/architecture/archives/implementation/PLAN_TBD_scanner_app_owned_route_entry_boundary_20260603.md` | `archived` | Compose the shared controls into the default route entry and complete the public API needed for future app-owned scanner workflows |

## Progress notes

- `2026-06-03`: Confirmed the correct boundary is “shared scanner engine, app-owned workflow after scan success” rather than pushing app-specific success flows into `@beyo/scanner`.
- `2026-06-03`: Confirmed the managers app should stay minimal: it consumes shared scanner primitives and closes on success without introducing its own action overlay.
- `2026-06-03`: Identified two stable shared scanner UI primitives worth standardizing now: a scanner close button for bottom-right placement and a centered pill-style camera lens options control when multiple cameras are available.
- `2026-06-03`: Confirmed future apps will need divergent post-scan state machines such as API submission, loading/error handling, frozen success frames, and item-card rendering inside the scanner surface.
- `2026-06-03`: Implemented and archived `PLAN_TBD_scanner_shared_controls_primitives_20260603`; `@beyo/scanner` now exports `ScannerCloseControl`, `ScannerLensPicker`, `FrozenFrameCanvas`, and `ScannerSlideContent` children composition for reusable in-shell overlays.
- `2026-06-03`: Implemented and archived `PLAN_TBD_scanner_app_owned_route_entry_boundary_20260603`; the shared default route entry now composes the shared controls and lens selection, while the public API is sufficient for future app-owned post-scan workflows.

## Open questions

- Should the shared scanner package continue to export a default `ScannerSlideRouteEntry`, or should that be removed entirely once app-owned route entries exist? — impact if unresolved: ownership boundaries may remain ambiguous and new flows may keep extending the shared route entry instead of composing locally.
- Should the shared lens-picker primitive own lens persistence behavior directly or only render options/callbacks while `useQrScanner` remains the source of available/active lenses? — impact if unresolved: the primitive/package API may blur presentational and state ownership.
- Should frozen success-frame composition remain a low-level primitive only (`FrozenFrameCanvas`) or grow into a richer shared success-shell primitive? — impact if unresolved: future apps may either duplicate success-layout work or over-generalize too early.

## Lifecycle transition

- Current status: `active`
- Next status: `achieved`
- Transition trigger: shared scanner engine/primitives boundary is implemented, managers app consumes the shared primitives without custom overlay logic, and at least one divergent app-specific post-scan workflow can be composed without changing scanner runtime internals.
