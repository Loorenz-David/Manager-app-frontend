# PLAN_27_image_attachments_in_case_conversation_20260526

## Metadata

- Plan ID: `PLAN_27_image_attachments_in_case_conversation_20260526`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T00:00:00Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Integrate the existing generic image feature into case conversations for message attachments and message-bubble image rendering.
- Business/user intent: Managers should be able to attach/take pictures inside a conversation without the app inventing a second image system.
- Non-goals: Voice attachments, separate case-only image upload architecture.

## Scope

- In scope:
  - updates to `use-send-case-message.ts`
  - updates to `use-case-conversation.controller.ts`
  - updates to `CaseBasicComposer.tsx` and/or `CaseRichComposer.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerAttachmentStrip.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageImageGrid.tsx`
  - targeted updates inside `apps/managers-app/ManagerBeyo-app-managers/src/features/images` only where the generic feature lacks required retry/state hooks
- Out of scope:
  - A new image backend
  - Voice-message blocks
- Assumptions:
  - `features/images/types.ts` already supports `entity_type: "case"` and `entity_type: "case_conversation_message"`.
  - Backend message `client_id` can be provided by the frontend, which is required to attach images before send completes.

## Clarifications required

_(none)_

## Acceptance criteria

1. The composer has an attach/take-picture entry point that reuses the images feature.
2. Draft attachments can be previewed before send.
3. Upload progress and failure are visible in the composer.
4. Failed uploads have a real retry path, not just a dismiss button.
5. Sent messages render their attached images inside message bubbles using backend message-image data.

## Runtime validation (Playwright)

### Build rules

- Add or extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-attachments.spec.ts`.
- Reuse the repo’s existing image-flow testing patterns and helpers where possible.
- Mock upload-url, upload, confirm, and conversation refresh responses deterministically.

### Required test IDs

- `case-composer-attachment-strip`
- `case-composer-add-picture-button`
- `case-composer-attachment-tile-<imageClientId>`
- `case-composer-attachment-retry-<imageClientId>`
- `case-message-image-grid-<messageClientId>`

### Required scenarios

1. Add/take-picture flow creates a draft attachment preview.
2. Upload progress and completion are visible before send.
3. Failed upload exposes a retry action that succeeds on retry.
4. Sending a message with image attachments renders images in the resulting thread bubble.
5. Tapping a rendered image opens the image viewer surface.

### Runtime assertions

- Assert upload and confirm requests use the generic images endpoints, not a new cases-only endpoint.
- Assert send is blocked while attachment uploads are still in progress.

## Contracts and skills

### Contracts loaded

- `architecture/22_file_uploads.md`: upload lifecycle expectations
- `architecture/05_server_state.md`: invalidation after confirm/upload
- existing `features/images` types/controllers/contracts

### File read intent - pattern vs. relational

Permitted relational reads:
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/types.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/providers/EntityImagesProvider.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/controllers/use-entity-images.controller.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/store/images.store.ts`

## Implementation plan

1. Give the composer a stable draft message client ID so images can upload against the future message entity.
2. Reuse `EntityImagesProvider` for draft attachments and existing image surfaces for capture/view/edit.
3. Extend the generic images feature only where the current API is insufficient, especially for retry.
4. Render persisted message images inside bubbles with the existing image viewer surface.

## Step-by-step file-level instructions

1. Draft message identity
   - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`
   - Maintain `draftMessageClientId`.
   - Generate it with `generateClientId('CaseConversationMessage')`.
   - Reuse that ID for both:
     - `EntityImagesProvider entityType="case_conversation_message"`
     - send-message `client_id`
   - After a successful send, rotate to a fresh `draftMessageClientId` for the next draft.

2. Composer integration
   - Wrap the composer attachment area in `EntityImagesProvider`.
   - Prefer a case-specific `CaseComposerAttachmentStrip` over dropping the generic full grid directly into chat chrome.
   - Reuse `ImageAddPictureButton` and existing camera/viewer/editor surfaces where appropriate.

3. Send gating
   - Do not allow send while any attached image is in an in-flight upload state.
   - Decide send enablement from image-controller state, not by guessing from UI.
   - Messages with attachments but no text should still be sendable if upload completion succeeded and backend allows empty `plain_text`; if backend requires text, use an explicit single-space or empty-string compatibility rule only if verified against the contract before implementation.

4. Retry gap in the current generic image feature
   - The current image store does not retain a retryable raw `Blob`; failed uploads therefore cannot be truthfully retried today.
   - Extend `features/images` in the smallest generic way:
     - keep a retry source in controller-local memory or store state for optimistic uploads
     - expose `retryImageUpload(imageClientId)` from `useEntityImagesController`
   - Do not fake retry by forcing the user to re-open the camera unless product explicitly accepts that fallback.

5. Bubble rendering
   - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageImageGrid.tsx`
   - Render one or more message images beneath the bubble content.
   - Tapping an image should open the existing image viewer surface in `preview-only` mode with `entityType="case_conversation_message"`.

6. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubble.tsx`
   - Include `CaseMessageImageGrid` when `message.images.length > 0`.
   - Keep text-content and image-content layout in one bubble component so outgoing/incoming styling stays consistent.

7. Cache refresh
   - On upload completion or unlink from the draft message entity, invalidate the current conversation detail/messages query so persisted message-image state matches the backend after send.
   - Avoid creating a second cases-specific image cache.
