# PLAN_backend_image_stable_rendering_20260718

## Metadata

- Plan ID: `PLAN_backend_image_stable_rendering_20260718`
- Status: `under_construction`
- Owner agent: `claude-opus-4-8`
- Created at (UTC): `2026-07-18T00:00:00Z`
- Last updated at (UTC): `2026-07-18T00:00:00Z`
- Related issue/ticket: image flicker on query refetch (long-standing, app-wide)
- Intention plan: captured inline in the request (no separate intention doc)
- Inventory / diagnosis: `docs/debugging/DEBUG_20260718_backend_image_rendering_inventory.md`
- Backend handoff: `docs/handoff/to_backend/HANDOFF_TO_BACKEND_presigned_image_url_caching_20260718.md`

## Root cause (verified against live source)

Backend image URLs are **freshly presigned on every request**:

- `backend/app/beyo_manager/domain/images/serializers.py:19` — `_resolve_image_url` calls
  `generate_presigned_get_url(key, 86400)` inside `serialize_image` / `serialize_image_light`,
  which feed every list/detail response embedding images (tasks, steps, cases, upholstery…).
- A presigned S3 v4 URL embeds `X-Amz-Date` + `X-Amz-Signature` derived from the signing moment,
  so **every refetch returns a different URL string for the same unchanged image**.

Consequences:

1. TanStack structural sharing sees a changed string → new object references → cards re-render
   with a new `src`.
2. The browser's HTTP cache is keyed on the full URL → the "new" URL is a cache miss → the image
   bytes are **re-downloaded from S3** → blank tile while loading → **the flicker**.
3. Bonus waste: repeated S3 egress, slower lists, and defeated `React.memo`/sharing for the whole
   list object.

This is **not** primarily a React/optimistic-update bug. Fix = make the rendered `src` stable.

## Goal and intent

- Goal: eliminate image flicker on query refetch app-wide by introducing **one centralized
  backend-image primitive** whose rendered `src` is stable across presigned-URL churn, then
  migrating every backend-URL `<img>` site (per the inventory doc) onto it.
- Business/user intent: the app currently "looks cheap" — every background refetch flashes all
  visible images. After this plan, images render once and stay put.
- Non-goals:
  - No backend code changes in this plan (requested separately via the backend handoff; frontend
    solution must stand alone).
  - No redesign of the images upload/annotation pipeline.
  - No consolidation of app-local duplicate components (`CaseTaskInfoCard`, managers-app
    `BoxPickerOption`/`ImagePlaceholder`…) beyond migrating their `<img>` usage — full
    deduplication stays with the existing package-migration plans.

## Scope

- In scope:
  - New primitive `packages/ui/src/components/primitives/backend-image/`:
    - `stable-image-url.ts` — module-level stable-URL cache + `toStableImageUrl` + LRU cap.
    - `use-stable-image-url.ts` — hook wrapper.
    - `BackendImage.tsx` — the centralized `<img>` component (stable src, swap-on-decode,
      `onError` → `ImagePlaceholder` fallback).
    - Vitest specs for cache + component.
  - Migrate `Avatar` and `UserPill` internals onto `useStableImageUrl` (they keep their own
    initials/placeholder fallback logic).
  - Migrate all backend-URL `<img>` sites listed in
    `DEBUG_20260718_backend_image_rendering_inventory.md` §3 (packages **and** the three apps)
    onto `BackendImage`.
  - Programmatic loaders in `@beyo/images` (`ZoomableImage`, `ImageEditorPage` stage,
    `ImageAnnotationCanvas`, `preload.ts` / `fetch-image.ts` preloading) route their URL through
    `toStableImageUrl` before load.
  - Public exports from `@beyo/ui`: `BackendImage`, `useStableImageUrl`, `toStableImageUrl`.
- Out of scope:
  - Backend presigned-URL caching (handoff doc; independent).
  - TanStack config changes (`structuralSharing`, `select`) — unnecessary once src is stabilized,
    and object-identity churn is properly fixed server-side (Layer 2).
  - Static-asset `<img>` sites (inventory §4).
- Assumptions:
  - `@beyo/ui` is dependency-safe as the home: every image-rendering package (including
    `@beyo/images`) already peer-depends on `@beyo/ui` (verified in `packages/*/package.json`).
  - Dev-mode URLs (local storage server path) and Shopify CDN URLs carry no `X-Amz-Signature`
    and are stable — the cache passes them through untouched.
  - Presigned TTL is 24 h (`_IMAGE_URL_TTL = 86400`), so holding a first-seen URL for most of its
    validity is safe.

## Clarifications required

- [ ] **Refresh margin value** — proposal: keep a cached URL until < 30 min of validity remain,
  then adopt the newest URL seen. Blocks nothing structurally, but the constant should be agreed
  (too small risks a 403 on a stale URL for a long-idle tab; too large churns more often).
- [ ] **Expired-cache 403 recovery** — if a tab sleeps > 24 h, a cached URL can expire with no
  fresh refetch yet. Proposal: on `<img>` error for a presigned URL, `BackendImage` drops the
  cache entry and falls back to the latest raw prop `src` before showing the placeholder.
  Confirm this two-step retry is wanted in v1 (recommended) or deferred.
- [ ] **App-local duplicated components** — migrate their `<img>` in place now (recommended;
  they'll carry the fix into any later package consolidation), or leave app-local copies
  untouched and fix only package versions?

## Acceptance criteria

1. Triggering a refetch of any image-bearing list (pull-to-refresh, invalidation after a
   mutation, window refocus) causes **zero** image network requests and **zero** visible image
   flicker for unchanged images — verified in DevTools Network + visually on task steps, cases,
   and upholstery lists.
2. `BackendImage` renders `ImagePlaceholder` when `src` is null/undefined **and** when the image
   fails to load (after the expiry-retry, if confirmed) — closing the inventory's EH/PH gaps.
3. A genuinely *new* image URL (different pathname) swaps without a blank frame: the old image
   stays rendered until the new one is decoded (`swap-on-decode`).
4. All sites in inventory §3 render through `BackendImage` (or `toStableImageUrl` for
   programmatic/canvas loaders); `grep` for raw `<img` over the §3 files returns only
   `BackendImage` internals.
5. Cache correctness (vitest): same pathname + different signature → first URL returned; near
   expiry → new URL adopted; non-presigned URL → passthrough, uncached; malformed URL →
   passthrough; cap eviction works.
6. `npm run typecheck` clean; `npm run test:ui` green (including new specs); existing package
   test suites untouched/green.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer boundaries — a UI primitive must stay context-free
  (props only), which `BackendImage` is.
- `architecture/07_components.md`: primitive component conventions (folder-per-primitive,
  export shape) — matched to `image-placeholder` / `avatar` siblings.
- `architecture/05_server_state.md`: confirms no TanStack config change is required; the fix
  lives below the query layer.

### Local extensions loaded

- none required (no API/client changes).

### File read intent — pattern vs. relational

Relational reads performed (what exists):
- `packages/ui/src/components/primitives/avatar/Avatar.tsx`, `user-pill/UserPill.tsx` — the
  existing fail-state pattern being generalized.
- `packages/images/src/api/*` and `src/types.ts` — where raw `image_url` enters and which
  loaders consume it.
- `backend/app/beyo_manager/domain/images/serializers.py`,
  `services/queries/images/get_download_url.py`, `services/infra/storage/s3_client.py` — root
  cause verification.
- `docs/debugging/DEBUG_20260718_backend_image_rendering_inventory.md` — migration site list.

Pattern reads avoided: query-hook shape (`05`), component scaffolding (`07`) — contracts cover.

### Skill selection

- Primary skill: none (pure component/lib work).
- Trigger terms: n/a.
- Excluded alternatives: n/a.

## Implementation plan

### Phase 1 — the primitive (`@beyo/ui`)

1. `stable-image-url.ts`:
   - `toStableImageUrl(url: string): string`
   - Identity key = `origin + pathname` (the storage key; the querystring is the volatile part).
   - Detect presigned URLs by the presence of `X-Amz-Signature`; anything else returns as-is,
     uncached (dev/local storage paths, Shopify CDN, legacy absolute URLs).
   - Parse expiry from `X-Amz-Date` (`YYYYMMDDTHHMMSSZ`) + `X-Amz-Expires` (seconds).
   - Cache hit with `expiresAt − now > REFRESH_MARGIN_MS` (30 min, pending clarification) →
     return the **cached** URL (still valid; browser cache stays hot). Otherwise store & return
     the incoming URL.
   - `invalidateStableImageUrl(url)` — used by the error-recovery path.
   - Map capped at 1000 entries, evict oldest (Map insertion order).
2. `use-stable-image-url.ts`: `useStableImageUrl(url: string | null | undefined)` — memoized
   wrapper.
3. `BackendImage.tsx`:
   - Props: `Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string | null | undefined; fallback?: ReactNode }`.
   - Defaults: `alt=""`, `loading="lazy"`, `decoding="async"`, `draggable={false}`.
   - `stableSrc = useStableImageUrl(src)`; fail state per the `Avatar` pattern (reset when
     `stableSrc` changes — which, post-cache, only happens on real changes).
   - **Swap-on-decode**: when `stableSrc` changes while a previous image is displayed, keep
     rendering the old src, preload the new one (`new Image()` + `decode()`), swap on success —
     no blank frame on expiry rollover or genuine image replacement.
   - `onError`: if the failing URL was a cached presigned URL and a newer raw `src` exists →
     `invalidateStableImageUrl` + retry once with the fresh prop; else set fail state → render
     `fallback` (default `<ImagePlaceholder />`). (Pending clarification #2.)
   - Passthrough of `onLoad` and remaining img props (CaseMessageImageGrid needs
     `naturalWidth/Height` from `onLoad`).
4. Export from `packages/ui/src/index` (match sibling primitive export style).
5. Vitest: `stable-image-url.spec.ts` (acceptance #5 cases, fake timers for expiry) and
   `BackendImage.spec.tsx` (null src → placeholder; error → placeholder; error-retry path;
   src passthrough props).

### Phase 2 — internal adopters in `@beyo/ui`

6. `Avatar.tsx` / `UserPill.tsx`: run `imageSrc` through `useStableImageUrl` (keep their
   bespoke initials/placeholder rendering; do not rebase them on `BackendImage` in this plan).

### Phase 3 — migration (inventory §3, grouped as in the doc)

7. `@beyo/images` render surfaces (§3a): `ImagePreviewTile`, `ImageThumbnailGrid`,
   `ImageEditorPage`, `ImageMetadataActionsSheetPage` → `BackendImage`;
   `ZoomableImage` + `ZoomableEditorStage`/`ImageAnnotationCanvas` + `preload.ts`/
   `fetch-image.ts` → `toStableImageUrl` at the load point.
8. `@beyo/cases` (§3b, package files) → `BackendImage`.
9. `@beyo/tasks`, `@beyo/task-working-sections` (§3c package files) → `BackendImage`.
10. `@beyo/working-sections`, `@beyo/item-categories`, `@beyo/task-creation`,
    `@beyo/upholstery`, `@beyo/emails`, `@beyo/stats`, `@beyo/ui` `BoxPickerOption` (§3d–§3g
    package files) → `BackendImage`.
11. App-local sites (workers-app task_steps/working_sections pages, managers-app upholstery/
    working-sections/cases files, sellers-app `CaseTaskInfoCard`) → `BackendImage`
    (pending clarification #3).
12. Refresh the inventory doc's EH/PH table (all migrated rows become ✅/✅ via the primitive)
    and add a "solution" pointer to this plan.

### Phase 4 — validation & handoff

13. Full validation (below); file the backend handoff doc (already referenced in Metadata) so
    Layer 2 (server-side presigned-URL caching → byte-stable responses → restored structural
    sharing) can proceed independently.

## Risks and mitigations

- Risk: a cached presigned URL expires while a tab idles > 24 h → broken image until next
  refetch.
  Mitigation: error-recovery path (invalidate + retry with latest prop src), REFRESH_MARGIN
  adoption window, placeholder as final fallback.
- Risk: swap-on-decode holds a stale image briefly when an image is genuinely replaced.
  Mitigation: acceptable by design (old image is the correct previous state); decode is
  typically < 100 ms.
- Risk: memory growth of the module cache in long sessions.
  Mitigation: 1000-entry cap with oldest-first eviction; entries are two small strings + number.
- Risk: ~50-file migration touches many packages at once.
  Mitigation: phases are independently shippable; Phase 1+2 alone already fix Avatar/UserPill
  and everything can land group-by-group per the inventory tables.
- Risk: a site relies on the churning URL to force-refresh a *mutated* image with an unchanged
  pathname (e.g., re-uploaded file to the same key).
  Mitigation: upload pipeline writes new storage keys per upload (ULID-based filenames —
  `build-compressed-image-filename.ts`), so pathname change accompanies content change; noted
  as an invariant in the primitive's doc comment.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:ui`: green, including `stable-image-url.spec.ts` + `BackendImage.spec.tsx`.
- Existing suites (`test:shopify`, `test:stats`, `test:upholstery`): unchanged/green.
- Runtime (manual, DevTools Network + visual): open workers-app task steps list → pull-to-refresh
  → zero image requests, zero flicker; repeat on cases conversation and managers upholstery
  inventory; toggle airplane mode → placeholders render instead of broken glyphs.

## Review log

- (pending)

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David
