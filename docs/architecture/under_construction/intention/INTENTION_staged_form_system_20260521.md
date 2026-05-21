# INTENTION_staged_form_system_20260521

## Metadata

- Intention ID: `INTENTION_staged_form_system_20260521`
- Status: `active`
- Owner: `David`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T00:00:00Z`

## Goal

Build a reusable, domain-agnostic staged-form primitive system that supports multi-step operational flows — allowing the app to compose complex forms (item + customer + task info, onboarding, review flows) with a consistent, mobile-first UX without coupling the primitive to any feature, RHF schema, or business logic.

## Why this matters

The app's primary operational flow — creating a work task — requires collecting item details, customer information, and task configuration across a single data entry session. Presenting all fields on one page creates a cognitive and layout burden on a small mobile screen. A staged-form system solves this by chunking the flow into clearly scoped, navigable steps with visual progress feedback.

Beyond task creation, the same system will serve onboarding flows, setup wizards, inspection checklists, and any future multi-step operational feature. A shared primitive prevents each feature from implementing its own ad-hoc stepper with different animations, indicator styles, and keyboard handling.

## Success criteria

1. A `StagedForm` primitive exists in `src/components/primitives/staged-form/` with zero imports from `features/`, `store/`, or RHF — verified by `rg` check.
2. A `useStagedForm()` orchestrator hook exists in `src/hooks/use-staged-form.ts` that manages navigation state and accepts external validation/guard/submit callbacks.
3. `TestingFormsContent` is refactored to use the primitive with three steps (Item, Customer, Task) and `mode="free"` for exploratory testing.
4. Step indicator visual supports all six states: `active`, `completed`, `pending`, `warning`, `error`, `locked`.
5. Directional horizontal slide animation (forward = slide left, backward = slide right) uses the existing `transitions.slide` token from `lib/animation.ts`.
6. Timeline scrolls the active step into view on mobile via `scrollIntoView`.
7. `npm run typecheck` and `npm run build` pass with zero errors after implementation.
8. Playwright specs cover the three-step flow: advance through steps, back navigation, timeline click (free mode), and submit.

## Scope boundary

- In scope:
  - `staged-form` primitive folder (types, variants, context, timeline, step, navigation, root component, barrel)
  - `use-staged-form.ts` orchestrator hook
  - `src/types/staged-form.ts` shared types
  - `TestingFormsContent.tsx` integration (3-step testing form)
  - Primitives barrel update (`components/primitives/index.ts`)
  - Playwright spec for the staged-form flow in `TestingFormsContent`

- Out of scope:
  - Real task creation API integration (no backend calls in this plan)
  - Draft persistence or autosave (future intent)
  - Per-step RHF `FormProvider` split (testing form uses a single shared form)
  - Realtime synchronization of form state
  - PWA offline capability
  - Route-based step persistence (URL reflects active step)
  - Deep-link support per step

- Non-goals:
  - The primitive decides what is required for completion — validation is always external
  - The primitive submits data — submission is always an external callback

## Linked implementation plans

| Plan ID | Path | Status | Covers |
|---------|------|--------|--------|
| `PLAN_staged_form_primitive_20260521` | `docs/architecture/under_construction/implementation/PLAN_staged_form_primitive_20260521.md` | `under_construction` | Primitive system + useStagedForm hook + TestingFormsContent integration |

## Progress notes

- `2026-05-21`: Intention plan created. Implementation plan authored in same session after architectural alignment (orchestrator hook model, numbered dots + line timeline, primitive-provided navigation bar, directional horizontal slide animation).

## Open questions

- Route-based step persistence (URL reflects active step) — impact if unresolved: URL does not deep-link to a specific step; acceptable for the current testing phase, but needed before production flows go live.
- Per-step RHF split vs shared form — impact if unresolved: unclear until a production flow with independent step submission is required. Testing form uses a shared form; production form ownership is deferred.

## Lifecycle transition

- Current status: `active`
- Next status: `achieved`
- Transition trigger: all 8 success criteria met and verified
