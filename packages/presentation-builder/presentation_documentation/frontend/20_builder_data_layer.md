# 20 — Builder data layer (`api/` + `actions/` + `types.ts`)

`packages/presentation-builder/src/{api,actions}` + `src/types.ts` — everything that
talks to the **admin** endpoints (`/api/v1/app-update-presentations`). React Query
throughout. Payload truth: [`../backend/`](../backend/).

## `src/types.ts` — admin schemas

Zod schemas for the *authoring* model: `Presentation`, `Slide`, audience types
(`AppKey`, `RoleKey`, `AudienceMode`), `PresentationCategory`, input types for every
mutation (`UpdatePresentationMetadataInput`, `ReplaceAudienceInput`,
`CompositionElementInput`, …). Embeds runtime schemas for composition/media parts.
Draft-lenient (`sequence_order` nonnegative, nullables) — see doc 50 before
tightening anything.

## `src/api/` — reads + keys

| File | Role |
|---|---|
| `presentation-keys.ts` | Query-key factory for presentations + users. **Every invalidation goes through these keys** — never inline key arrays. (`presentation-keys.test.ts` pins shapes.) |
| `presentations.ts` | Raw admin fetchers (list/detail/create/metadata/publish/archive/new-version) unwrapping the `{data, ok, warnings}` envelope |
| `slides.ts` | Slide CRUD + reorder fetchers |
| `composition.ts` | `PUT` full-composition replace fetcher |
| `audience.ts` | `PUT` audience replace fetcher |
| `media.ts` | 2-step media upload fetchers: register (get S3 presigned target) + confirm, plus update/delete/reorder |
| `upload-to-s3.ts` | The direct-to-S3 PUT (no auth header, no envelope — plain storage upload) |
| `list-users.ts` | Compact user directory for the audience picker (`PresentationUserCompactSchema`) |
| `use-presentations-list.ts` | Dashboard list query. Backend enriches items with `slide_count`, `media_kinds`, `cover_url` **specifically for dashboard cards** (handoff `docs/handoff/to_backend/HANDOFF_presentation_admin_list_card_fields_20260722.md`) |
| `use-presentation-detail.ts` | Full presentation for the editor (slides + elements + media + audience) |
| `use-presentation-preview.ts` | Preview payload for the preview overlay |
| `use-presentation-users.ts` | Query wrapper over `list-users` |

## `src/actions/` — mutations

One hook per backend operation, thin and uniform: call fetcher → invalidate via
`presentationKeys` → surface errors to the caller (the editor controller maps them to
user-visible state). Lifecycle: `use-create-presentation`, `use-update-presentation-
metadata`, `use-publish-presentation`, `use-archive-presentation`,
`use-create-new-version`. Slides: add/update/delete/reorder. Media:
`use-upload-slide-media` (orchestrates register → S3 PUT → confirm; has its own test),
update/delete/reorder. Composition: `use-replace-composition` (full `PUT` of a slide's
elements — the editor autosave target). Audience: `use-replace-audience`.
`use-full-presentation-mutation.ts` is the shared mutation plumbing.

## Permissions

`src/lib/use-presentation-builder-permissions.ts`: role-gated authoring (admin +
manager). **Role gates authoring, not `app_scope`** — the studio signs in under
`appScope="manager"`; never hardcode an `app_key` check here (V1 resolution).

## Upstream / downstream

- **Upstream:** `@beyo/api` client (auth/session, envelope conventions), backend
  contract docs, runtime schemas (embedded in `types.ts`).
- **Downstream:** the editor controller and dashboard controller consume *only* these
  hooks — components never fetch. Change a payload here → check
  `composition-mapping.ts` (element input shape), `publish-form.ts` (metadata/audience
  payload builders), and test fixtures (`src/test/fixtures.ts`, MSW handlers in
  `src/test/server.ts`).

## Invariants

- Admin endpoints wrap in `{data, ok, warnings}`; **`GET /history` is deliberately
  never wrapped** (backend V2 decision) — don't "fix" that if you ever consume it.
- Versioning: "edit a published presentation" = `new-version` (same
  `logical_client_id`, `version+1`, new `client_id`) — never mutate published rows.
- Publish 422s currently arrive as keyword-matched messages mapped in
  `publish-form.ts` (`mapPublishFailure`); a structured-causes backend follow-up is
  on record but not built.
