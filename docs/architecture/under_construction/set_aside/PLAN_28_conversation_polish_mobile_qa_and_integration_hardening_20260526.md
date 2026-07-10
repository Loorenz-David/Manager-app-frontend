# PLAN_28_conversation_polish_mobile_qa_and_integration_hardening_20260526

## Metadata

- Plan ID: `PLAN_28_conversation_polish_mobile_qa_and_integration_hardening_20260526`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T00:00:00Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Final polish and integration hardening for the cases page and conversation experience after the core feature stages land.
- Business/user intent: The feature should feel dependable on real mobile devices rather than merely functionally complete.
- Non-goals: New major capabilities beyond stabilization and QA.

## Scope

- In scope:
  - cases-page polish
  - conversation loading/empty/error/retry states
  - keyboard overlap review
  - scroll-to-bottom affordance
  - safe-area review
  - test IDs
  - lint/typecheck/test checklist
- Out of scope:
  - new product features
  - backend contract expansion
- Assumptions:
  - Plans 15 through 27 are implemented or substantially merged before this pass.

## Clarifications required

_(none)_

## Acceptance criteria

1. The feature has dedicated empty, loading, error, and retry states for both list and conversation views.
2. The conversation remains usable with mobile keyboards on iPhone and Android.
3. A scroll-to-bottom affordance appears when the user is away from the latest message and disappears when back at the bottom.
4. Stable `data-testid` coverage exists for the major user flows.
5. Final verification includes typecheck, lint, and documented manual mobile QA.

## Runtime validation (Playwright)

### Build rules

- Consolidate cases coverage under:
  - `tests/playwright/features/cases/cases-page.spec.ts`
  - `tests/playwright/features/cases/case-conversation.spec.ts`
  - `tests/playwright/features/cases/case-composer.spec.ts`
  - `tests/playwright/features/cases/case-attachments.spec.ts`
- All specs must import from `../../fixtures/app-fixture`.
- Run mobile project first, then desktop after mobile is green.

### Required final scenarios

1. Cases list happy path: render, search, open conversation.
2. Conversation happy path: header, banner collapse, older-message load.
3. Read/unread path: unread badge clears after reading.
4. Composer happy path: send, edit, delete.
5. Rich-composer path: toolbar or mention interactions still permit successful send.
6. Attachment path: upload, retry, render, viewer open.
7. Error-path smoke: at least one fetch failure and one send failure surface a retryable UI instead of crashing.

### Required runtime assertions

- `assertNoUnexpectedErrors`-style checks via the shared fixture remain clean across the full flow.
- All feature-critical `data-testid` targets exist and remain stable.
- No unexpected 4xx/5xx responses in happy paths.
- Mobile layout remains usable at the configured mobile viewport.
- Desktop layout remains functional at the configured desktop viewport.

### Final execution checklist

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npm run test:e2e:mobile`
- `npm run test:e2e:desktop`

## Contracts and skills

### Contracts loaded

- `architecture/14_styling.md`: final token alignment
- `architecture/17_testing.md`: selector stability and unit/e2e strategy
- `architecture/27_responsive.md`: mobile and safe-area review
- `architecture/32_loading_skeletons.md`: reflective skeletons
- `architecture/34_runtime_validation.md`: final runtime and interaction validation

### File read intent - pattern vs. relational

Permitted relational reads:
- the completed cases feature files only
- `apps/managers-app/ManagerBeyo-app-managers/package.json` scripts for final verification targets

## Implementation plan

1. Review the whole cases flow for missing UI states and broken transitions.
2. Add mobile-specific affordances and safe-area fixes.
3. Add stable test IDs and a final QA checklist.
4. Run final verification commands and capture any residual risks.

## Step-by-step file-level instructions

1. Cases page polish
   - Review `CasesView`, `CaseCard`, and group components from PLAN_14.
   - Ensure:
     - empty states per section are intentional
     - loading skeletons reflect card/group structure
     - search empty state differs from global no-cases state

2. Conversation state polish
   - Review `CaseConversationSlideView`, message list, composer, info sheet, and action sheets.
   - Add explicit states for:
     - first-load skeleton
     - no messages yet
     - failed older-page load
     - failed send/edit/delete
     - failed task-info load

3. Mobile keyboard and safe-area hardening
   - Verify fixed header, banner, message list, composer, and sheets together on:
     - iPhone Safari
     - Android Chrome
   - Check:
     - keyboard overlap
     - input focus loss after sheet interactions
     - bottom safe-area spacing
     - overscroll bounce edge cases

4. Scroll-to-bottom affordance
   - Add a floating or docked `scroll to latest` control in the conversation view.
   - Show it only when the user is meaningfully away from the newest message.
   - Wire it to the message-list controller’s `scrollToBottom()`.

5. Accessibility baseline
   - Ensure buttons have labels.
   - Confirm color contrast on primary bubbles and the primary context banner.
   - Make long-press alternatives available through explicit controls where practical.

6. Test IDs
   - Add stable `data-testid` markers for:
     - cases page header
     - search bar
     - section groups
     - case cards
     - conversation header buttons
     - message list
     - composer textarea/editor
     - send button
     - message action sheet
     - attachment strip

7. Final verification checklist
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test:unit`
   - `npm run test:e2e:mobile` for core conversation flows
   - Manual QA checklist:
     - open case from list
     - open info sheet and task detail
     - scroll old messages
     - send/edit/delete
     - mention selection
     - color sheet focus restoration
     - image attachment upload/retry
