# PLAN_26_mentions_foundation_20260526

## Metadata

- Plan ID: `PLAN_26_mentions_foundation_20260526`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T00:00:00Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Add the first mentions foundation for authoring and rendering backend-compatible mention blocks.
- Business/user intent: Conversations need a path toward addressing specific coworkers directly without coupling the UI to notification assumptions the backend has not promised.
- Non-goals: Full notification UX, cross-workspace people search, presence-aware ranking.

## Scope

- In scope:
  - updates to `message-content.ts` and `message-content-adapter.ts`
  - updates to `CaseMessageBubbleContent.tsx`
  - updates to `CaseComposerEditor.tsx` and `CaseRichComposer.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseMentionSuggestions.tsx`
  - optional `apps/managers-app/ManagerBeyo-app-managers/src/features/users/api/list-users.ts` and `use-list-users.ts` only if a backend users-search/list endpoint is confirmed
- Out of scope:
  - Notification delivery behavior
  - Mention permission rules beyond available user data
- Assumptions:
  - `case.mentions` and `message.mentions` are already available in case detail responses.

## Clarifications required

- [ ] Confirm whether a frontend-usable users search/list endpoint exists for mention suggestions. No `src/features/users/api/*` query hooks exist in the current repo, so this cannot be assumed safely.

## Acceptance criteria

1. Mention content can be rendered from backend blocks as styled inline tokens.
2. The composer can recognize an `@` mention trigger and show suggestions from available user data.
3. Chosen mentions serialize to backend-compatible blocks with:
   - `type: "mention"`
   - `text`
   - `mention.mention_table`
   - `mention.mention_id`
   - `mention.client_id`
4. If no global users query exists yet, the initial suggestions still work from locally known case users instead of blocking the feature completely.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-composer.spec.ts`.
- Mock mention candidate data deterministically from local case context or the users endpoint when present.
- Validate both authoring and rendered-thread behavior.

### Required test IDs

- `case-mention-suggestions`
- `case-mention-suggestion-<userId>`

### Required scenarios

1. Typing `@` opens mention suggestions.
2. Selecting a suggestion inserts a mention token into the composer.
3. Sending the message renders the mention distinctly in the thread.

### Runtime assertions

- Assert the send payload includes the backend-compatible mention block shape.
- Assert no runtime errors occur if the users query endpoint is absent and local candidates are used instead.

## Contracts and skills

### Contracts loaded

- backend handoff mention block contract
- `architecture/24_dto.md`: keep mention DTOs app-owned at the frontend boundary
- `architecture/07_components.md`: inline suggestion UI stays component-level

### File read intent - pattern vs. relational

Permitted relational reads:
- `apps/managers-app/ManagerBeyo-app-managers/src/features/users/types.ts` - existing user DTO shapes
- case detail contract - `case.mentions` and `message.mentions`

## Implementation plan

1. Extend the app-owned content model with explicit mention parts.
2. Build suggestion sources from known case/user context first.
3. Optionally layer in a users API query when the endpoint is confirmed.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/message-content.ts`
   - Ensure mention parts can carry:
     - display text
     - mention table
     - mention ID
     - client ID
     - optional resolved display snapshot

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/lib/message-content-adapter.ts`
   - Round-trip backend mention blocks exactly.
   - Prefer resolved `mention_data` from the backend for rendering labels when available.

3. Suggestion source strategy
   - First-pass sources should be orderable and explicit:
     - `case.mentions`
     - unique `created_by` users from loaded messages
     - optional users-query results when that endpoint is confirmed
   - Do not block the plan on a global users search endpoint if local case context already provides useful candidates.

4. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseMentionSuggestions.tsx`
   - Render an inline suggestion list anchored to the composer, not a full-screen surface.
   - Show avatar/initial plus username.
   - Keep it keyboard-friendly and touch-friendly.

5. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerEditor.tsx`
   - Detect `@` trigger and the current search token.
   - Insert a mention entity/part in editor state on selection.
   - Preserve plain-text output such as `@Jane Doe` for the backend `text` field inside the mention block.

6. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubbleContent.tsx`
   - Render mention tokens distinctly from plain text.
   - Use app-owned styling, not browser default link styling unless the mention intentionally navigates later.

7. Optional users API work
   - If a backend endpoint is confirmed, add `features/users/api/list-users.ts` and `use-list-users.ts`.
   - Keep that work in the users feature; cases should consume the public hook rather than embedding ad hoc fetches.
