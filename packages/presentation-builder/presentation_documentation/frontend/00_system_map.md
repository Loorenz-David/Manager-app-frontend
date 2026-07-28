# 00 — System Map

What the presentation capability *is*, how its parts relate, and how one announcement
flows from a manager's mouse to a worker's phone. Read this once; after that the zone
docs are enough.

## What it does

Managers author timed, animated, phone-shaped announcements ("presentations") in a
desktop **studio** with a video-editor timeline. Publishing targets an audience
(app / role / specific users). Each phone app asks the backend for *its* single most
relevant unseen announcement and auto-shows it on the home route; viewing is recorded
so it never reappears. Realtime sockets make a publish pop open on already-running
apps without a reload.

The backend (`/api/v1/app-update-presentations`, contracts in [`../backend/`](../backend/))
owns **all** eligibility logic: audience matching, view-state filtering, priority
selection, scheduling windows. The frontend never re-implements any of it.

## Layer diagram

```
                    ┌────────────────────────────────────────────┐
                    │        @beyo/presentation-runtime          │
                    │  schemas.ts · SlideCompositionRenderer     │
                    │  usePlaybackClock · animation-registry     │
                    │  composition-video (video + trim seam)     │
                    │  (pure: no network, no auth, no app state) │
                    └───────────▲────────────────▲───────────────┘
                                │                │
              ┌─────────────────┴──┐          ┌──┴──────────────────┐
              │ @beyo/presentation-│          │ @beyo/presentations │
              │ builder (studio:   │          │ (phone player:      │
              │ admin API, editor  │          │ /active, provider,  │
              │ logic, UI kits)    │          │ surfaces, realtime) │
              └─────────▲──────────┘          └──────────▲──────────┘
                        │                                │
          ┌─────────────┴────────────┐    ┌──────────────┴───────────────┐
          │ apps/presentation-studio │    │ managers / sellers / workers │
          │ (thin shell: routes,     │    │ apps — 4 glue files each     │
          │  auth, env)              │    │ (mount, glue, surfaces,      │
          └──────────────────────────┘    │  socket-registry)            │
                                          └──────────────────────────────┘
```

Arrows are the **only** allowed import directions. `builder` and `presentations`
never import each other — the runtime package is their meeting point, which is what
makes editor preview and phone playback pixel-identical (same renderer, same schemas,
`REFERENCE_CANVAS_WIDTH = 390`).

## Lifecycle of one announcement

1. **Create** — studio dashboard "New" → `POST /app-update-presentations` → draft →
   editor route. Empty drafts auto-create their first slide
   (editor controller effect).
2. **Author** — editor edits are hybrid-saved: local draft store immediately,
   debounced autosave to the backend (title 450 ms, composition 2 s). Composition is
   translated editor↔server by `composition-mapping.ts` (px ↔ 0..1 fractions,
   editor animation choices ↔ backend `fade`/`fade_up`, s ↔ ms).
3. **Publish** — PublishDialog collects audience + settings; `publish-form.ts` builds
   the metadata/audience/publish payloads; backend normalizes slide `sequence_order`
   to 1..N and validates. Published presentations are **read-only** in the editor;
   "Edit" creates a new version (`logical_client_id` retained, `version` bumped).
4. **Deliver** — each phone app boots with `ActivePresentationProvider` (its
   `appKey`); `GET /active` returns at most one presentation (or null). Socket event
   `app_update_presentation:published` → invalidate query → refetch → the provider
   auto-opens the matching surface *if* the app is on its home route (`canAutoShow`).
5. **View-state loop** — `shown` on open, `progressed` per furthest slide,
   `dismissed`/`completed` terminally (non-dismissible decks can only `complete` via
   the acknowledge footer). Recorded state is why it never reappears.
6. **Archive** — studio action or `:archived` socket event; the player closes/ignores.

## Where things live (top level)

| Concern | Location |
|---|---|
| Payload contracts (truth) | `packages/presentation-builder/presentation_documentation/backend/` |
| Visual design (2 screens) | `packages/presentation-builder/presentation_documentation/design/` |
| Shared schemas + renderer | `packages/presentation-runtime/src/` |
| Studio data layer (API + mutations) | `packages/presentation-builder/src/{api,actions}/` |
| Editor state + math | `packages/presentation-builder/src/{controllers,editor,lib,preview}/` |
| Studio visual components (kits) | `packages/presentation-builder/src/components/` |
| Studio screen assembly | `packages/presentation-builder/src/views/` + `src/publish/PublishDialog.tsx` |
| Studio shell | `apps/presentation-studio/ManagerBeyo-app-presentation-studio/src/` |
| Player package | `packages/presentations/src/` |
| Phone-app glue (×3 apps) | `apps/<app>/…/src/app/{PresentationMount,presentation-glue,presentation-surfaces,socket-registry}.{ts,tsx}` |
| Kit showcases (visual reference) | studio dev routes `/kit/{dashboard,editor,timeline,publish,player}` |

## The two studio screens

- **Dashboard** — announcement card grid (cover thumb, status pill, media stripe),
  filters, "New" card. Data: list endpoint (backend enriches with `slide_count`,
  `media_kinds`, `cover_url` specifically for these cards).
- **Editor** — left slide rail · center phone-shaped canvas (264×470 editor px,
  representing the 390-wide reference phone canvas) · right properties panel
  (slide / text / media) · bottom timeline dock (ruler, tracks, draggable/resizable
  bars, transport controls) · preview overlay (plays through the *runtime* renderer)
  · publish dialog.

## Sellability / transplant note

The capability was deliberately built package-contained. To transplant: take the three
packages + the studio app; a host phone app needs only the four-file glue recipe
(doc 41) and the backend endpoints. The only workspace dependencies are the shared
platform packages (`@beyo/api`, `@beyo/ui`, `@beyo/lib`, auth/socket infra) —
enumerated per zone doc.
