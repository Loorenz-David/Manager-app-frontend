# SUMMARY_PLAN_cases_refactor_pills_20260622

## Metadata

- Summary ID: `SUMMARY_PLAN_cases_refactor_pills_20260622`
- Source plan: `docs/architecture/archives/implementation/PLAN_cases_refactor_pills_20260622.md`
- Implemented at (UTC): `2026-06-22T12:02:34Z`

## Implementation summary

- Refactored the cases view controller from section groups to a single pill-driven list API with `unread`, `active`, and `in-progress` filters plus direction state for slide transitions.
- Added concurrent open and resolving case queries, with unread cases derived from unread message counts across both active and in-progress lists.
- Added `CasesHeader` with a collapsible date label, search bar, and horizontal pill row following the TasksView scroll visibility pattern.
- Reworked `CasesView` to use an absolute header, local scroll visibility, pull-to-refresh offset, direct `CaseCard` rendering, and direction-aware Framer Motion list transitions.
- Simplified the case filter sheet to expose only `Resolved` and `Only for me`; enabling resolved hides the pill row and shows resolved cases only.
- Updated case state presentation so `resolving` displays as `In-Progress`, including the case conversation state action button.
- Removed the obsolete grouped `CasesSectionGroup` component.

## Verification

- `npm run typecheck`: passed.

## Notes

- The implementation keeps backend case state enum values unchanged: `open`, `resolving`, and `resolved`.
- The resolved query is also prepared through TanStack Query so the resolved filter can switch without reusing the open/resolving list state.
