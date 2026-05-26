# PLAN_22_rich_content_dto_and_renderer_foundation_20260526

## Metadata

- Plan ID: `PLAN_22_rich_content_dto_and_renderer_foundation_20260526`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T00:00:00Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Introduce an app-owned message-content DTO and renderer adapter that is independent from Lexical internals and independent from the backend JSON shape.
- Business/user intent: The chat UI should be free to evolve richer semantics without letting backend DTOs or editor internals leak through the feature.
- Non-goals: No persistent rich-style guarantee yet; unsupported semantics must degrade safely when serialized for the current backend contract.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/message-content.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/lib/message-content-adapter.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubbleContent.tsx`
  - updates to `CaseMessageBubble.tsx`
  - updates to `features/cases/index.ts`
- Out of scope:
  - Lexical editor setup
  - Toolbar UI
  - Mention authoring UX
- Assumptions:
  - Backend-supported persisted block kinds remain only `text`, `mention`, `label`, and `link`.

## Clarifications required

_(none)_

## Acceptance criteria

1. The feature has an app-owned content type that can represent supported backend blocks plus future-safe richer semantics.
2. Incoming backend blocks can be adapted into renderable app content without exposing backend block arrays directly to bubble components.
3. Outgoing app content can be serialized back into backend-compatible block arrays.
4. Unsupported future-only styling semantics degrade safely to plain backend text blocks rather than leaking unsupported fields or Lexical JSON.

## Runtime validation (Playwright)

### Build rules

- No new standalone Playwright spec is required if this plan remains renderer-foundation only.
- If visible bubble rendering changes land as part of this plan, extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-conversation.spec.ts` with a small rendering smoke.
- Prefer unit coverage for adapter correctness; Playwright here is only for visible regression protection.

### Required scenarios if UI changes

1. Mention, label, and link blocks render in the browser without console/runtime errors.
2. Links are visibly distinct and interactable.

### Runtime assertions

- Confirm no console errors from unsupported block rendering.

## Contracts and skills

### Contracts loaded

- `architecture/02_types.md`: type rules and no duplicate shape declarations
- `architecture/24_dto.md`: DTO vs view-model boundaries
- backend handoff message content rules

### File read intent - pattern vs. relational

Permitted relational reads:
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/types.ts` - current raw backend block schemas
- backend handoff - exact block validation rules

## Implementation plan

1. Define app-owned content types separate from backend raw schemas.
2. Add a bidirectional adapter between backend blocks and app content.
3. Refactor message-bubble rendering to consume the app-owned content model.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/message-content.ts`
   - Define app-owned types only, no Zod parsing here.
   - Recommended model:
     - `CaseMessageContent`
     - `CaseInlinePart`
     - distinct part kinds for `text`, `mention`, `label`, `link`
     - optional future-facing mark metadata for `bold`, `underline`, `size`, `color`, `animation`
   - Keep future marks optional and clearly documented as frontend-owned semantics.

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/lib/message-content-adapter.ts`
   - Export:
     - `fromBackendMessageContent(blocks, mentionResolutions?)`
     - `toBackendMessageContent(appContent)`
     - `toBackendPlainText(appContent)`
   - Serialization rules:
     - supported content kinds round-trip normally
     - future-only style/animation marks must degrade to backend `text` blocks with preserved readable text
     - never output raw Lexical JSON
     - never output unsupported backend fields

3. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubbleContent.tsx`
   - Render from `CaseMessageContent`.
   - Supported first-pass render targets:
     - plain text spans
     - styled mention tokens
     - label chips
     - clickable links
   - Keep this component free of networking and controller logic.

4. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubble.tsx`
   - Replace direct use of `plain_text` or raw block arrays with the adapter + `CaseMessageBubbleContent`.
   - Preserve the deleted-message branch ahead of the renderer call.

5. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`
   - Re-export the app-owned content types and adapter helpers that later composer plans need.
