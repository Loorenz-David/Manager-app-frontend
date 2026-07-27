# HANDOFF_TO_BACKEND_image_pending_upload_cancel_cleanup_20260527

## Metadata

- Handoff ID: `HANDOFF_TO_BACKEND_image_pending_upload_cancel_cleanup_20260527`
- Created at (UTC): `2026-05-27T13:45:49Z`
- Owner agent: `Codex`
- Source frontend plan: `docs/architecture/archives/implementation/PLAN_image_confirm_upload_deferred_instance_flow_20260527.md`

## Request to backend

- Required backend behavior:
  Add a backend cleanup path for uploaded-but-unconfirmed image blobs in the deferred `camera-to-editor` flow. When the user captures a new image, the frontend now requests an upload URL, uploads the blob, and only creates the image instance later on confirm-upload. If the user closes/cancels the editor before pressing Done, there is no image instance yet, so `DELETE /api/v1/images/{image_client_id}` cannot be used. The backend needs an endpoint that deletes the uploaded object from the storage provider and marks the pending upload as canceled using `pending_upload_client_id`.
- User-facing impact:
  Users can cancel a freshly captured image from the editor without leaving orphaned uploaded files in storage. This keeps storage clean and makes the capture-cancel flow behave correctly.
- Desired timeline:
  Needed for the next frontend cleanup pass on the image direct-capture flow.

## Frontend context

- Why the frontend needs this:
  The frontend already has a deferred confirm flow for direct camera capture. Before the user taps Done, the only server-side handle that exists is the `pending_upload_client_id` returned by `POST /api/v1/images/upload-url`. The upload may already be complete and the optimistic tile may already be in `pre_confirm`, but there is still no image instance to hard-delete. A backend-mediated pending-upload cancel endpoint is needed to clean up the uploaded blob safely.
- Blocked frontend plan (if any): `docs/architecture/archives/implementation/PLAN_image_confirm_upload_deferred_instance_flow_20260527.md`
- Clarifications required:
  - [ ] Should cancel be fully idempotent? Frontend strongly prefers yes, so repeated cancel attempts can return success even if the blob was already removed.
  - [ ] Should confirm-upload against a canceled `pending_upload_client_id` return `409 conflict` or `422 unprocessable`? Frontend can handle either, but the contract should be explicit.
  - [ ] If the upload is still in flight when cancel arrives, should the backend treat later object arrival as a no-op cleanup candidate, or immediately mark the pending upload as canceled and reject confirm regardless? This affects race handling between PUT completion and cancel.

## Expected backend deliverables

1. Add a pending-upload cleanup endpoint for images, preferably keyed by `pending_upload_client_id` only.
2. Persist or resolve the mapping from `pending_upload_client_id` to the storage object so the frontend does not need to send raw storage keys back.
3. Delete the uploaded object from the storage provider and mark the pending upload as canceled/deleted on the backend.
4. Reject later confirm-upload attempts for canceled pending uploads.
5. Return a stable, documented response shape and error contract so the frontend can wire the cancel path into `onCancelCapture`.

## Interface expectations

- Endpoint(s):
  Preferred:
  `DELETE /api/v1/images/pending-upload/{pending_upload_client_id}`

  Acceptable alternative:
  `POST /api/v1/images/cancel-upload`

  Preferred because it matches the intent better and avoids introducing a command-style POST when this is a delete/cancel action.

- Request shape:
  Preferred request:
  ```json
  {}
  ```
  with `pending_upload_client_id` in the route.

  Acceptable request body alternative:
  ```json
  {
    "pending_upload_client_id": "pu_01..."
  }
  ```

  Fallback only if the backend does not persist the mapping from pending upload to storage object:
  ```json
  {
    "pending_upload_client_id": "pu_01...",
    "storage_key": "images/tmp/..."
  }
  ```
  The frontend prefers not to send `storage_key` if the backend can avoid it.

- Response shape:
  Suggested success shape:
  ```json
  {
    "ok": true,
    "data": {
      "pending_upload_client_id": "pu_01...",
      "canceled": true,
      "storage_deleted": true
    },
    "warnings": []
  }
  ```

  If the backend chooses idempotent success for already-cleaned uploads, this is also acceptable:
  ```json
  {
    "ok": true,
    "data": {
      "pending_upload_client_id": "pu_01...",
      "canceled": true,
      "storage_deleted": false
    },
    "warnings": ["storage object already absent"]
  }
  ```

- Error cases:
  - `404 not_found`: unknown `pending_upload_client_id` if the backend does not support idempotent success for missing records.
  - `409 conflict` or `422 unprocessable`: pending upload was already confirmed into a real image instance and can no longer be canceled.
  - `403 forbidden`: pending upload exists but belongs to another entity/workspace/user scope.
  - `500 server_error`: storage provider delete failed or backend could not reconcile cleanup state.

- Socket events (if applicable):
  - None required.

## Frontend contract implications

- Architecture contracts affected:
  - `architecture/04_api_client.md`: new image cleanup endpoint will need a typed API client wrapper.
  - `architecture/08_hooks.md`: frontend will likely add a `useCancelPendingImageUpload` action hook.
  - `architecture/13_errors.md`: frontend needs explicit error semantics for canceled-vs-confirmed race cases.
- Local extension updates needed:
  - `architecture/04_api_client_local.md`
