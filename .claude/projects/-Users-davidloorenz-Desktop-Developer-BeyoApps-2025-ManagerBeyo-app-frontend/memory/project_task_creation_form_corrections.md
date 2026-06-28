---
name: project-task-creation-form-corrections
description: PLAN_task_creation_form_corrections_20260627; 12 files; 6 corrections to Internal/PreOrder/Return task creation forms; under_construction, awaiting approval before Codex
metadata:
  type: project
---

PLAN_task_creation_form_corrections_20260627 — 12 files (1 new, 11 modified); under_construction, awaiting approval before Codex.

**Why:** Six targeted corrections surfaced from QA: missing seat-position mandatory validation, numeric keyboard UX on iOS, redundant slide header, missing top padding, missing customer email/phone warnings, broken item-lookup selector in ReturnFormContent.

**How to apply:** When user references task-creation form corrections, slide header hiding, NumericKeyboardBar, or the return-form lookup bug, check this plan first.

## Files

| # | File | Change |
|---|------|--------|
| 1 | `packages/ui/src/components/primitives/floating-keyboard-bar/NumericKeyboardBar.tsx` | NEW — digit 0–9 + backspace bar above keyboard; props: `value`, `onChange`, `hasFocus` |
| 2 | `packages/ui/src/components/primitives/floating-keyboard-bar/index.ts` | add export |
| 3 | `packages/items/src/types.ts` | `item_position` preprocess: coerce `string → Number(value)` before `z.number()` |
| 4 | `packages/items/src/components/ItemPositionField.tsx` | `useController` + `type="text"` (no inputMode numeric) + `NumericKeyboardBar` with `hasFocus` |
| 5 | `packages/task-creation/src/types.ts` | `InternalFormSchema` superRefine: seat position required; `ReturnFormSchema`: `customer: CustomerFieldsSchema.partial()` + superRefine (position + conditional customer fields); new separate `PreOrderFormSchema` with full CustomerFieldsSchema + superRefine (position + always-required email/phone) |
| 6 | `packages/task-creation/src/lib/normalize-task-form-payload.ts` | `buildCustomerFields` handles partial customer; `normalizeReturnFormPayload` skips customer spread for `store_return` |
| 7 | `packages/task-creation/src/pages/InternalTaskSlidePage.tsx` | `setHeaderHidden(true)` instead of `setTitle` |
| 8 | `packages/task-creation/src/pages/ReturnTaskSlidePage.tsx` | `setHeaderHidden(true)` instead of `setTitle` |
| 9 | `packages/task-creation/src/pages/PreOrderTaskSlidePage.tsx` | `setHeaderHidden(true)` instead of `setTitle` |
| 10 | `packages/task-creation/src/components/InternalFormContent.tsx` | `pt-4` on form element |
| 11 | `packages/task-creation/src/components/PreOrderFormContent.tsx` | `pt-4` on form element |
| 12 | `packages/task-creation/src/components/ReturnFormContent.tsx` | `pt-4`; fix lookup selector (`selectPurchaseApiLookupResult`); add image creation on lookup; `isCustomerStepVisible = returnSource !== "store_return"` guards step, conditional render, and error detection |
