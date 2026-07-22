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
- `2026-07-22` Claude (Opus session, visual lane): Studio `SignInPage.tsx` restyled to mirror the managers-app sign-in layout (centered card, managers-app heading typography), keeping studio-specific copy and the deep-link redirect. User-endorsed. Typecheck exit 0; Playwright auth 4/4 still green. This is the Phase 2 "optional styling pass" from the orchestration map, executed post-review.
- `2026-07-22` Claude (builder), post-Phase-5 user report: **draft sequence_order schema fix** — live backend returned `sequence_order: 0` on a draft slide's media (slide-level and element-embedded), rejected by our `.positive()` constraints. Per backend `04` publish validation, sequences are only normalized to `1..N` **at publish**; drafts are legitimately 0-based. Relaxed `SlideMediaSchema` (runtime) and `SlideSchema` (builder) to `.nonnegative()`; added a regression fixture from the live payload (media seq 0 at both paths). This closes the residual risk behind the Phase 1 review's embedded-media advisory. Tests 55/55 builder + 18/18 runtime; tsc clean.
- `2026-07-22` Claude (builder), post-Phase-5 user report: **editor height-chain layout fix** (visual lane) — the timeline dock rendered below the viewport because `EditorShell` claimed `h-screen` while sitting under the studio's 4rem header. Fixed the chain: `AppShell` is now a bounded flex column (`h-screen`, header `shrink-0`, main `min-h-0 flex-1`), `EditorShell` fills its container (`h-full`), `DashboardView` drops its hardcoded `min-h-[calc(100vh-4rem)]` for `h-full`. While regression-running Playwright, found and repaired a **stale Phase 3 spec assertion** (test lane, small, justified: the dashboard spec's create-flow still asserted the removed `editor-placeholder` and its route glob fed the real editor's detail GET a list-shaped payload; now a dedicated `aup_created` detail branch + `presentation-editor-shell` assertion). Validation: typecheck exit 0; 54/54 builder tests; all 3 studio Playwright flows green.
- `2026-07-22` Claude (builder), post-Phase-5 review: record correction — the reviewer's "housekeeping still open" items were stale: `PLAN_presentation_phase4_corrections` was already archived after the Phase 4 pass, and the baselines are committed (`66f6d2c7` Phases 1–4, `7761b909` Phase 5 kit); the `ApiEnvelopeSchema` fold was already routed to the Phase 7 prompt. The one live advisory — mapping logic duplicated inline in `EditorView.tsx`/panels instead of importing `composition-mapping.ts` converters — is routed to the Phase 6 session prompt as a carried consolidation item (Phase 6 edits `EditorView` anyway).
- `2026-07-22` Claude (builder): Phase 2 review advisory resolved — removed the `.gitignore` negation for the studio's `.env.development` (file stays local-only per repo convention; `.env.example` carries the defaults). Second Phase 2 note (bespoke Sonner notification host in the studio shell) routed to the Phase 7 prompt as a public-API-audit consideration. Phase 3 approved; next step is the Phase 3 dashboard kit session (Claude-builder).
- `2026-07-22` User + Claude: **Division of labor adopted** (see new section) — Claude builds each UI phase's presentational component kit first (props-first, mock data, design-token-faithful); Codex sessions own logic/assembly and treat kit components as read-only. Prompts 3/4/5/6/8/9 updated accordingly.
- `2026-07-22` Backend team (via user): **V1, V2, V3 all resolved** — see "Open verification items — ALL RESOLVED". Studio sign-in is `appScope="manager"`; role alone gates authoring; consumer `app_key` always from JWT claims, never hardcoded. Text-element-only slides publish fine; title-mirror mitigation dropped (do not write `slide.title` from composition text). Socket contract: `app_update_presentation:published` / `:archived`, room `workspace:{workspace_id}`, payload `{client_id, logical_client_id, version}`, change-signal only. Backend docs `02_conventions.md` + `04_admin_presentations.md` updated accordingly. Phases 2, 6, 9 plans + prompts updated to match.
- `2026-07-22` Codex: **Phase 1 implemented and archived** — created the complete `@beyo/presentation-builder` logic foundation (schemas/types, all admin API/query/action hooks, keys, upload orchestration, cache policy, permissions, tests). Validation: `npm run typecheck` passed with zero errors; `npm run test:presentation-builder` passed 5 files / 16 tests. Deviations: none.
- `2026-07-22` Claude (Phase 1 review): **PASS-WITH-NOTES.** Re-ran validation independently: `tsc -p packages/presentation-builder/tsconfig.json --noEmit` exit 0; `npm run test:presentation-builder` 5 files / 16 tests green. All 6 phase acceptance criteria met with evidence. Verified: every wrapped route matches backend `04`–`09` (method/path/body/enums) with no invented fields; no consumer endpoints, `GET /history`, `surface-ids`, or UI files (only non-test `.tsx` is `test/test-utils.tsx`); upload orchestration is 3 functions + `useUploadSlideMedia` (progress/cancel), with a passing test proving an S3-step failure never reaches the confirm endpoint; cache discipline is write-through to `detail(id)` with list invalidation gated to list-visible changes (create/metadata/publish/archive/new-version/add-slide/delete-slide/replace-audience → true; slide-content/reorder/media/composition → false); envelope reuses the standard `apiClient` (schema-as-arg pattern, no bespoke parsing). Lifecycle bookkeeping correct (plan in `archives/implementation/`, summary + archive record present, master untouched except this log). Two **low-severity advisory notes** (non-blocking, no corrections plan): (1) **Codex (logic)** — `types.ts` re-implements `ApiEnvelopeSchema` locally instead of importing the existing `@beyo/lib` `ApiEnvelopeSchema` (the local one is stricter, `ok: z.literal(true)`, but duplicates a shared helper that `packages/shopify` reuses via `.extend`); prefer reusing `@beyo/lib` in a future touch. (2) **Codex (logic)** — the single `SlideMediaSchema` requires `sequence_order` and `mime_type` and is reused for element-embedded `media`; backend doc `05` (authoritative media shape) includes both, but doc `09`'s element example omits them and no fixture round-trips a media element with embedded media — confirm the embedded serialization or add such a fixture before Phase 4 wires real data.
- `2026-07-22` Codex: **Phase 2 implemented and archived** — bootstrapped the desktop-only `presentation-studio` thin shell with `appScope="manager"`, guarded lazy routes, query/notification/surface providers, Tailwind package sources, and empty dashboard/editor placeholders. Validation: root `npm run typecheck` passed with zero errors; studio lint/build passed; `npx playwright test --grep presentation-studio-auth --project=desktop` passed 4/4. Dual-role smoke PASS for manager and admin sign-in/refresh/sign-out with `app_scope="manager"`; worker rejection and `/editor/:id` guard round-trip also passed. Browser API interception was used because live role credentials were unavailable, so the result validates frontend wiring rather than backend policy.
- `2026-07-22` Claude (Phase 2 drift correction, user-approved): resolved the Phase 2 review's env-hygiene note. Removed the bespoke `.gitignore` exception that force-committed the studio `.env.development`; the Environment-files section now matches the repo-wide convention (`.env`/`.env.*` ignored, only `.env.example`/`.env.test.example` committed). `.env.development` was never in the git index, so no `git rm --cached` was required; it is now ignored by the `.env.*` rule while the developer's local copy stays on disk. Confirmed `.env.example` documents every non-secret var the app reads: `VITE_API_BASE_URL` (required, Zod-validated) and `API_TARGET_URL` (optional dev proxy); `VITE_API_URL` is a derived vite `define` and `import.meta.env.DEV` is a Vite built-in, neither needing an entry. No implementation code changed.
- `2026-07-22` Claude (Phase 2 review): **PASS-WITH-NOTES.** Re-ran validation independently: `npm run typecheck --workspace managerbeyo-app-presentation-studio` exit 0; `npx playwright test --grep presentation-studio-auth --project=desktop` 4/4 passed. All 5 phase acceptance criteria met with evidence. Verified: thin shell holds — no `@beyo/presentation-builder`/`presentation-runtime`/domain imports in app TS (builder is a dep only for Tailwind `@source` + future use); `DashboardPage`/`EditorPage` are empty placeholders. `appScope="manager"` in both `RootRoute` (`AuthProvider`) and `SignInPage` (`SignInForm`); no `"admin"` scope, no hardcoded `app_key`. `index.css` `@source` covers `@beyo/ui`, `@beyo/auth`, `@beyo/presentation-builder` (runtime deferred to Phase 4 per plan). Both routes lazy-load; unauth `/editor/:id` deep-link round-trips through sign-in via `state.from` → `SignInPage.handleSuccess`; worker 403 surfaced as visible error. No PWA/service worker; root `typecheck` + `workspaces` include the new workspace; build artifacts (`dist`/`node_modules`/`test-results`) correctly gitignored. Master untouched except review-log entries. One **low-severity advisory note** (non-blocking, no corrections plan): **Codex (logic)** — the session added a bespoke `.gitignore` exception (`!.../presentation-studio/.../.env.development`) to force-commit `.env.development`, deviating from the repo-wide convention where `.env.*` is ignored except `.env.example` (no other app commits env files). Content is non-secret localhost defaults, but prefer dropping the committed `.env.development` + its ignore exception and relying on `.env.example` for consistency. Also acknowledged: the app owns a thin Sonner `NotificationHostProvider` because the canonical `20_notifications.md` `NotificationProvider`/`NotificationRenderer` aren't exported by shared packages — disclosed in the summary, host-shell concern only, not a thin-shell violation.
- `2026-07-22` Codex (Phase 3 review): **DEFECTS FOUND.** The user-approved Claude-builder dashboard kit is present and its prop-only files show no visual-lane defect, but the Codex implementation is absent: the studio `/` route still renders the Phase 2 placeholder; no `DashboardView`, controller, pure status/grouping/meta helpers, API-backed filter/search/create assembly, Phase 3 tests, implementation summary, or archive transition exists. Independent validation: root `npm run typecheck` passed; `npm run test:presentation-builder` passed the existing 5 files / 16 Phase 1 tests but had no dashboard suites; the phase Playwright command failed from root because no project config was selected, and rerunning with the studio config failed with `No tests found`. Created `PLAN_presentation_phase3_corrections_20260722.md`; all findings are **Codex (logic)**, with no Claude-builder visual correction requested.
- `2026-07-22` Claude (Phase 3 re-review — run in the builder session as a one-time substitute for the Opus reviewer, who was occupied; noted for the record since the kit author reviewed its own phase's integration, though the kit itself was already Opus-reviewed defect-free): **PASS-WITH-NOTES.** Re-ran validation independently: builder `tsc --noEmit` + studio `typecheck` exit 0; `npm run test:presentation-builder` 8 files / 29 tests green; desktop `presentation-dashboard` Playwright 1/1 green (spec has console/pageerror guards). Verified all 10 corrections-plan criteria with evidence: pure tested helpers (scheduled boundary, highest-version grouping, meta lines); controller owns filters/debounced `q`/grouping/refinement/create; F2b schema matches the re-synced doc exactly (`slide_count` nonneg int, `media_kinds` enum array, `cover_url` url nullable); kit byte-identical (prop contracts + line counts verified); no router/app imports in the package; no context menu or lifecycle actions; thin `DashboardPage` adapter; no `GET /{id}` on the dashboard; lifecycle bookkeeping complete (summary, original plan archived, master entry). Corrections plan archived on this pass. Two **low-severity advisory notes** (non-blocking): (1) **Codex (logic)** — the list query uses `limit: 200` and ignores `has_more`; >200 announcements silently truncate. Fine at current scale; add load-more or an overflow signal in Phase 7 polish (no-silent-caps principle). (2) **Codex (logic)** — `DashboardPage` hardcodes `workspaceName="ManagerBeyo"`; source it from the auth/workspace claim when a display name is available (small app-side touch-up, Phase 7).
- `2026-07-22` Codex: **Phase 3 implemented via the approved corrections plan; original phase plan archived.** Added the complete dashboard logic/assembly: admin-list preview DTO fields (`slide_count`, `media_kinds`, `cover_url`), pure status/grouping/meta helpers, controller/context/view, exact filter + 300 ms search query composition, latest-version cards, list-only previews (no dashboard detail fetch), loading/empty/error/retry states, and default-title create → injected editor navigation with one failure notification. The studio route is a thin adapter; no router/app imports entered the builder; no context menu or lifecycle action was added; the approved Claude-builder kit remained byte-identical. Validation: root `npm run typecheck` PASS; `npm run test:presentation-builder` PASS (8 files / 29 tests); desktop `presentation-dashboard` Playwright PASS (1/1); kit diff empty/checksum unchanged. Summary and archive record written. `PLAN_presentation_phase3_corrections_20260722.md` remains `approved` in place for independent re-review; master remains under construction.
- `2026-07-22` Codex (Phase 4 review): **DEFECTS FOUND.** The Claude-builder editor kit is present, prop-driven, and no visual-lane correction is requested, but the Codex Phase 4 implementation is absent: no `@beyo/presentation-runtime`, schema move/re-exports, static renderer, editor store/controller/view, production slide/media/title/read-only orchestration, Phase 4 tests, implementation summary, or archive transition; the studio editor route still renders its Phase 2 placeholder. Independent validation: root `npm run typecheck` passed; `npm run test:presentation-builder` passed the existing 8 files / 29 Phase 1–3 tests; `npm run test:presentation-runtime` failed because the script/package is missing; the exact root Playwright command failed because no desktop project was resolved, and the explicit studio-config rerun failed with `No tests found`. No Phase 5 timeline/text/playback scope or `GET /history` wrapper was found. Created `PLAN_presentation_phase4_corrections_20260722.md`; all findings are **Codex (logic)**.
- `2026-07-22` Codex (Phase 4b): **IMPLEMENTED THROUGH APPROVED CORRECTIONS PLAN.** Original Phase 4 plan archived after green validation; editor shell, eager slides/media, local draft store, runtime-rendered thumbnails/canvas, title debounce, read-only gating, embedded-media fixture, and desktop editor-shell flow are complete. Root typecheck, runtime 9/9, builder 38/38, explicit studio-config Playwright 1/1, `/history` scan, and untouched editor-kit diff all pass. `PLAN_presentation_phase4_corrections_20260722.md` remains `approved` for independent re-review; the master remains under construction.
- `2026-07-22` Claude (Phase 4 independent re-review): **PASS-WITH-NOTES.** Re-ran all validation myself: runtime + builder + studio typecheck exit 0; `test:presentation-runtime` 9/9; `test:presentation-builder` 38/38 (10 files); studio-config `presentation-editor-shell` Playwright 1/1; runtime forbidden-import scan clean; `/history` scan clean. All 12 corrections criteria (F1–F3) met with evidence. Verified: **runtime purity** — `@beyo/presentation-runtime` peers only react/zod, owns the composition schemas single-definition, builder imports+re-exports them (no duplication); **renderer** — static, `[start,end)` visibility, deterministic `layer_index/sequence_order/start_ms/client_id` ordering (nulls last, stable), font scaling `font_size*containerWidth/390`, tests reproduce the three `09` recipes + scale at 58×104 / 264×470 / 780×900; **editor** — draft store hydrates null-client legacy elements, atomic reconcile resets dirty; controller does eager add(appends+selects)/last-slide-delete-block/neighbor-select/full-list-reorder, debounced changed-only draft-title PATCH re-checking draft status, upload via the Phase-1 action (exact caps, S3-fail-never-confirms) with background-replace preserving overlays + legacy-synthesized handling, and read-only gating asserted (spec confirms zero mutating requests + banner + no console/page errors); **assembly** — `EditorView` composes the kit via props only and renders both rail thumbs and the 264×470 canvas through the runtime renderer; `EditorPage` is a thin route adapter; controller imports no components. My carried Phase-1 embedded-media concern is now **resolved** by a round-trip fixture exercising `sequence_order`+`mime_type`. Master body untouched (review-log additions only), still `under_construction`. Three **low-severity notes** (non-blocking — no new corrections plan): (1) **Codex (logic)** — rail thumbnails aren't memoized (`renderSlide` runs inline per render in `EditorView`); harmless now but the plan's own `18_performance.md` mitigation (memoize keyed on composition revision) should land before Phase 5's per-keystroke editing to avoid full-rail re-renders. (2) **Codex (logic)** — the debounced title-PATCH timer is cleared only on unmount, not on `presentationId` change; a pending edit could write the previous presentation if the editor switches presentations within the 450ms window and the next hydrates as draft — practically unreachable in Phase 4 (no editor→editor navigation) but a latent cross-presentation write; clear `titleTimerRef` in the presentationId reset effect. (3) **Process/traceability** — the entire presentation capability (Phases 1–4) is uncommitted working-tree, so the division-of-labor "no kit restyle" rule can't be diff-verified (the summary's empty `git diff -- .../editor` is vacuous for untracked files); the kit is structurally presentational/prop-driven, but recommend committing the kit baseline so later phase reviews can actually diff it. Also still open from Phase 1 (out of Phase 4 scope): builder `types.ts` re-declares `ApiEnvelopeSchema` instead of reusing `@beyo/lib`. Recommend transitioning `PLAN_presentation_phase4_corrections_20260722.md` to `archived` now that its re-review passed.
- `2026-07-22` Codex: **Phase 5 implemented and archived.** Added the rAF playback clock with 100ms dt clamp, all eight animation recipes/easings, time-driven runtime rendering, pure tested timeline geometry, authoritative bidirectional composition mapping with injected text measurement and a passing deep-equality editor→PUT→server→hydrate fixture, per-slide composition editing/persistence (Save, switch, ~2s autosave, unload guard, failure retention/single notification/retry), CTA PATCH validation, shared text/media timeline assembly, draggable canvas selection, duration shrink clamping, and both carried Phase 4 advisories. Validation: root typecheck passed; runtime 18/18; builder 54/54; desktop `presentation-editor-timeline` Playwright 1/1; existing editor-shell regression 1/1; component-kit diff empty.
- `2026-07-22` Claude (Phase 5 independent review): **PASS-WITH-NOTES.** Re-ran all validation myself: runtime + builder + studio typecheck exit 0; `test:presentation-runtime` 18/18 (4 files); `test:presentation-builder` 54/54 (13 files, incl. the autosave/`beforeunload` and title-timer-cleanup tests); desktop `presentation-editor-timeline` 1/1 and `presentation-editor-shell` regression 1/1; runtime forbidden-import + `/history` scans clean. All 8 phase criteria met with evidence. Verified: **clock** — pure `advancePlaybackTime` with 100ms dt clamp, loop-one-slide, seek/pause; **animation registry** — 8 types, design `pIn/pOut` formula (`(t-appear)/450`, `(disappear-t)/450`), opacity `min(pIn,pOut)`, slide↔`fade_up` ±20px; **mapping** (`composition-mapping.ts`) matches the master table exactly (slide→`fade_up` both dirs/450ms, `font_size×390/264`, center-anchor, measured normalized bbox) with a passing editor→PUT→server→hydrate **deep-equality** round-trip; **geometry** (`timeline-geometry.ts`) is pure/React-free, enforces the 0.4s min-window + `[0,duration]` clamps, and `TimelineBar` carries no time arithmetic (px-deltas only → criterion 8); **shared track/bar** — text and timed media both render through one `TimelineTrack`/`TimelineBar`; **flush discipline** — Save/slide-switch/~2s-autosave/`beforeunload`, guarded to draft-only, failure keeps local state + single toast + retry, `reconcileAfterFlush` preserves other dirty slides' local durations; **playback perf** — the clock lives in the child `TimelineCanvasWorkspace` (not `EditorView`), so rAF ticks re-render only canvas+timeline; the store is written only on checkpoints (`setPlayback` on toggle/scrub), rail thumbnails are `memo`'d + `useMemo`'d, panels don't tick; **behaviors** — duration-shrink clamps element windows (store `setSlideDuration`), `+Text` defaults `fade_up`-in/`fade`-out ~2.5s at playhead, no undo/redo, CTA `/`-route validation mirrored. Both Phase 4 advisories confirmed fixed (memoized `RailThumbnail`; `titleTimerRef` cleared on `presentationId` change, with a passing test). Master body untouched (review-log additions only), still `under_construction`. Two **low-severity notes** (non-blocking — no corrections plan): (1) **Codex (logic)** — design↔backend mapping is duplicated into the view: `EditorView` re-implements `wireAnimation`/`editorAnimation` (slide↔`fade_up`) and the font-size `×390/264` ↔ `×264/390` conversions inline in `propertiesPanel` instead of importing the converters already in `composition-mapping.ts`. Values are identical so there's no behavioral bug, but it violates the master "the design↔backend mapping lives only in the designated mapping module" rule and criterion 8's spirit; consolidate onto the mapping module. (2) **Process/traceability (carried from Phase 4)** — the capability is still uncommitted working-tree, so the division-of-labor "no kit restyle" rule remains un-diff-verifiable (`git diff -- .../components` is vacuous for untracked files); structurally the kit is presentational/prop-driven, but committing the kit baseline would let future reviews actually diff it. Also still open (housekeeping, out of Phase 5 scope): builder `types.ts` re-declares `ApiEnvelopeSchema` instead of reusing `@beyo/lib` (Phase 1 note), and `PLAN_presentation_phase4_corrections_20260722.md` should be archived now its re-review passed.
- `2026-07-22` Codex: **Phase 6 implemented and archived.** Consolidated all editor animation/font-size conversion onto `composition-mapping.ts`; added flushed full-deck preview playback with runtime rendering and dev parity assertion; builder-owned compact users query; complete audience/settings/schedule publish dialog; explicit priority PATCH; visible per-cause 409/422 handling; publish/archive/new-version orchestration; Scheduled/read-only completion; dashboard/editor archive entry points; and the full desktop lifecycle spec. Backend verification confirms archived sources may create a new version. Validation: root typecheck PASS; runtime 18/18; builder 75/75; `presentation-publish` 1/1; existing dashboard/editor flows 3/3; `slide.title` mirror scan clean. The only kit change was the phase-plan-recorded additive optional archive API/affordance; the master remains under construction.
- `2026-07-22` Claude (Phase 6 independent review): **PASS-WITH-NOTES.** Re-ran all validation myself: runtime + builder + studio typecheck exit 0; `test:presentation-runtime` 18/18; `test:presentation-builder` 75/75 (15 files); desktop `presentation-publish` 1/1 plus `presentation-dashboard`/`editor-shell`/`editor-timeline` regressions 3/3; runtime forbidden-import + `/history` scans clean. All 7 phase criteria met with evidence. Verified: **V2** — `slide.title`-mirror scan across all builder src is empty (dropped mitigation does not exist); **preview** — `usePresentationPreviewPlayback` advances per-slide via the shared runtime `advancePlaybackTime`, total-progress = elapsed/total, stops on the final frame; `openPreview` flushes dirty slides first and the `GET /{id}/preview` parity assertion is `import.meta.env.DEV`-guarded (stripped from prod); overlay renders through the runtime `SlideCompositionRenderer` (300×533); **publish dialog** (`publish-form.ts` + `PublishDialog.tsx`) — both audience modes, app/role/user targets (roles only sent in `all_matching`, per doc 06), **no workspace field**, `selected_users_only` blocked at 0 users client-side; category-derived priority shown live with explicit override, and the publish-time PATCH **always sends explicit `display_priority`** (avoids the create-vs-PATCH derivation asymmetry); **error UX** — `mapPublishFailure` routes 422 causes (no-slides, empty-slide, media, schedule, selected-users, unknown-keys) to specific fields/summary and 409 → friendly refetch (`refetchLatest`), never a bare generic toast; **lifecycle** — controller `publish` runs flush→audience→metadata→publish reconciling each step, `archive` works from draft+published, `editAsNewVersion` returns the new id and the studio `EditorPage` navigates to it via `onPresentationIdChange`; **read-only** — single `readOnly = status !== "draft"` gates every mutation callback and the whole Phase 4–5 surface. The Phase 5 advisory is **resolved**: `EditorView` now imports `editorAnimationToWire`/`wireAnimationToEditor` from `composition-mapping.ts` (no inline mapping). Division of labor: the only kit change is the pre-recorded additive optional archive props on `EditorTopBar`/`AnnouncementCard` (conditional render, DOM unchanged when omitted). Master body untouched (review-log additions only), still `under_construction`; new-version-from-archived verification recorded. One low-severity **note** (non-blocking): 422 cause mapping is keyword-regex over the backend's flat error string — inherently coupled to backend wording, though the fallback still surfaces the raw cause so criterion 4 holds; if the backend ever exposes structured causes, switch to those. Carried process items (unchanged): the capability is still uncommitted working-tree so the kit "no restyle" rule remains un-diff-verifiable (verified structurally instead); and housekeeping — the Phase-1 `ApiEnvelopeSchema` duplication and archival of `PLAN_presentation_phase4_corrections_20260722.md` remain open.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` (after user review of this master + child set)
- Transition owner: `Claude`
