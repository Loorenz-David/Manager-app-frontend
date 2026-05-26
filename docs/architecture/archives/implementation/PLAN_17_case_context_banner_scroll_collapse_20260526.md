# PLAN_17_case_context_banner_scroll_collapse_20260526

## Metadata

- Plan ID: `PLAN_17_case_context_banner_scroll_collapse_20260526`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T08:24:21Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Add the secondary context banner under the fixed conversation header and collapse it smoothly when the user scrolls upward.
- Business/user intent: The case type and creation time should be immediately visible when entering the conversation, but should get out of the way once the user starts reading messages.
- Non-goals: No virtualization-specific work yet beyond exposing the right scroll callbacks.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationContextBanner.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`
- Out of scope:
  - Message list virtualization
  - Scroll-to-bottom behavior
- Assumptions:
  - PLAN_15 already established a fixed custom header and a body scroll container under feature control.

## Clarifications required

_(none)_

## Acceptance criteria

1. The context banner appears directly below the main header when the page opens.
2. The banner shows case type in bold and case creation date/time.
3. Scrolling upward collapses the banner with slide/fade motion while the main header remains fixed.
4. Scrolling back downward restores the banner.
5. The collapse API is reusable by the future `react-virtuoso` message list.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-conversation.spec.ts`.
- Prefer real scroll interactions over artificial state injection.
- Keep this spec mobile-focused because banner/header density is a mobile concern first.

### Required test IDs

- `case-conversation-context-banner`
- `case-conversation-scroll-container`

### Required scenarios

1. Banner is visible on initial conversation open.
2. Scrolling upward collapses the banner.
3. Scrolling back downward restores the banner.

### Runtime assertions

- Assert visibility/state changes through DOM, not internal controller state.
- Assert the main header remains visible while the banner collapses.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: banner remains a pure feature component
- `architecture/08_hooks.md`: scroll state belongs in the controller
- `architecture/14_styling.md`: token-only styling
- `architecture/31_animations.md`: structural hide/show motion should use Framer Motion

### Local extensions loaded

- `architecture/28_surfaces_local.md`: the view lives inside a `slide` shell and must not rely on the stock slide header

### File read intent - pattern vs. relational

Permitted relational reads:

- `apps/managers-app/ManagerBeyo-app-managers/src/components/surfaces/SlidePageSurface.tsx` - confirms the stock surface scroll area, which the feature view is replacing with its own content rhythm
- `docs/architecture/under_construction/intention/intention_of_cases.md` - exact banner content and collapse behavior

## Implementation plan

1. Extend the conversation controller with scroll-derived banner visibility state.
2. Add a banner component using `bg-primary`.
3. Refactor the slide view body to route scroll events through the controller so PLAN_18 can swap in virtualization without rewriting the banner logic.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`
   - Add banner state fields:
     - `isContextBannerCollapsed`
     - `setBodyScrollTop(scrollTop: number)`
     - `resetScrollChrome()`
   - Collapse rule:
     - collapse only after a small threshold such as `scrollTop > 24`
     - use direction-aware logic so tiny bounce/noise does not flicker the banner
   - Keep the controller agnostic about whether the scroll source is a plain container or Virtuoso callback.

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationContextBanner.tsx`
   - Read from context, not props.
   - Render:
     - bold case type label
     - formatted case creation date/time on a second line or lighter inline text
   - Styling:
     - `bg-primary`
     - text on dark background must remain legible; use card/background token for contrast
   - Motion:
     - animate height/opacity/y together so the banner feels attached to the header instead of disappearing abruptly

3. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`
   - Split the fixed top area into:
     - main header
     - collapsible banner
   - Ensure the body content starts below the combined visible header height.
   - For the temporary non-virtualized body placeholder, attach `onScroll` to the feature-owned scroll container and forward `currentTarget.scrollTop` into the controller.

4. Date formatting
   - Use built-in `Intl.DateTimeFormat` or small local helpers.
   - Do not assume `date-fns` exists; it is not present in the current package manifest.
