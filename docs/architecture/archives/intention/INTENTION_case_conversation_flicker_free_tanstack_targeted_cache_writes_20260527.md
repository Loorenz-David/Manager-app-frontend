# INTENTION_case_conversation_flicker_free_tanstack_targeted_cache_writes_20260527

## Metadata

- Intention ID: `INTENTION_case_conversation_flicker_free_tanstack_targeted_cache_writes_20260527`
- Status: `active`
- Owner: `GitHub Copilot`
- Created at (UTC): `2026-05-27T00:00:00Z`
- Last updated at (UTC): `2026-05-27T00:00:00Z`

## Goal

Eliminate visible flicker in case conversation message rendering during send and realtime receive by keeping a TanStack-only architecture and replacing broad invalidation with targeted cache writes and controlled reconciliation.

## Why this matters

Case conversation is a high-frequency interaction surface and visual instability during send/receive reduces trust, perceived performance, and typing flow continuity. The current implementation has already invested in virtualization stability, but broad query invalidations still trigger data churn that can produce visible flashes.

Maintaining a TanStack-only server-state strategy also preserves current architecture consistency and avoids introducing a second source of truth through a parallel global message store.

## Success criteria

1. Sending a message does not produce visible list flash, remount flicker, or jump in the conversation UI under normal network conditions.
2. Receiving messages through realtime signaling inserts content without visible flicker and without resetting scroll position when the user is not at bottom.
3. Message lifecycle updates (send ack, edit, delete, mark read) are handled with targeted `setQueryData` or equivalent fine-grained cache updates for active conversation queries.
4. Broad invalidations of case list and conversation detail query trees are removed from immediate post-send/edit/delete paths unless strictly required.
5. A background reconciliation strategy exists (timed or scoped refetch) to guarantee eventual server truth without affecting interactive rendering.
6. Existing Virtuoso anti-flicker behavior remains effective and is not defeated by cache-shape resets.
7. Focused tests and manual verification scenarios demonstrate no flicker on send and on realtime receive bursts.

## Scope boundary

- In scope:
  - Case conversation send flow cache update strategy.
  - Realtime message upsert strategy into TanStack cache.
  - Edit/delete/read mutation cache handling for conversation-related queries.
  - Query invalidation scope reduction for cases feature where it affects conversation rendering.
  - Conversation list stability guardrails for optimistic, acknowledged, and incoming messages.

- Out of scope:
  - Introducing a new global Zustand/Redux message store as primary server-state source.
  - Full realtime transport redesign.
  - Composer visual redesign or non-flicker unrelated UI changes.
  - Backend contract changes.

- Non-goals:
  - Zero refetch everywhere.
  - Replacing TanStack Query with another server-state library.
  - Re-architecting all case feature screens beyond conversation flicker scope.

## Linked implementation plans

| Plan ID                                                                       | Path                                                                                                                                 | Status               | Covers                                                                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `PLAN_case_conversation_flicker_free_tanstack_targeted_cache_writes_20260527` | `docs/architecture/under_construction/implementation/PLAN_case_conversation_flicker_free_tanstack_targeted_cache_writes_20260527.md` | `under_construction` | Message send/receive cache pipeline, mutation invalidation narrowing, reconciliation strategy, and verification matrix |

## Progress notes

- `2026-05-27`: Root-cause exploration completed. Current send mutation invalidates case detail, conversation detail pages, and case lists immediately after success, creating high churn risk for active conversation rendering.
- `2026-05-27`: Edit and delete message mutations follow similar broad invalidation patterns, reinforcing churn in active conversation queries.
- `2026-05-27`: Mark-read mutation also invalidates participants and unread-count query roots; this is valid behavior but can amplify activity near send/receive moments.
- `2026-05-27`: Conversation UI uses Virtuoso with explicit anti-remount safeguards and stable component references, indicating remaining flicker is likely data invalidation and cache-shape churn rather than basic list-key instability.

## Open questions

- Should send success update only the active conversation cache immediately and defer case-list preview updates to a lower-priority reconciliation pass? — impact if unresolved: either persistent flicker risk or stale case list previews.
- What should be the canonical dedupe key for optimistic and realtime merge (`client_id`, `message_seq`, or composite fallback)? — impact if unresolved: duplicate rows or accidental replacement of distinct messages.
- What reconciliation trigger gives best tradeoff after targeted writes (timer, focus regain, thread reopen, or explicit low-priority invalidation)? — impact if unresolved: eventual consistency gaps or unnecessary refetch churn.
- For realtime bursts while user is away from bottom, should unread counters and in-thread new markers be updated immediately or batched? — impact if unresolved: either noisy re-renders or delayed feedback.

## Lifecycle transition

- Current status: `active`
- Next status: `<achieved | paused | abandoned | superseded>`
- Transition trigger: `all success criteria met and linked implementation plan completed`

## Current architecture context and issue map

Relevant hotspots in current cases frontend architecture:

- `use-send-case-message` currently invalidates:
  - `caseKeys.detail(caseClientId)`
  - `caseKeys.conversationDetailPagesForCase(caseClientId)`
  - `caseKeys.lists()`

- `use-edit-case-message` and `use-delete-case-message` currently invalidate:
  - case detail
  - conversation detail pages
  - conversation messages (when conversation id exists)
  - case lists

- `use-mark-case-read` currently invalidates:
  - participants list for case
  - unread counts root

- `CaseMessageList` already includes virtualization-level anti-flicker handling:
  - stable externalized footer component
  - memoized Virtuoso components to avoid remount
  - prepend index stabilization
  - controlled scroll compensation for top inset changes

Issue framing:

- The rendering layer already mitigates remount flicker.
- Remaining flicker risk is primarily state-churn induced by broad invalidation and immediate refetch of visible active conversation data after send/receive operations.

Target architecture direction for implementation planning:

1. Keep TanStack Query as sole server-state source of truth.
2. Add targeted cache writes (`setQueryData`) for send ack, realtime upsert, edit, delete.
3. Reserve invalidation for scoped, deferred, or low-priority reconciliation.
4. Maintain deterministic merge/dedupe and stable item identity for virtualization.
5. Ensure case list and unread surfaces are updated with minimal redraw pressure.
