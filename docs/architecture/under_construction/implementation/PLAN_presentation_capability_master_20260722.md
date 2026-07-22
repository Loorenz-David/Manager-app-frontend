# PLAN_presentation_capability_master_20260722

## Metadata

- Plan ID: `PLAN_presentation_capability_master_20260722`
- Status: `under_construction`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-22T00:00:00Z`
- Last updated at (UTC): `2026-07-22T00:00:00Z`
- Related issue/ticket: none provided
- Intention plan: none (this master plan carries the intent; design + backend handoff below are the source documents)
- Backend handoff (authoritative API contract): `docs/presentation_capability/backend/` (files `01`–`09` + `README.md`)
- Design handoff (authoritative look & interaction): `docs/presentation_capability/design/README.md` + 3 screenshots
- Plan type: **Master plan** — defines the phased sequence and shared decisions for the presentation capability. It is not itself executable. Each phase has a child plan (`PLAN_presentation_*_20260722.md`), created alongside this master, each carrying its own clarifications, contracts, and steps. Child plans defer to this master wherever the two could disagree; corrections flow back into this master.

## Goal and intent

- Goal: Build the full **presentation (announcement) capability** on top of the already-implemented backend at `/api/v1/app-update-presentations`:
  1. A new **desktop (PC) creation app** — `apps/presentation-studio/` — where admins/managers build, preview, target, schedule, and publish slide-based announcements with a video-editor-style timed-text/media timeline.
  2. A fully **package-contained builder** — `@beyo/presentation-builder` — so the creation system can be lifted into other applications or sold by parts.
  3. A shared **runtime/render core** — `@beyo/presentation-runtime` — the composition types, animation registry, and playback engine used by both the builder (canvas/preview) and the phone player.
  4. A **phone player package** — `@beyo/presentations` — consumed by the managers, sellers, and workers apps to auto-show the active presentation and record view-state.
- Business/user intent: managers communicate news, routines, and app updates to their workforce as short, portrait, timed slide decks ("announcements"), authored on a PC and consumed inside the three phone apps. The system must be modular enough to transplant/sell each part independently (builder, runtime, player).
- Non-goals (v1):
  - "What's New" history feed page in the phone apps (`GET /history` is not wrapped; explicit user decision 2026-07-22).
  - Push notifications on publish (backend itself lists this as not implemented; the socket refresh signal IS in scope for Phase 9).
  - Backend changes of any kind. The backend is complete and tested.
  - Mobile/responsive layout for the studio app — the studio is PC-only (the phone-format *output* is the point, the *tool* is desktop).
  - Editing the design or backend handoff documents.

## Scope

- In scope: three new packages (`presentation-runtime`, `presentation-builder`, `presentations`), one new app (`presentation-studio`), and the phone-app wiring (managers, sellers, workers) to mount the player.
- Out of scope: everything under Non-goals; also any admin "user browser" beyond what audience targeting needs (user picker uses the existing users listing the apps already have — Phase 6 child plan resolves the exact source).
- Assumptions:
  - The backend docs in `docs/presentation_capability/backend/` are ground truth; no route, field, or enum may be invented beyond them.
  - The design README + screenshots are ground truth for look/interaction of the two studio screens; where the design's data model and the backend's differ, the **mapping table below** is authoritative.
  - Monorepo conventions from `architecture/*.md` contracts apply to the new app and packages exactly as to existing ones.

## Decisions resolved with the user (2026-07-22)

| # | Question | Decision |
|---|---|---|
| 1 | App/package naming | App `apps/presentation-studio/ManagerBeyo-app-presentation-studio` (thin shell). Packages `@beyo/presentation-builder` (`packages/presentation-builder`), `@beyo/presentations` (`packages/presentations`). This master adds `@beyo/presentation-runtime` (`packages/presentation-runtime`) as the shared core both depend on — required by the "sell by parts" goal. |
| 2 | Studio users / auth scope | **Admin and manager** roles use the studio. Resolved via V1: the studio signs in with **`appScope="manager"`** (the `manager` scope permits both manager and admin roles; the `admin` scope is restricted to the admin role). Role — not app_scope — gates authoring. |
| 3 | Master plan span | One master plan, all phases — creation side first (Phases 1–7), phone player after (Phases 8–9). |
| 4 | Metadata/audience UI | **Publish flow dialog**: clicking Publish opens a settings step (audience, category, type, dismissibility, priority, schedule) before confirming. The editor canvas stays as in the mockup. |
| 5 | Opening a published announcement | Editor opens **read-only** with a prominent **"Edit as new version"** button → `POST /{id}/new-version` → switch to the new draft. |
| 6 | Save model | **Hybrid.** Structural ops (create draft, slide add/delete/reorder, media upload/attach/delete, title PATCH) hit the backend immediately. Composition edits (text/timing/position/animation/style, slide duration) stay local per slide and are flushed via `PUT .../composition` on **Save draft**, on **slide switch**, and by **debounced autosave**. |
| 7 | Video slides | All slides are `playback_mode: "timed"` with the 2–12s duration slider, exactly as mocked. `media_driven` is not used in v1. |
| 8 | Media per slide | **Multiple media per slide**, modeled as timeline tracks: one background media (full-bleed, whole slide) + additional timed/positioned media elements with bars on the timeline like text blocks. |
| 9 | Slide CTA | Yes in v1 — CTA label + in-app route fields in the slide properties panel (route must start with `/`, per backend validation). |
| 10 | Phone player surfacing | **Auto-show `/active`** on app open (respecting `presentation_type`) + **realtime refresh** via the `app_update_presentation:published` socket event. What's New page deferred. |
| 11 | Dashboard statuses | Filters: All / Published / Drafts / Scheduled / Archived. **Scheduled = `published` with `starts_at` in the future** (derived client-side). Archived chip added beyond the mockup. |

## Open verification items — ALL RESOLVED (backend team, 2026-07-22)

- **V1 — studio sign-in scope — RESOLVED**: role (`role_name`) and `app_scope` are two independent axes (now documented in backend `02_conventions.md` → "Role vs. app_scope — two independent axes"). Authoring is gated by role (`admin` or `manager`) only; `app_scope`'s sole job is the consumer endpoints' `app_key` match. Login rule: the `admin` scope is restricted to the admin role, so the studio signs in with **`appScope="manager"`**, which permits both manager and admin roles. The studio (pure build/publish UI) needs no consumer calls; if it ever calls `/active`/`/history`, `app_key` must be read from the JWT `app_scope` claim — **never hardcoded**.
- **V2 — publish validation vs. text-only slides — RESOLVED**: publish accepts a slide whose only content is composition elements (elements OR media OR title/description). Text-only timed slides are first-class, covered by a passing backend test; the stale doc line was corrected in `04_admin_presentations.md`. **The title-mirror mitigation is dropped — do NOT mirror text into `slide.title`** (title is legacy metadata; the composition is the source of truth).
- **V3 — socket events — RESOLVED**: Socket.io events `app_update_presentation:published` and `app_update_presentation:archived`, emitted to room `workspace:{workspace_id}` (clients auto-join on connect). Payload, no outer envelope: `{ "client_id": "aup_...", "logical_client_id": "aup_...", "version": 2 }`. It is a change signal only — on receipt refetch `/active`; no slide/content data is carried. No created/updated events exist. Documented in `04_admin_presentations.md` → "Realtime (socket) events". Phase 9 subscribes to **both** events (an archived presentation may be the one currently active, so archived also invalidates the active query).

## Package boundaries (the "sell by parts" contract)

```
@beyo/presentation-runtime   (packages/presentation-runtime)   ← no network, no auth, no backend knowledge beyond the composition schema
  - Zod schemas + types for the composition domain: element, layout, style,
    enter/exit animation, playback_mode, composition_schema_version (v1)
  - Animation registry: backend animation `type` → actual CSS/framer variants
  - <SlideCompositionRenderer/>: renders one slide's `elements` at time `t`
    (scaled to any container size via normalized layout)
  - usePlaybackClock(): rAF clock with dt clamp (≤0.1s), play/pause/seek/loop
  - Reference-scale constants (see mapping table)

@beyo/presentation-builder   (packages/presentation-builder)   ← the sellable creation system
  - Admin API layer (all admin endpoints), query keys, query hooks, action hooks
  - Editor domain: draft composition store, design↔backend element mapping
  - All studio UI: dashboard view, editor (rail/canvas/timeline/properties),
    preview overlay, publish dialog, read-only mode
  - Permission helper (admin/manager booleans)
  - Depends on: @beyo/presentation-runtime, @beyo/ui, @beyo/hooks, @beyo/lib,
    @beyo/api-client, @beyo/auth (peers, same as other packages)

@beyo/presentations          (packages/presentations)          ← the phone player
  - Consumer API layer (`/active`, `view-state`), query keys, hooks
  - Active-presentation orchestration provider (fetch → show → record → refetch)
  - Player surfaces per presentation_type (modal / full_screen / slide_page)
  - Realtime refresh subscription
  - Depends on: @beyo/presentation-runtime (+ standard peers)

apps/presentation-studio     ← thin shell only
  - Auth (admin+manager), routing (dashboard, editor/:id), providers,
    QueryClient, styling @source registration, desktop layout chrome
  - Owns zero builder logic; everything comes from @beyo/presentation-builder
```

Rules binding every child plan:
- No package imports an app-specific route, surface ID, or navigation function. App wiring flows through props/`surfaceOpeners` per `35_shared_packages.md` §13–14.
- `presentation-runtime` must never import from `presentation-builder` or `presentations` (dependency arrows point inward only).
- The studio app must remain deletable without touching builder behavior — any logic that would survive a port to another host app belongs in the package.

## Design → backend mapping (authoritative)

The design README models slides as `{ media, duration, texts[] }` with seconds, %-positions, and px sizes. The backend models slides as timed compositions (`09_slide_composition.md`). This table is the single conversion contract; the mapping code lives in `@beyo/presentation-builder` (editor→API) and its inverse in the load path:

| Design concept | Backend representation |
|---|---|
| Slide duration slider 2–12s | `playback_mode: "timed"`, `duration_ms: 2000–12000` (step 500) |
| Background media (one per slide) | `media` element, `layer_index: 0`, `start_ms: 0`, `end_ms: null`, `layout: {x:0, y:0, width:1, height:1, fit:"cover"}` |
| Additional media tracks (decision #8) | `media` elements, `layer_index: 1–9`, `start_ms`/`end_ms` from their bars, positioned layout (normalized, anchor `center`) |
| Text block | `text` element, `layer_index: 10+` (order of creation) |
| `appear` / `disappear` (seconds) | `start_ms` / `end_ms` (×1000). `disappear ≥ appear + 0.4s` → enforce `end_ms ≥ start_ms + 400` |
| Text `x`/`y` (%, center-anchored) | `layout.x`/`layout.y` as **center coordinates** (0..1) with `anchor: "center"`; `layout.width`/`height` from the measured text bounding box normalized to canvas size at save time |
| `animIn`/`animOut`: `fade` | `{type:"fade", duration_ms:450}` |
| `animIn`/`animOut`: `slide` (enter from +20px, exit toward −20px) | `{type:"fade_up", duration_ms:450}` for both enter and exit (fade_up = fade while translating upward; matches the mock's motion) |
| `animIn`/`animOut`: `none` | `{type:"none"}` (or omit) |
| ANIM constant 0.45s | `duration_ms: 450` on every non-none animation |
| Text `size` 12–52px (at 264×470 canvas) | `style.font_size` stored at **reference width 390** (`font_size = editorPx × 390/264`, rounded). `REFERENCE_CANVAS_WIDTH = 390` is exported by `@beyo/presentation-runtime`; every renderer scales fonts by `containerWidth / 390`. |
| Text `weight` 400/700 | `style.font_weight: 400 \| 700`; `style.text_role`: `"body"` for 400, `"headline"` for 700 |
| Slide CTA (decision #9) | slide `action_label` + `action_route` via slide PATCH (not composition) |
| Editor-only state (`currentSlideId`, `selectedTextId`, `playhead`, `playing`, `mode`) | never persisted |

Canvas geometry: editor canvas 264×470 (bezel excluded), preview 300×533, phone rendering full-screen — all render through `SlideCompositionRenderer`, which takes a container size and scales normalized layout + reference-width fonts. One renderer, three consumers; no per-surface math.

## Backend route ownership by phase

| Route (base `/api/v1/app-update-presentations`) | Package | First used in phase |
|---|---|---|
| `PUT` (create draft) | builder | 3 (dashboard "New announcement") |
| `GET` list/search | builder | 3 |
| `GET /{id}` | builder | 4 (editor load) |
| `PATCH /{id}` (metadata) | builder | 4 (title), 6 (publish-dialog fields) |
| `POST /{id}/publish` | builder | 6 |
| `POST /{id}/archive` | builder | 6 (dashboard/editor action) |
| `POST /{id}/new-version` | builder | 6 (read-only mode) |
| `GET /{id}/preview` | builder | 6 (preview overlay uses consumer shape) |
| `POST /{id}/slides`, `PATCH`, `DELETE`, `/slides/reorder` | builder | 4 |
| `POST .../media/upload-url`, `PUT` S3, `POST .../media` (confirm), `PATCH`, `DELETE`, `/media/reorder` | builder | 4 |
| `PUT .../composition` | builder | 5 |
| `PUT /{id}/audience` | builder | 6 |
| `GET /active?app_key=` | presentations | 8 |
| `POST /{id}/view-state` | presentations | 8 |
| `GET /history` | — | **not wrapped in v1** (deferred with the What's New page; no scaffolding, per the no-speculative-code convention) |

Error/envelope handling: standard `{data, ok, warnings}` envelope and the two error shapes (`error` domain / `detail` framework) exactly match `04_api_client.md` + `04_api_client_local.md`. No new parsing logic anywhere; 409 (not-draft) and 422 (publish validation) get dedicated UX in Phases 4–6.

## Permission model

`usePresentationBuilderPermissions()` (in `@beyo/presentation-builder/src/lib/`, consumes `useRole()` from `@beyo/auth` per `19_permissions_local.md`):

| Boolean | admin | manager | worker | seller |
|---|---|---|---|---|
| `canManagePresentations` (create/edit/publish/archive/version/audience) | ✓ | ✓ | ✗ | ✗ |

The backend gates all admin endpoints to admin+manager identically, so v1 needs a single capability boolean. Consumer endpoints (Phase 8) are all-roles; the player package needs no permission helper. Components receive booleans as props, never call `useRole()` directly; frontend hiding is UX, never security.

## Phased child implementation sequence

Each phase = exactly one child plan, implemented and debugged before the next begins. A child plan must not implement a later phase's responsibilities.

| Phase | Child plan | Delivers |
|---|---|---|
| 1 | `PLAN_presentation_phase1_builder_foundation_20260722` | `@beyo/presentation-builder` skeleton + `types.ts` (all admin entities/enums/wrappers) + query keys + API functions + query hooks + action hooks for every admin route + permission helper. No UI. |
| 2 | `PLAN_presentation_phase2_studio_bootstrap_20260722` | New app `apps/presentation-studio` — Vite + auth (V1 scope decision applied) + routing (`/`, `/editor/:presentationId`) + providers + `index.css` `@source` registration + desktop chrome + root scripts (`typecheck`, workspaces). Empty routed pages only. |
| 3 | `PLAN_presentation_phase3_studio_dashboard_20260722` | Dashboard screen (1a): list query with `q` search + status filters (incl. derived Scheduled, added Archived), card grid with mini-phone covers, latest-version-per-announcement grouping, "New announcement" → create draft → navigate to editor. |
| 4 | `PLAN_presentation_phase4_editor_shell_slides_media_20260722` | `@beyo/presentation-runtime` package (schemas, static `SlideCompositionRenderer`, reference-scale) + editor screen shell (1b): top bar, slide rail (add/delete/reorder/select — eager ops), canvas static render, media upload (2-step S3, progress, MIME/size caps) for background + overlay media, editor draft store (hybrid save skeleton), read-only detection (published → banner; full read-only UX in Phase 6). |
| 5 | `PLAN_presentation_phase5_editor_timeline_composition_20260722` | The core editor: `usePlaybackClock` in runtime + timeline (ruler, per-element tracks/bars, drag/resize handles with 0.4s min + clamping, red playhead, scrub, play/pause loop), canvas text drag/position + animated rendering at playhead time, properties panels (text block / media element / slide props incl. duration + CTA), `+ Text` at playhead, full design↔backend composition mapping, per-slide dirty tracking, `PUT composition` flush on save/slide-switch/autosave. |
| 6 | `PLAN_presentation_phase6_editor_preview_publish_20260722` | Preview overlay (all slides, `GET /{id}/preview` shape through the runtime renderer, progress bar + dots), publish dialog (audience targeting UI, category, presentation_type, dismissibility, priority with category-derived default, starts_at/expires_at), publish/archive/new-version actions with 409/422 surfacing, read-only mode + "Edit as new version" (decision #5). (V2 resolved — no mitigation.) |
| 7 | `PLAN_presentation_phase7_studio_validation_polish_20260722` | Loading/empty/error/skeleton states everywhere, Vitest suites (runtime mapping + builder hooks/components), Playwright specs (desktop project; studio has no mobile), root script registration (`test:presentation-*`), public-API (`index.ts`) audit of all three packages built so far, frontend handoff doc for future host apps. |
| 8 | `PLAN_presentation_phase8_player_package_20260722` | `@beyo/presentations`: consumer types + `/active` + `view-state` API/hooks, active-presentation orchestration (shown → progressed → completed/dismissed loop, dismissible gating, refetch-after-terminal), player surfaces for the three `presentation_type`s rendering via runtime renderer, timed auto-advance between slides, CTA navigation callback injection. |
| 9 | `PLAN_presentation_phase9_phone_apps_wiring_20260722` | Mount the player in managers/sellers/workers apps (provider + surface registration + `@source` + app_key per app), realtime `app_update_presentation:published` → invalidate active query (V3 verified), Vitest + Playwright (mobile first, then desktop) across all three apps. |

Dependencies: 1→(2,3,4…) linear for the studio side; 8 depends on 4–5's runtime package (not on 6–7); 9 depends on 8. Phases 8–9 may be re-planned in detail once the creation side ships — their child plans exist now but carry a `Re-validate against master` note.

## Division of labor — Claude (design) vs. Codex (architecture/logic)

Decided with the user 2026-07-22. The split follows the layer seam the contracts already enforce (presentational components are props/context-only; logic lives in hooks/controllers/stores/pure modules).

**Ownership rule:**
- **Claude owns component files** — DOM structure, Tailwind classes, design tokens, motion, skeletons. For every UI phase, Claude builds the phase's **component kit first**, props-first against mock data (a "kit session"), matching the design README's token tables, before the Codex session starts. Each component ships with a typed prop contract (data in, callbacks out) and `data-testid`s.
- **Codex owns everything else** — types, api, hooks, stores, controllers, geometry, mapping, persistence, tests — and the **assembly**: composing Claude's components into views and feeding controller state through their props.
- **Codex treats Claude's components as read-only.** If a prop contract doesn't fit, Codex records the needed change in the plan's Review log and (if small and purely additive to the contract, e.g. a new optional prop) may add it without touching DOM/classes; anything structural or visual waits for Claude. Codex never restyles, never restructures markup, never edits class lists.
- Interaction-heavy components (timeline bars, canvas dragging): Claude builds the pointer handling that calls **injected callbacks only** (e.g. `onWindowChange(startMs, endMs)`); Codex supplies those callbacks from geometry + store. Components still contain no arithmetic beyond calling injected/pure helpers.

**Per phase:**

| Phase | Codex (session per prompt) | Claude (kit session before it) |
|---|---|---|
| 1 | everything (no UI) | — |
| 2 | everything | optional post-pass on sign-in/shell chrome |
| 3 | dashboard controller, helpers, assembly, tests | kit: top bar, filter row, announcement card, new-card, mini-phone cover, status pills, skeleton grid |
| 4 | runtime renderer, store, upload orchestration, slide ops | kit: editor top bar, slide rail + rail card, canvas bezel/placeholder, upload overlay |
| 5 | clock, animation registry, geometry, mapping, persistence | kit: timeline (ruler, tracks, bars, handles, playhead), three properties panels, canvas text-block styling |
| 6 | audience mapping, publish orchestration, lifecycle actions | kit: preview overlay, publish dialog, read-only banner |
| 7 | tests, coverage, bundle, public-API audit | design-fidelity + a11y half of the checklist |
| 8 | consumer api, view-state orchestration, playback modes | kit: player chrome (progress, dots, CTA, dismiss affordances) |
| 9 | all app wiring | final chrome check |

**Workflow per UI phase:** resolve the phase gate → Claude kit session (components committed, rendered with mock props for user design review) → user approves the kit → Codex session runs its prompt (which states the kit exists and is read-only) → Claude reviews the implementation.

## Contracts and skills

### Contracts loaded (master-level; each child re-lists its own subset)

Core (always, per `task_system/frontend_contract_goal_mapping_guide.md`): `01_architecture.md` (+`_local`), `02_types.md`, `04_api_client.md` (+`_local`), `05_server_state.md`, `06_client_state.md`, `08_hooks.md`, `13_errors.md`, `15_feature_structure.md`.

Goal bundles + triggers:
- **New application bootstrap**: `14_styling.md` §14 (`@source` table, template `index.css`) — Phase 2.
- **New feature (CRUD)**: `16_feature_workflow.md`, `07_components.md`, `09_forms.md`, `10_pages.md`, `11_routing.md`, `23_providers.md`, `24_dto.md`, `17_testing.md`, `34_runtime_validation.md` (+`_local`).
- Triggers: "file upload" → `22_file_handling.md` (Phase 4 S3 flow); "permission/role" → `19_permissions.md` (+`_local`); "modal/surface" → `28_surfaces.md` (+`_local`) and `33_vaul_drawer.md` (phone phases only — studio dialogs are desktop modals per `28`); "animation" → `31_animations.md`; "skeleton" → `32_loading_skeletons.md`; "auth/sign-in" → `12_auth.md` (+`_local`) (Phase 2 only — the only phase implementing sign-in wiring); "socket/realtime" → `21_realtime.md` (Phases 8–9); "lazy load/preload" → `30_dynamic_loading.md` (+`_local`), `18_performance.md`; "notification/toast" → `20_notifications.md`; "responsive/mobile" → `27_responsive.md` (Phases 8–9); "env var" → `03_environment.md` (Phase 2).
- Task-specific: `35_shared_packages.md` — package boundaries, `surfaceOpeners`, loader functions, package.json/tsconfig templates. Central to every phase.

Excluded: `21_realtime.md` for Phases 1–7 (no live updates in the studio v1); `36_scroll_visibility.md` / `37_keyboard_aware_inputs.md` for the studio (desktop, no scroll-hide shell or software keyboard — phone phases re-evaluate); `25_user_profile.md`, `26_persistence.md`, `29_scrollbars.md` unless a child plan hits a concrete trigger.

### Domain grounding

This capability introduces a **new domain**. There is no existing `types.ts` — Phase 1 creates it, deriving every entity/field/enum **only** from `docs/presentation_capability/backend/` (never from contract example names). Entities: `Presentation`, `PresentationListItem`, `Slide`, `SlideMedia`, `CompositionElement`, `ElementLayout`, `TextStyle`, `ElementAnimation`, `Audience`, `ViewState`, plus enums from `07_enums.md`. IDs: `aup_`/`aups_`/`aupm_`/`pu_`/`aupv_` prefixed ULIDs; `logical_client_id` + `version` semantics per `01_concepts.md`.

### Targeted implementation references (read for "what exists," never for style)

| File | Read only for |
|---|---|
| `packages/shopify/src/` — `package.json`, `tsconfig.json`, `surface-ids.ts` only | newest package scaffolding + surface-ids conventions (relational confirmation) |
| `packages/auth/src/components/AuthProvider.tsx`, `apps/managers-app/.../src/app/RootRoute.tsx` | `appScope` prop wiring for the new app's shell (Phase 2) |
| `packages/ui/src/components/primitives/state-pill/StatePill.tsx` | props for status pills (Published/Draft/Scheduled/Archived) |
| `packages/ui` `BackendImage` component | stable presigned-URL image rendering (thumbnails, media previews) — presigned URLs are short-lived (~24h), never persisted |
| `packages/stats/src/lib/time-line-calendar/geometry.ts` | precedent for pure geometry helpers + tests (relational: how this repo factors time↔pixel math; the editor timeline writes its own) |
| An existing app's `vite.config.ts`, `index.css`, `package.json` (managers-app) | app bootstrap wiring to replicate (Phase 2), alongside `14_styling.md` §14 |

### Skill selection

- No repo skill covers this; standard build order from `16_feature_workflow.md` applies per phase. Playwright per `34_runtime_validation_local.md` (desktop project for studio; mobile-first for phone phases).

## Acceptance criteria (master-level)

1. Every wrapped route matches `docs/presentation_capability/backend/` exactly — method, path, roles, field names, enums; nothing invented; `GET /history` not wrapped.
2. Dependency arrows: `runtime ← builder`, `runtime ← presentations`; runtime has zero network/auth imports; the studio app contains no builder logic.
3. The design↔backend mapping table is implemented in exactly one place (builder) with its inverse, and round-trips: load → edit → save → reload reproduces identical timing/position/animation.
4. Draft-only rule respected in UX: published/archived presentations are never editable in the UI; the only mutation offered on them is archive / new-version; a 409 that still occurs surfaces as a friendly state, not a crash.
5. The publish dialog can express every audience form in `06_admin_audience.md` (both modes, all four dimensions, own-workspace-only) and surfaces 422 publish validation per-cause.
6. One renderer: editor canvas, preview overlay, and phone player all render compositions through `@beyo/presentation-runtime`'s `SlideCompositionRenderer` — no duplicated element/animation rendering anywhere.
7. View-state loop per `03_consumer_endpoints.md`: shown on display, progressed monotonically, completed/dismissed terminal handling, then `/active` refetch for the next item.
8. All child plans keep phase boundaries; no phase implements a later phase's responsibilities.
9. This master plan implements no code and modifies neither the backend nor the design handoffs.

## Risks and mitigations

- Risk: V1 (auth scope) turns out wrong after the app shell is built. — **Closed**: V1 resolved before implementation began; `appScope="manager"` is fixed.
- Risk: publish validation rejects text-only slides (V2), discovered only in Phase 6. — **Closed**: V2 resolved; text-element-only slides are valid; no mitigation needed.
- Risk: the timeline's drag math (time↔pixel, clamping, min-length) accumulates edge bugs.
  Mitigation: Phase 5 mandates pure, unit-tested geometry helpers (time↔px, clamp, min-window) separated from React, mirroring the tested `stats` timeline-geometry approach.
- Risk: presigned media URLs (~24h) expire while the studio sits open, breaking thumbnails/canvas.
  Mitigation: URLs are never persisted; rendering goes through `BackendImage`/refetchable queries; a 403-on-image triggers a presentation refetch (Phase 4 detail).
- Risk: hybrid save loses local composition edits (tab close with dirty slides).
  Mitigation: dirty-slide tracking + `beforeunload` guard + autosave debounce (Phase 5); Save draft button reflects dirty state.
- Risk: multiple-media timeline (decision #8) inflates Phase 5 beyond one implementable plan.
  Mitigation: media tracks reuse the exact bar/track/drag components built for text tracks (shared track primitives are a Phase 5 requirement, not an option); if Phase 5 still overruns, background+static-overlay ships first and timed media bars split into a 5b correction plan — a fallback the user pre-approved implicitly by ranking (recommended option kept).
- Risk: phone apps double-show a presentation (auto-show + realtime refresh racing).
  Mitigation: orchestration provider (Phase 8) is the single owner of "currently presenting" state; realtime events only invalidate the active query, never open surfaces directly.

## Validation plan

Per-phase (each child plan carries concrete commands); master-level gates:
- `npm run typecheck` — extended in Phase 2 to include the new app and in Phases 1/4/8 to include the three new packages; zero errors at every phase close.
- `npm run test:presentation-runtime` / `test:presentation-builder` / `test:presentations` — registered as root scripts when each package gains tests; green at every phase close.
- Playwright: studio flows on `--project=desktop` (Phases 3–7); phone player on `--project=mobile` first, then desktop (Phase 9), per `34_runtime_validation_local.md`.
- Round-trip fixture test (Phase 5): a composition built in the editor store → mapped to the API body → mapped back → deep-equals the store state (guards mapping-table criterion 3).

## Review log

- `2026-07-22` Claude: Master plan drafted from backend docs (`01`–`09`) + design README/screenshots; 11 decisions resolved with user (see table); 3 verification items opened (V1 auth scope, V2 publish validation vs text-only slides, V3 socket event contract); 9 child plans created alongside.
- `2026-07-22` User + Claude: **Division of labor adopted** (see new section) — Claude builds each UI phase's presentational component kit first (props-first, mock data, design-token-faithful); Codex sessions own logic/assembly and treat kit components as read-only. Prompts 3/4/5/6/8/9 updated accordingly.
- `2026-07-22` Backend team (via user): **V1, V2, V3 all resolved** — see "Open verification items — ALL RESOLVED". Studio sign-in is `appScope="manager"`; role alone gates authoring; consumer `app_key` always from JWT claims, never hardcoded. Text-element-only slides publish fine; title-mirror mitigation dropped (do not write `slide.title` from composition text). Socket contract: `app_update_presentation:published` / `:archived`, room `workspace:{workspace_id}`, payload `{client_id, logical_client_id, version}`, change-signal only. Backend docs `02_conventions.md` + `04_admin_presentations.md` updated accordingly. Phases 2, 6, 9 plans + prompts updated to match.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` (after user review of this master + child set)
- Transition owner: `Claude`
