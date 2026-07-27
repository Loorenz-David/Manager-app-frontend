# SUMMARY_PLAN_27_image_attachments_in_case_conversation_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_27_image_attachments_in_case_conversation_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-27T05:27:38Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_27_image_attachments_in_case_conversation_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Reworked the case conversation draft flow so the composer owns a stable `draftMessageClientId`, reuses that ID for draft image uploads and the eventual `send-message` request, and rotates to a fresh ID after a successful send.
- Added a case-specific composer attachment strip that mounts the generic entity-images feature against `case_conversation_message`, previews draft attachments before send, exposes upload-state feedback, and provides a real retry action for failed uploads.
- Extended the generic images controller with retryable upload support backed by the original captured `Blob`, plus cleanup for local object URLs and retry sources.
- Updated composer send gating so messages cannot send while attachments are uploading, and attachment-only sends use a backend-compatible single-space payload when no text content exists.
- Added message-bubble image rendering for persisted backend attachments and wired those images into the existing fullscreen viewer surface in `preview-only` mode.
- Added focused unit coverage for retryable uploads, attachment-backed bubble rendering, and viewer opening from message-image grids.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-send-case-message.ts`: stopped regenerating the message client ID inside the mutation so the controller can supply the draft-owned ID.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`: added draft message identity, attachment-state tracking, send gating, and attachment-only send compatibility.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseBasicComposer.tsx`: mounted the attachment strip and switched send enablement to controller-owned draft state.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseRichComposer.tsx`: mounted the attachment strip and switched send enablement to controller-owned draft state.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerAttachmentStrip.tsx`: added the case-specific draft attachment UI, retry button, delete affordance, and conversation invalidation wiring.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/controllers/use-entity-images.controller.ts`: added retryable optimistic uploads and local cleanup for failed/successful attachment flows.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubble.tsx`: rendered persisted message images inside bubbles while preserving deleted-message handling and plain-text fallback behavior.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageImageGrid.tsx`: added the persisted message-image grid and viewer-surface integration.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/controllers/use-entity-images.controller.test.tsx`: added retry-path coverage for failed uploads.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubble.test.tsx`: added attachment-rendering coverage for case bubbles.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageImageGrid.test.tsx`: added viewer-opening coverage for persisted message images.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 27 linkage and progress note.

## Contract adherence

- `architecture/22_file_uploads.md`: kept attachment upload orchestration on the shared images endpoints and preserved the request-upload-url → upload → confirm lifecycle.
- `architecture/05_server_state.md`: invalidated the existing case detail and conversation queries instead of introducing a second case-specific image cache.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test:unit -- src/features/images/controllers/use-entity-images.controller.test.tsx src/features/cases/components/CaseMessageBubble.test.tsx src/features/cases/components/CaseMessageImageGrid.test.tsx`: pass
- `npx playwright test`: not run

## Known gaps or deferred items

- The runtime attachment flow is not yet covered by a passing Playwright case; nested camera-surface automation still needs a stable harness before this can be promoted into required runtime evidence.
- Edit-message flows still exclude attachment editing; the attachment strip remains draft-message scoped only.

## Handoff notes (if needed)

- None.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_27_image_attachments_in_case_conversation_20260526.md`
