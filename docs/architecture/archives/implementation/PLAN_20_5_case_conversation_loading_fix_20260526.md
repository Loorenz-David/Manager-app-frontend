# PLAN_20_5_case_conversation_loading_fix_20260526

## Metadata

- Plan ID: `PLAN_20_5_case_conversation_loading_fix_20260526`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T12:20:13Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Make case conversations load reliably after tap, refresh, and direct URL access.
- Business/user intent: Managers should be able to open a case conversation and keep using it after refresh without losing the loaded case context.
- Non-goals:
  - Do not redesign the conversation UI.
  - Do not add edit/delete message interactions here.
  - Do not change message content rendering beyond what is needed to load the conversation successfully.

## Scope

- In scope:
  - Persist the conversation case identifier in the URL or another reload-safe route state.
  - Stop relying on transient surface props as the only source of `caseClientId`.
  - Reuse the case list snapshot when it already contains the data needed for the conversation header and task context.
  - Keep the conversation page from failing the whole view when task context is unavailable or still loading.
  - Make the conversation loading state explicit and separate from hard error states.
- Out of scope:
  - Rich composer work.
  - Message edit/delete behavior.
  - New message attachments.
  - Conversation moderation or permissions redesign.
- Assumptions:
  - The case list already includes enough data to derive the initial conversation context.
  - The case conversation messages come from the case detail endpoint and are already supported by the backend.

## File manifest

### Existing files to edit

| Path (relative to `src/`)                                        | Change summary                                                                                                              |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `app/router.tsx`                                                 | Add a reload-safe case conversation route, likely under `/cases/:caseId` or equivalent.                                     |
| `app/SurfaceRouteFrame.tsx`                                      | Keep route-backed surfaces working when the conversation is opened from a URL instead of only from transient surface state. |
| `pages/cases/CaseConversationSlidePage.tsx`                      | Read `caseClientId` from route params first, then fall back to surface props if present.                                    |
| `features/cases/controllers/use-cases-view.controller.ts`        | Open the route-backed conversation using the case id from the clicked card.                                                 |
| `features/cases/controllers/use-case-conversation.controller.ts` | Treat task context as optional and avoid failing the full conversation when only task lookup is missing.                    |
| `features/cases/components/CaseConversationSlideView.tsx`        | Split loading and error states so the conversation can render while optional context is still resolving.                    |
| `features/cases/api/use-get-case.ts`                             | Ensure the case detail query remains the single source of messages and does not depend on the task query.                   |
| `features/cases/api/use-case-conversation-messages.ts`           | Reuse cached case detail data safely when available and keep message loading aligned with the route-backed case id.         |
| `features/cases/types.ts`                                        | Adjust any list/detail schema assumptions only if they block loading the conversation payload.                              |
| `features/cases/surfaces.ts`                                     | Keep the existing surface entry but make sure it can coexist with the new reload-safe route entry.                          |

### New files to create

| Path (relative to `src/`)                                  |
| ---------------------------------------------------------- |
| `pages/cases/CaseConversationPage.tsx`                     |
| `features/cases/components/CaseConversationRouteEntry.tsx` |

## Clarifications required

- Resolved: Refresh keeps the same `/cases/:caseId` URL so the conversation can reload without losing identity.
- Resolved: The cases list still opens the conversation inside the slide surface; the route is used to restore that same surface on refresh and direct entry.

## Acceptance criteria

1. Refreshing a case conversation keeps the same case open and loads the message thread without showing "Case id is missing."
2. Opening a case from the cases list loads the conversation even if task context is still resolving or unavailable.
3. The conversation messages render from the case detail payload after a full page reload.
4. The page no longer flips to the generic "Case conversation could not be loaded" fallback when only optional task context is missing.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: query-driven data loading and cache reconciliation.
- `architecture/11_routing.md`: route-backed navigation for reload-safe surfaces.
- `architecture/28_surfaces.md`: coexistence of route-backed and transient surface flows.
- `architecture/30_dynamic_loading.md`: lazy-loaded pages and reload-safe entry points.
- `architecture/34_runtime_validation.md`: validation expectations for conversation loading changes.

### Local extensions loaded

- `architecture/28_surfaces_local.md`: route/surface coexistence guidance.
- `architecture/30_dynamic_loading_local.md`: lazy loading for cases pages and surfaces.

### Skill selection

- Primary skill: `skills/cross_cutting/debugging_nested_plan_loop/SKILL.md`
- Trigger terms: `refresh, conversation not loading, case id missing, schema mismatch`
- Excluded alternatives: `skills/project-setup-info-local/SKILL.md` — this is not a new project setup task.

## Implementation plan

1. Make the case conversation route-backed so the case id survives refresh and deep links.
2. Change the conversation page to read the case id from the router first, then from surface props only when the surface stack is present.
3. Stop treating task context as a hard requirement for rendering the conversation thread.
4. Reuse the case detail payload as the source of the initial message thread and header context whenever available.
5. Add Playwright coverage for refresh and direct-open behavior so the conversation still renders after a reload.

## Risks and mitigations

- Risk: The route-backed page may diverge from the overlay surface behavior.
  Mitigation: Keep the same page component and only change how `caseClientId` is sourced.
- Risk: Making task context optional may hide real backend failures.
  Mitigation: Show a smaller non-blocking task-context fallback instead of failing the whole conversation.
- Risk: The URL-backed route may affect close/back navigation.
  Mitigation: Keep surface close behavior for overlay opens and use route navigation only for reload-safe entry.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npx playwright test --grep "cases conversation|cases page" --project=desktop`: conversation opens, refreshes, and renders messages
- `npx playwright test --grep "cases conversation|cases page" --project=mobile`: same behavior on mobile viewport

## Review log

- `2026-05-26` `codex`: initial plan drafted for reload-safe case conversation loading.
- `2026-05-26T12:20:13Z` `codex`: Implemented the reload-safe route-backed conversation identity, restored slide-surface rendering through route hydration, passed typecheck plus focused desktop/mobile Playwright coverage, and archived the plan.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
