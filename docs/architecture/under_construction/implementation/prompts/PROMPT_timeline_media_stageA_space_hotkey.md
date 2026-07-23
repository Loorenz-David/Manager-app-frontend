# Codex — Timeline/Media Stage A: reliable space play/pause

You are implementing **Stage A only** of an approved corrections plan, working in
the `frontend/` monorepo root. This stage is small and file-disjoint from the
in-flight text-block corrections — do not touch `CanvasDraggableBox`,
`TextBlockPanel`, upload logic, or anything media-related. Start coding early.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_timeline_media_corrections_20260723.md`
— Root-cause finding (A), Stage A steps 1–4, acceptance criterion 1.

Key fact (already verified — don't re-derive): there is currently NO space
handler at all; play/pause "working sometimes" is native re-triggering of the
still-focused play button. You are adding the missing editor-wide transport
hotkey.

## Read (only this)

1. The plan sections named above.
2. Knowledge base routing: `packages/presentation-builder/presentation_documentation/frontend/21_builder_editor_logic.md`
   (controller/view ownership) — skim its file table only.
3. Relational: `packages/presentation-builder/src/views/EditorView.tsx`
   (`TimelineCanvasWorkspace`: `clock`, `onPlaybackCheckpoint`, play button
   wiring), `src/components/preview/PreviewOverlay.tsx` (existing Escape
   keydown pattern), `src/publish/PublishDialog.tsx` (only to confirm how to
   detect it's open, for the suppression rule).

## Deliver

1. `useEditorTransportHotkey` hook in `packages/presentation-builder/src/lib/`
   (logic module — NOT a component kit file): window `keydown` for `" "`;
   ignore when `event.defaultPrevented`, or when the target or an ancestor is
   `input` / `textarea` / `select` / `[contenteditable]` (structural guard, no
   field allowlist), or while the publish dialog is open. Otherwise
   `event.preventDefault()` (kills page scroll AND the focused-button native
   re-trigger — this is the double-toggle fix) and invoke the callback.
2. Mount in `TimelineCanvasWorkspace`, toggling through the exact same path as
   the play button (`clock` play/pause + `onPlaybackCheckpoint`). Active in
   read-only mode too (playback is allowed there).
3. `PreviewOverlay`: extend the existing keydown handler — space →
   `onTogglePlay`, same typing guard (plan assumption; note it in the Review
   log line).
4. Tests (vitest, builder package): fires with body/button/canvas focus;
   suppressed inside textarea and contentEditable; works again after blur;
   `preventDefault` called; exactly ONE toggle when the play button has focus;
   suppressed while publish dialog open. Extend the studio editor Playwright
   spec: space plays; typing a space in the panel textarea does not toggle;
   after blur, space pauses.

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentation-builder`
- Studio Playwright editor spec, `--project=desktop` (ask the operator to start
  the studio dev server — NEVER start it yourself)

## Finish

Append one dated line to the plan's Review log: "Stage A implemented —
<validation results, any deviations>". No archiving, no summary, no status
change. Clean-boundary rule: never stop before writing code; if blocked, report
precisely where.
