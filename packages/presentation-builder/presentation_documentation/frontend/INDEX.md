# Presentation Capability — Frontend Knowledge Base (INDEX)

This folder is the **entry point for any agent working on the presentation capability
frontend**. It works like an MCP resource index: you arrive with an *intention*
("change how the timeline resize works", "add a field to publish settings"), look it
up in the router table below, and it tells you **which doc to read and which files to
open first**. Do not start by grepping the codebase — start here.

Sibling folders: [`../backend/`](../backend/) (API contracts — the source of truth for
every payload) and [`../design/`](../design/) (the two-screen visual design the studio
implements).

## Reading protocol for agents

1. Read this INDEX (you are here). Read [`00_system_map.md`](00_system_map.md) if this
   is your first contact with the capability.
2. Route your intention with the table below; read **only** the doc(s) it names.
3. Each zone doc lists its files with roles and its upstream/downstream edges — open
   the listed entry files, then follow imports.
4. Before changing any payload shape or lifecycle behavior, cross-check
   [`50_invariants_and_pitfalls.md`](50_invariants_and_pitfalls.md) — it records the
   rules that were violated at least once and cost a debugging session.
5. Validate with [`60_testing_playbook.md`](60_testing_playbook.md).

## The four code roots

| Root | npm name | One-liner |
|---|---|---|
| `packages/presentation-runtime/` | `@beyo/presentation-runtime` | Shared schemas + the one true slide renderer + playback clock. Zero network, zero auth. Both other packages depend on it — nothing else. |
| `packages/presentation-builder/` | `@beyo/presentation-builder` | Everything the desktop studio needs: admin API layer, editor state machine, timeline math, and the full presentational component kit. |
| `packages/presentations/` | `@beyo/presentations` | The phone player: fetch active announcement, auto-show orchestration, player surfaces, view-state recording, realtime. |
| `apps/presentation-studio/` | studio shell | Thin Vite app: routes + auth + env. All real UI/logic lives in `presentation-builder`. |

Plus **three phone-app mounts** (managers / sellers / workers), each exactly four glue
files in `src/app/` — see [`41_phone_app_integration.md`](41_phone_app_integration.md).

## Intention router

| Your intention touches… | Read | Start at |
|---|---|---|
| How a slide is *rendered* (text, media, animation, scaling) — anywhere | [`10_runtime_package.md`](10_runtime_package.md) | `packages/presentation-runtime/src/SlideCompositionRenderer.tsx` |
| Composition/slide/media **schemas** shared by editor and player | [`10_runtime_package.md`](10_runtime_package.md) | `packages/presentation-runtime/src/schemas.ts` |
| Playback timing, play/pause/seek clock | [`10_runtime_package.md`](10_runtime_package.md) | `packages/presentation-runtime/src/usePlaybackClock.ts` |
| Video playback anywhere (editor canvas, preview, phone) — **and trimming** | [`10_runtime_package.md`](10_runtime_package.md) | `packages/presentation-runtime/src/composition-video.ts` |
| Where text breaks lines, in the render **or** the inline editor | [`10_runtime_package.md`](10_runtime_package.md) + [`21_builder_editor_logic.md`](21_builder_editor_logic.md) | `compositionTextStyle` in `packages/presentation-runtime/src/SlideCompositionRenderer.tsx` |
| Admin API calls, query keys, cache invalidation (studio side) | [`20_builder_data_layer.md`](20_builder_data_layer.md) | `packages/presentation-builder/src/api/presentations.ts` |
| Create/update/publish/archive/version mutations, media upload | [`20_builder_data_layer.md`](20_builder_data_layer.md) | `packages/presentation-builder/src/actions/` |
| Editor behavior: selection, drag, autosave, dirty state, undo of intent | [`21_builder_editor_logic.md`](21_builder_editor_logic.md) | `packages/presentation-builder/src/controllers/use-presentation-editor.controller.ts` |
| Timeline math (px↔ms, min window, clamping) | [`21_builder_editor_logic.md`](21_builder_editor_logic.md) | `packages/presentation-builder/src/lib/timeline-geometry.ts` |
| Editor↔server composition translation (units, anchors, animation names) | [`21_builder_editor_logic.md`](21_builder_editor_logic.md) | `packages/presentation-builder/src/lib/composition-mapping.ts` |
| Text box sizing: width as wrap column, auto vs. authored height | [`21_builder_editor_logic.md`](21_builder_editor_logic.md) | `packages/presentation-builder/src/lib/text-box-layout.ts` |
| Slide duration bounds, parsing, formatting (**no maximum**) | [`21_builder_editor_logic.md`](21_builder_editor_logic.md) | `packages/presentation-builder/src/lib/slide-duration.ts` |
| Publish dialog logic: audience, category→priority, scheduling, 422 mapping | [`21_builder_editor_logic.md`](21_builder_editor_logic.md) | `packages/presentation-builder/src/lib/publish-form.ts` |
| **Visual styling** of any studio screen (dashboard cards, canvas, timeline bars, panels, publish dialog) | [`22_builder_component_kits.md`](22_builder_component_kits.md) | the kit folder for that screen under `packages/presentation-builder/src/components/` |
| Studio routes, sign-in, env vars, app shell | [`30_studio_app.md`](30_studio_app.md) | `apps/presentation-studio/ManagerBeyo-app-presentation-studio/src/app/router.tsx` |
| When/whether the phone player auto-opens; view-state loop; suppression | [`40_player_package.md`](40_player_package.md) | `packages/presentations/src/ActivePresentationProvider.tsx` |
| Player visuals (progress bar, dismiss/skip/CTA/acknowledge chrome) | [`40_player_package.md`](40_player_package.md) | `packages/presentations/src/components/player/` |
| Player slide advancement, **deck looping**, pause, exit unlocking | [`40_player_package.md`](40_player_package.md) | `packages/presentations/src/playback/usePresentationPlayback.ts` |
| Realtime push (socket events → refetch → auto-open) | [`40_player_package.md`](40_player_package.md) + [`41_phone_app_integration.md`](41_phone_app_integration.md) | `packages/presentations/src/realtime/presentation-socket-events.ts` |
| Mounting the player in a phone app; home-route policy; surface openers | [`41_phone_app_integration.md`](41_phone_app_integration.md) | `apps/<app>/…/src/app/PresentationMount.tsx` |
| A payload/parse bug ("player silently doesn't open", 422 on save) | [`50_invariants_and_pitfalls.md`](50_invariants_and_pitfalls.md) first | — |
| Running tests / verifying a change end-to-end | [`60_testing_playbook.md`](60_testing_playbook.md) | — |

## Rules that outrank everything (summary — details in doc 50)

- **Dependency direction is one-way**: `runtime ← builder`, `runtime ← presentations`,
  apps ← packages. `builder` and `presentations` never import each other.
- **Backend docs are the payload truth** (`../backend/`). Frontend schemas are lenient
  consumers: draft-state payloads may be "unnormalized" (`sequence_order: 0`), nullable
  fields (`category`) must be nullable here too. Both have caused real bugs.
- **Never mirror composition text into `slide.title`** — text lives only in elements.
- Component-kit files are **props-only presentational**; logic agents wire them but do
  not restyle them (division-of-labor rule from the master plan).

## Provenance

Built 2026-07-22/23 across 9 phases. History, decisions, and V1–V3 resolutions:
`docs/architecture/archives/implementation/PLAN_presentation_capability_master_20260722.md`
and `docs/architecture/implemented_summaries/SUMMARY_presentation_phase*_*.md`.
