# PLAN_15_cases_conversation_shell_and_header_20260526

## Metadata

- Plan ID: `PLAN_15_cases_conversation_shell_and_header_20260526`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T07:49:37Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Replace the PLAN_14 stub conversation surface with the real slide shell, provider/controller, fixed custom header, and state transition button.
- Business/user intent: A case card tap must open a mobile-first conversation shell that already feels like the final experience even before the real message list and composer land.
- Non-goals: No real message virtualization yet, no task info sheet content yet, no composer yet.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-get-case.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/list-case-links.ts` if PLAN_13 did not already add it as a gap-fill
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-case-links.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-update-case-state.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/providers/CaseConversationProvider.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationHeader.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationSlidePage.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`
- Out of scope:
  - Real message rows
  - Info sheet content
  - Read/unread logic
  - Composer
- Assumptions:
  - PLAN_13 provides raw `get-case.ts`, `update-case-state.ts`, and extended `case-keys.ts`.
  - `GET /api/v1/cases/{case_client_id}` does not include linked task detail; task context must be resolved via case links plus `useGetTaskQuery`.

## Clarifications required

_(none)_

## Acceptance criteria

1. Opening a case card shows a slide page with the default slide header hidden.
2. The custom header shows back arrow, article number or SKU, subtitle, info button, and state button.
3. State button labels map exactly as:
   - `open` -> `Process` -> backend `new_state: resolving`
   - `resolving` -> `Resolve` -> backend `new_state: resolved`
4. After a successful state transition, the conversation slide closes.
5. The page background uses `bg-background` and leaves a stable placeholder slot for the upcoming message list.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-conversation.spec.ts`.
- Reuse the cases-page open flow from PLAN_14 rather than duplicating setup in a separate spec file when practical.
- Mock `GET /api/v1/cases/:id`, case links, and linked task detail.
- Mock `PATCH /api/v1/cases/:id/state` and assert request body contains both path/body IDs.

### Required test IDs

- `case-conversation-slide`
- `case-conversation-header`
- `case-conversation-back-button`
- `case-conversation-info-button`
- `case-conversation-state-button`
- `case-conversation-primary-label`
- `case-conversation-subtitle`

### Required scenarios

1. Opening a case card shows the custom conversation header and not the stock slide title.
2. Back button closes the slide.
3. Header primary label and subtitle render from task-linked context.
4. `open` case shows `Process`; `resolving` case shows `Resolve`.
5. Pressing the state button sends the correct backend `new_state` and closes the slide on success.

### Runtime assertions

- Assert network method/body for the state transition request.
- Assert no unexpected 4xx/5xx in the happy path.
- Run mobile first because the slide shell is mobile-primary.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: query hook shape and cache invalidation expectations
- `architecture/07_components.md`: feature component boundaries
- `architecture/08_hooks.md`: controller and action-hook responsibilities
- `architecture/23_providers.md`: detail provider pattern
- `architecture/28_surfaces.md`: surface opening and slide behavior
- `architecture/30_dynamic_loading.md`: surface lazy loading

### Local extensions loaded

- `architecture/28_surfaces_local.md`: app uses `slide` and `sheet`, not `drawer`
- `architecture/30_dynamic_loading_local.md`: surfaces must use `lazyWithPreload`
- `architecture/01_architecture_local.md`: route-entry constraints remain unchanged

### File read intent - pattern vs. relational

Permitted relational reads:
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx` - how slide pages hide the default header and handle missing IDs
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/use-get-task-query.ts` - exact task detail hook signature
- `apps/managers-app/ManagerBeyo-app-managers/src/store/auth.store.ts` and `src/features/auth/components/AuthProvider.tsx` - where current user identity actually lives
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md` - exact detail and state-transition shapes

Do not read other controllers/providers to learn structure; the contracts above already define that.

## Implementation plan

1. Add detail-level query hooks and the missing case-links gap-fill needed to resolve task context.
2. Build a conversation controller that composes case detail, case links, linked task detail, and surface actions.
3. Replace the stub page with a real slide view that hides the stock slide header and renders a fixed custom header.
4. Add the state-transition action hook and wire the success path to close the surface.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-get-case.ts`
   - Export `useGetCaseQuery(caseClientId, options?)`.
   - Use the detail key from `caseKeys.detail(caseClientId)`.
   - Accept optional `before_message_seq` and `messages_limit` passthrough so later plans can reuse the same hook shape.
   - Return the full TanStack Query result.

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/list-case-links.ts` and `use-case-links.ts`
   - Add these only if PLAN_13 did not already add them.
   - Parse the backend `participants`/`links` envelope exactly with Zod.
   - Expose `useCaseLinksQuery(caseClientId)` returning all links for the case.
   - The controller should treat the `task` link with role `subject` as the primary task context, then fall back to the first `task` link if no `subject` link exists.

3. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-update-case-state.ts`
   - Wrap the raw `updateCaseState` API function in an action hook.
   - Invalidate at minimum:
     - `caseKeys.detail(caseClientId)`
     - `caseKeys.lists()`
     - `caseKeys.unreadCounts()` if PLAN_13 added unread keys
   - Return the standard action API (`updateCaseState`, `updateCaseStateAsync`, `isPending`, `error`, `reset`).

4. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`
   - Input: `caseClientId`.
   - Queries:
     - `useGetCaseQuery(caseClientId, { messages_limit: 10 })`
     - `useCaseLinksQuery(caseClientId)`
     - `useGetTaskQuery(taskClientId)` after resolving the task link
   - Identity:
     - Use `useAuthStore(selectUser)` for the current user ID; do not invent a new current-user hook.
   - Derived header model:
     - `primaryLabel`: task item article number, else SKU, else case type label, else `Case`
     - `subtitle`: `task_type` and optional `return_source` joined with ` • `
     - `canOpenInfo`: `Boolean(taskClientId)`
     - `stateActionLabel`: `Process` or `Resolve`
     - `nextState`: `resolving` or `resolved`
   - Actions:
     - `closeConversation` -> `surface.close(CASE_CONVERSATION_SURFACE_ID)`
     - `openInfo` -> temporary controller method; wire to the future sheet surface in PLAN_16
     - `advanceState` -> call the action hook and close the slide on success
   - Expose separate `isPendingCase`, `isPendingTask`, `isError`, and `refetch`.

5. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/providers/CaseConversationProvider.tsx`
   - Follow the standard provider contract with `caseClientId` prop.
   - Export only the provider and `useCaseConversationContext`.

6. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationHeader.tsx`
   - Render a fixed header area with:
     - Back button on the left
     - Main label and subtitle in the center
     - Info button
     - State action button on the right
   - Disable the info button when no task link resolved.
   - The header itself should not know about queries; it reads from `useCaseConversationContext()`.
   - Use existing tokens only: `bg-background`, `text-foreground`, `border-border`, `bg-card`, `bg-primary`.

7. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`
   - Own the top-level slide content layout.
   - Call `useSurfaceHeader()` and hide the stock slide header via `setHeaderHidden(true)` in an effect.
   - Structure:
     - fixed custom header
     - body area with top padding equal to the fixed header height
     - temporary centered placeholder for the future message list
   - Error state:
     - full-height centered message
     - retry button calling `refetch`
   - Loading state:
     - lightweight shell reflection, not just plain text

8. `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationSlidePage.tsx`
   - Replace the PLAN_14 stub.
   - Read `caseClientId` from `useSurfaceProps<CaseConversationSurfaceProps>()`.
   - Render missing-ID fallback if absent.
   - Wrap content in `CaseConversationProvider`.

9. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts` and `index.ts`
   - Keep `CASE_CONVERSATION_SURFACE_ID` stable from PLAN_14.
   - Ensure the surface registration uses `lazyWithPreload`, not bare `lazy`.
   - Export the new provider/surface types needed by the page.
