# INTENTION_image_confirm_upload_deferred_instance_flow_20260527

## Metadata

- Intention ID: `INTENTION_image_confirm_upload_deferred_instance_flow_20260527`
- Status: `active`
- Owner: `GitHub Copilot`
- Created at (UTC): `2026-05-27T00:00:00Z`
- Last updated at (UTC): `2026-05-27T00:00:00Z`

## Goal

Enable a scalable image lifecycle where direct camera capture can be edited first and only creates backend image instances on confirm-upload (single or batch), while preserving existing editor behavior for already-created images.

## Why this matters

The current UX target is: capture -> edit immediately -> user decides done/cancel, with full control over annotations before persistence. To support this without race conditions, the frontend must own image identity and metadata during upload and only persist instances when explicitly confirmed.

This matters for three reasons:

1. Product UX: users can annotate immediately after capture without waiting for db creation.
2. Data integrity: atomic batch confirm lets multiple pending uploads become consistent in one transaction.
3. Architecture: image editor must support two persistence modes without breaking existing feature integrations.

## Success criteria

1. The frontend image lifecycle supports deferred instance creation by confirming uploads with `image_client_id`, image fields, and optional `image_annotations` in a single-item confirm flow.
2. The frontend supports confirm-upload batch payloads in both accepted forms (`{ items: [...] }` and top-level list `[...]`) through a unified client contract.
3. Direct capture editor flow persists annotations through confirm-upload payload on Done, instead of post-create annotation calls.
4. Existing editor flow for already-created images continues using individual annotation mutation endpoints with no regressions.
5. Confirm-upload client never sends `file_size_bytes` and handles backend validation constraints explicitly.
6. Frontend pre-validates duplicate `image_client_id` and duplicate `pending_upload_client_id` in the same batch to fail fast before request.
7. Batch confirm handling reflects backend atomicity (one failure -> whole batch treated as failed).
8. Typecheck and focused image tests pass after implementation.

## Scope boundary

- In scope:
  - Image upload pipeline contract changes around confirm-upload payload construction.
  - Deferred instance creation mode for direct camera -> editor flow.
  - Confirm-upload client/schema support for single and batch payload shapes.
  - Image editor orchestration split between deferred-create path and existing created-instance path.
  - Frontend-side validation for duplicate ids within a batch payload.
  - Error handling updates for atomic batch failure semantics.

- Out of scope:
  - Backend implementation changes (already delivered by backend).
  - New annotation tools or annotation UI redesign.
  - Rework of image storage upload-url generation endpoint.
  - Non-image feature changes.

- Non-goals:
  - Replacing all image flows with batch mode by default.
  - Removing existing `confirm image annotation` endpoints for persisted instances.
  - Building offline queueing in this iteration.

## Linked implementation plans

| Plan ID                                                     | Path                                                                                                               | Status               | Covers                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------- |
| `PLAN_image_confirm_upload_deferred_instance_flow_20260527` | `docs/architecture/under_construction/implementation/PLAN_image_confirm_upload_deferred_instance_flow_20260527.md` | `under_construction` | Contract migration + dual-mode editor persistence + batch confirm orchestration |

## Progress notes

- `2026-05-27`: Baseline trace completed for existing flow in managers-app image feature: request upload-url -> upload blob via signed URL -> confirm-upload with `pending_upload_client_id`, `entity_type`, `entity_client_id`.
- `2026-05-27`: Direct camera-to-editor flow and hard-delete-on-cancel behavior were introduced in frontend orchestration, but persistence is still based on current confirm-upload contract and requires migration to deferred-instance payload mode.
- `2026-05-27`: New backend confirm-upload contract acknowledged: accepts `image_client_id`, dimensions, and `image_annotations`; supports batch in two accepted shapes; rejects duplicates and `file_size_bytes`; batch is atomic.

## Open questions

- Which batch request shape should be canonical in frontend client APIs (`{ items: [...] }` vs top-level list) and should the other shape be normalized in adapter code? — impact if unresolved: duplicated client code paths and higher maintenance risk.
- Should direct capture Done always use single-item confirm first, with optional batching only when multiple pending captures exist in the same scope? — impact if unresolved: inconsistent persistence timing and harder UX predictability.
- For mixed success expectations in UI, how should atomic batch failure be surfaced (single toast, per-item markers, retry strategy)? — impact if unresolved: confusing user feedback and potential stale optimistic states.
- Should `width_px` and `height_px` come from client capture metadata, image decode at editor stage, or be optional when unavailable? — impact if unresolved: schema mismatch risk and avoidable confirm failures.

## Lifecycle transition

- Current status: `active`
- Next status: `<achieved | paused | abandoned | superseded>`
- Transition trigger: `all success criteria met and linked implementation plan completed`

## Confirm-upload contract context

Accepted single-item payload:

```json
{
  "pending_upload_client_id": "pu_01...",
  "entity_type": "item",
  "entity_client_id": "itm_01...",
  "image_client_id": "img_01...",
  "width_px": 1600,
  "height_px": 900,
  "image_annotations": [
    { "tool": "text", "x": 10, "y": 20, "text": "note" },
    { "tool": "rectangle", "x": 1, "y": 2, "w": 10, "h": 8 }
  ]
}
```

Accepted batch payload (`items` envelope):

```json
{
  "items": [
    {
      "pending_upload_client_id": "pu_01...",
      "entity_type": "item",
      "entity_client_id": "itm_01...",
      "image_client_id": "img_01...",
      "width_px": 1600,
      "height_px": 900,
      "image_annotations": [
        { "tool": "text", "x": 10, "y": 20, "text": "note" }
      ]
    },
    {
      "pending_upload_client_id": "pu_02...",
      "entity_type": "item",
      "entity_client_id": "itm_01..."
    }
  ]
}
```

Accepted batch payload (top-level list):

```json
[
  {
    "pending_upload_client_id": "pu_01...",
    "entity_type": "item",
    "entity_client_id": "itm_01...",
    "image_client_id": "img_01..."
  },
  {
    "pending_upload_client_id": "pu_02...",
    "entity_type": "item",
    "entity_client_id": "itm_01..."
  }
]
```

Important backend behaviors to reflect in frontend:

- `file_size_bytes` is rejected by confirm-upload request validation.
- Duplicate `image_client_id` in the same batch is rejected.
- Duplicate `pending_upload_client_id` in the same batch is rejected.
- Batch is atomic: one failure rolls back all items.
